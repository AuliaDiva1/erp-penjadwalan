import logging
import threading
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import os

from fuzzy import (
    FuzzyInputError,
    hitung_prioritas_batch,
    invalidate_config_cache,
)
from ccea import CCEAInputError, CCEAConfigError, run_ccea

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

DB_API          = os.getenv("DB_API", "")
FLASK_PORT      = int(os.getenv("FLASK_PORT", 5000))
DB_TIMEOUT      = 5
HOLIDAY_API     = os.getenv("HOLIDAY_API", "https://api-hari-libur.vercel.app/api")
HOLIDAY_TIMEOUT = 5


class PipelineInputError(ValueError):
    pass


def _parse_local_datetime(s: str) -> datetime:
    s = s.strip().replace("Z", "")
    normalized = s.replace("T", " ")[:19]
    return datetime.strptime(normalized, "%Y-%m-%d %H:%M:%S")


def _fmt_local(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def hitung_deadline(job: dict, scheduled_start_dt: datetime) -> dict:
    pt = job.get("processing_time")
    if pt is None or not isinstance(pt, (int, float)) or pt <= 0:
        raise PipelineInputError(
            f"Job '{job.get('job_id', '?')}' processing_time tidak valid: {pt!r}"
        )
    predicted_end = scheduled_start_dt + timedelta(minutes=float(pt))
    return {
        "predicted_duration": round(float(pt), 2),
        "predicted_start":    _fmt_local(scheduled_start_dt),
        "predicted_end":      _fmt_local(predicted_end),
        "deadline_predicted": _fmt_local(predicted_end),
    }


app = Flask(__name__)
CORS(app)


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"success": False, "message": str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint tidak ditemukan"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "message": "Internal server error"}), 500


_ccea_config_cache: dict | None = None
_ccea_config_lock  = threading.Lock()

_holiday_cache: dict[str, list[str]] = {}
_holiday_cache_lock = threading.Lock()


def load_ccea_config(token: str | None = None, force_reload: bool = False) -> dict | None:
    global _ccea_config_cache

    with _ccea_config_lock:
        if _ccea_config_cache is not None and not force_reload:
            return _ccea_config_cache

    if not DB_API:
        logger.warning("[CCEA] DB_API tidak di-set, pakai config default.")
        return None

    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        res = requests.get(
            f"{DB_API}/konfigurasi/ccea",
            headers=headers,
            timeout=DB_TIMEOUT,
        )
        res.raise_for_status()
        data = res.json().get("data")
        if not isinstance(data, dict):
            logger.warning("[CCEA] Response DB tidak valid, pakai config default.")
            return None
        with _ccea_config_lock:
            _ccea_config_cache = data
        return data
    except requests.RequestException as exc:
        logger.warning("[CCEA] Gagal load config dari DB (%s), pakai default.", exc)
        return None


def fetch_holidays(year: int, month: int) -> list[str]:
    """
    Ambil daftar tanggal libur nasional untuk bulan/tahun tertentu
    dari API api-hari-libur. Hasil di-cache per bulan-tahun.
    Return list tanggal format 'YYYY-MM-DD'.
    """
    cache_key = f"{year}-{month:02d}"

    with _holiday_cache_lock:
        if cache_key in _holiday_cache:
            return _holiday_cache[cache_key]

    try:
        res = requests.get(
            HOLIDAY_API,
            params={"year": year, "month": month},
            timeout=HOLIDAY_TIMEOUT,
        )
        res.raise_for_status()
        body = res.json()

        items = body.get("data") if isinstance(body, dict) else None
        if not isinstance(items, list):
            logger.warning("[HOLIDAY] Response API tidak valid untuk %s, anggap tidak ada libur.", cache_key)
            holidays = []
        else:
            holidays = [item["date"] for item in items if isinstance(item, dict) and item.get("date")]

        with _holiday_cache_lock:
            _holiday_cache[cache_key] = holidays

        logger.info("[HOLIDAY] %s → %d hari libur ditemukan", cache_key, len(holidays))
        return holidays

    except requests.RequestException as exc:
        logger.warning("[HOLIDAY] Gagal hit API hari libur untuk %s (%s), anggap tidak ada libur.", cache_key, exc)
        with _holiday_cache_lock:
            _holiday_cache[cache_key] = []
        return []


def get_holidays_in_range(start_dt: datetime, months_ahead: int = 3) -> list[str]:
    """
    Ambil hari libur dari bulan start_dt sampai `months_ahead` bulan ke depan.
    """
    all_holidays = []
    year, month = start_dt.year, start_dt.month

    for _ in range(months_ahead + 1):
        all_holidays.extend(fetch_holidays(year, month))
        month += 1
        if month > 12:
            month = 1
            year += 1

    return sorted(set(all_holidays))


def load_work_calendar(token: str | None = None) -> dict | None:
    if not DB_API:
        logger.warning("[CALENDAR] DB_API tidak di-set, kalender tidak dipakai.")
        return None

    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        # Hit dua endpoint sekaligus
        res_cal = requests.get(f"{DB_API}/work-calendar",        headers=headers, timeout=DB_TIMEOUT)
        res_ot  = requests.get(f"{DB_API}/work-day-overtime",    headers=headers, timeout=DB_TIMEOUT)
        res_cal.raise_for_status()

        payload        = res_cal.json().get("data")
        if not isinstance(payload, dict):
            logger.warning("[CALENDAR] Response work-calendar tidak valid.")
            return None

        calendar_row   = payload.get("calendar") or {}
        work_days_rows = payload.get("work_days") or []

        active_days = [d["day_name"] for d in work_days_rows if d.get("is_workday")]
        work_start  = str(calendar_row.get("work_start", "08:00:00"))[:5]
        work_end    = str(calendar_row.get("work_end",   "17:00:00"))[:5]

        # Bangun overtime_per_day dari endpoint work-day-overtime
        overtime_per_day = {}
        if res_ot.ok:
            ot_list = res_ot.json().get("data") or []
            for ot in ot_list:
                day_name = ot.get("day_name")
                if not day_name:
                    continue
                ot_end_raw = ot.get("overtime_end")
                overtime_per_day[day_name] = {
                    "enabled":      bool(ot.get("overtime_enabled", False)),
                    "overtime_end": str(ot_end_raw)[:5] if ot_end_raw else None,
                }
        else:
            logger.warning("[CALENDAR] Gagal load work-day-overtime, overtime per hari tidak dipakai.")

        kalender = {
            "work_start":        work_start,
            "work_end":          work_end,
            "work_days":         active_days,
            "overtime_per_day":  overtime_per_day,
        }
        logger.info("[CALENDAR] Konfigurasi diterima: %s", kalender)
        return kalender

    except requests.RequestException as exc:
        logger.warning("[CALENDAR] Gagal load work-calendar dari BE (%s), kalender tidak dipakai.", exc)
        return None


def _parse_body_jobs_machines(body: dict) -> tuple[list, list]:
    jobs     = body.get("jobs", [])
    machines = body.get("machines", [])

    if not isinstance(jobs, list) or len(jobs) == 0:
        raise PipelineInputError("Field 'jobs' harus list non-kosong.")
    if not isinstance(machines, list) or len(machines) == 0:
        raise PipelineInputError("Field 'machines' harus list non-kosong.")

    machine_ids = [
        m.get("machine_id", m) if isinstance(m, dict) else m
        for m in machines
    ]
    if any(not isinstance(m, str) or not m.strip() for m in machine_ids):
        raise PipelineInputError("Setiap machine harus berupa string non-kosong.")

    return jobs, machine_ids


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":  "ok",
        "service": "Fuzzy Mamdani + CCEA Scheduling Pipeline",
    })


@app.route("/predict/deadline", methods=["POST"])
def predict_deadline():
    body = request.get_json(silent=True) or {}
    jobs = body.get("jobs", [])

    if not isinstance(jobs, list) or len(jobs) == 0:
        return jsonify({"success": False, "message": "Field 'jobs' harus list non-kosong."}), 400

    base_time = datetime.now()
    results, errors = [], []

    for job in jobs:
        job_id = job.get("job_id", "?")
        try:
            scheduled_start = (
                _parse_local_datetime(job["scheduled_start"])
                if job.get("scheduled_start")
                else base_time
            )
            pred = hitung_deadline(job, scheduled_start)
            results.append({"job_id": job_id, **pred})
        except (PipelineInputError, ValueError) as exc:
            logger.warning("[predict_deadline] Job '%s' dilewati: %s", job_id, exc)
            errors.append({"job_id": job_id, "error": str(exc)})

    return jsonify({"success": True, "data": results, "errors": errors})


@app.route("/fuzzy/prioritas", methods=["POST"])
def fuzzy_prioritas():
    body  = request.get_json(silent=True) or {}
    jobs  = body.get("jobs", [])
    token = body.get("token")

    if not isinstance(jobs, list) or len(jobs) == 0:
        return jsonify({"success": False, "message": "Field 'jobs' harus list non-kosong."}), 400

    try:
        batch = hitung_prioritas_batch(jobs, token)
        return jsonify({
            "success": True,
            "data":    batch.get("results", []),
            "errors":  batch.get("errors",  []),
        })
    except FuzzyInputError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400


@app.route("/pipeline/run", methods=["POST"])
def pipeline_run():
    body  = request.get_json(silent=True) or {}
    token = body.get("token")

    try:
        jobs, machine_ids = _parse_body_jobs_machines(body)
    except PipelineInputError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

    machine_busy_until_raw = body.get("machine_busy_until", {})

    logger.info("[PIPELINE] Mulai | %d jobs | %d machines", len(jobs), len(machine_ids))
    logger.info("[PIPELINE] machine_busy_until diterima: %s", machine_busy_until_raw)

    parsed_busy: dict[str, datetime] = {}
    for machine_id in machine_ids:
        busy_str = machine_busy_until_raw.get(machine_id)
        if busy_str:
            try:
                parsed_busy[machine_id] = _parse_local_datetime(busy_str)
            except ValueError:
                logger.warning("[PIPELINE] Gagal parse busy_until '%s' mesin %s", busy_str, machine_id)

    if parsed_busy:
        base_time = max(parsed_busy.values())
        logger.info("[PIPELINE] base_time (anchor) = %s", _fmt_local(base_time))
    else:
        base_time = datetime.now()
        logger.info("[PIPELINE] base_time = now (%s), tidak ada mesin busy", _fmt_local(base_time))

    kalender = load_work_calendar(token)

    if kalender:
        holidays = get_holidays_in_range(base_time, months_ahead=3)
        kalender["holidays"] = holidays
        logger.info("[PIPELINE] Kalender aktif: %s | %d hari libur dimuat", kalender, len(holidays))
    else:
        logger.warning("[PIPELINE] Kalender tidak tersedia, CCEA jalan TANPA skip hari libur/jam kerja.")

    machine_ready_offset: dict[str, str] = {}
    for machine_id in machine_ids:
        if machine_id in parsed_busy:
            machine_ready_offset[machine_id] = _fmt_local(parsed_busy[machine_id])
        else:
            machine_ready_offset[machine_id] = _fmt_local(base_time)
        logger.info(
            "[PIPELINE] Mesin %s → ready at: %s",
            machine_id, machine_ready_offset[machine_id],
        )

    logger.info("[STEP 1] Rule-Based — Hitung Deadline")
    deadline_results: dict[str, dict] = {}
    for job in jobs:
        job_id = job.get("job_id", "?")
        try:
            deadline_results[job_id] = hitung_deadline(job, base_time)
        except PipelineInputError as exc:
            logger.warning("[STEP 1] Job '%s' dilewati: %s", job_id, exc)
            deadline_results[job_id] = {}

    logger.info("[STEP 2] Fuzzy Mamdani — Hitung Prioritas")
    fuzzy_input = [
        {
            "job_id":               job.get("job_id"),
            "processing_time":      job.get("processing_time",      70),
            "energy_consumption":   job.get("energy_consumption",   8),
            "machine_availability": job.get("machine_availability", 90),
            "operation_type":       job.get("operation_type",       "Lathe"),
        }
        for job in jobs
    ]

    try:
        batch_fuzzy = hitung_prioritas_batch(fuzzy_input, token)
    except FuzzyInputError as exc:
        return jsonify({"success": False, "message": f"Fuzzy error: {exc}"}), 400

    fuzzy_list   = batch_fuzzy.get("results", [])
    fuzzy_errors = batch_fuzzy.get("errors",  [])

    if fuzzy_errors:
        logger.warning("[STEP 2] %d job fuzzy gagal: %s", len(fuzzy_errors), fuzzy_errors)

    fuzzy_map = {r["job_id"]: r for r in fuzzy_list}

    logger.info("[STEP 3] CCEA — Optimasi Penjadwalan")
    ccea_config = load_ccea_config(token)

    ccea_jobs = sorted(
        [
            {
                "job_id":          job.get("job_id"),
                "processing_time": job.get("processing_time", 60),
                "priority_score":  fuzzy_map.get(job.get("job_id"), {}).get("skor_final", 50.0),
            }
            for job in jobs
        ],
        key=lambda x: x["priority_score"],
        reverse=True,
    )

    try:
        ccea_result = run_ccea(
            ccea_jobs,
            machine_ids,
            ccea_config,
            machine_ready_offset=machine_ready_offset,
            kalender=kalender,
            pipeline_start=_fmt_local(base_time),
        )
    except (CCEAInputError, CCEAConfigError) as exc:
        return jsonify({"success": False, "message": f"CCEA error: {exc}"}), 400

    logger.info("[STEP 4] Menggabungkan hasil...")

    final_schedule = []
    for item in ccea_result["schedule"]:
        job_id              = item["job_id"]
        scheduled_start_str = item["scheduled_start"]
        scheduled_end_str   = item["scheduled_end"]
        duration            = item.get("duration_menit", item.get("duration"))

        final_schedule.append({
            "job_id":              job_id,
            "assigned_machine_id": item["assigned_machine_id"],
            "scheduled_start":     scheduled_start_str,
            "scheduled_end":       scheduled_end_str,
            "duration":            duration,
            "deadline_predicted":  scheduled_end_str,
            "predicted_duration":  duration,
            "skor_prioritas":      fuzzy_map.get(job_id, {}).get("skor_final", 0),
            "skor_crisp":          fuzzy_map.get(job_id, {}).get("skor_crisp", 0),
            "bobot_operation":     fuzzy_map.get(job_id, {}).get("bobot", 1.0),
        })

    logger.info(
        "[PIPELINE] SELESAI | Makespan: %s menit | Jobs: %d | Mesin: %d | base_time: %s",
        ccea_result["makespan"], len(jobs), len(machine_ids), _fmt_local(base_time),
    )

    return jsonify({
        "success":        True,
        "makespan":       ccea_result["makespan"],
        "total_jobs":     len(jobs),
        "total_machines": len(machine_ids),
        "schedule":       final_schedule,
        "summary": {
            "fuzzy_rules":    27,
            "ccea_generasi":  ccea_result.get("generasi"),
            "ccea_cache":     ccea_result.get("cache_stats"),
            "ccea_config":    ccea_config,
            "kalender_aktif": kalender is not None,
            "kalender":       kalender,
            "base_time":      _fmt_local(base_time),
            "generated_at":   _fmt_local(datetime.now()),
        },
    })


@app.route("/model/info", methods=["GET"])
def model_info():
    return jsonify({
        "success": True,
        "data": {
            "fuzzy_rules": 27,
            "ccea_config": _ccea_config_cache,
            "status":      "active",
        },
    })


@app.route("/model/reset", methods=["POST"])
def model_reset():
    global _ccea_config_cache
    with _ccea_config_lock:
        _ccea_config_cache = None
    invalidate_config_cache()
    logger.info("[MODEL] Cache direset.")
    return jsonify({
        "success":  True,
        "message":  "Model cache berhasil direset",
        "metadata": {"reset_at": _fmt_local(datetime.now())},
    })


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("FLASK SERVICE RUNNING")
    logger.info("Port  : %d", FLASK_PORT)
    logger.info("DB API: %s", DB_API or "(tidak di-set)")
    logger.info("Holiday API: %s", HOLIDAY_API)
    logger.info("Pipeline: Fuzzy Mamdani + CCEA")
    logger.info("=" * 50)
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)