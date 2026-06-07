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

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DB_API     = os.getenv("DB_API", "")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
DB_TIMEOUT = 5

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class PipelineInputError(ValueError):
    """Input pipeline tidak valid."""

# ---------------------------------------------------------------------------
# Helper: hitung deadline (rule-based)
# Deadline = Scheduled_Start + Processing_Time
# ---------------------------------------------------------------------------

def hitung_deadline(job: dict, scheduled_start_dt: datetime) -> dict:
    pt = job.get("processing_time")
    if pt is None or not isinstance(pt, (int, float)) or pt <= 0:
        raise PipelineInputError(
            f"Job '{job.get('job_id', '?')}' processing_time tidak valid: {pt!r}"
        )

    predicted_end = scheduled_start_dt + timedelta(minutes=float(pt))
    deadline      = predicted_end  # Deadline = Scheduled_Start + Processing_Time

    return {
        "predicted_duration": round(float(pt), 2),
        "predicted_start":    scheduled_start_dt.isoformat(),
        "predicted_end":      predicted_end.isoformat(),
        "deadline_predicted": deadline.isoformat(),
    }

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Error handlers terpusat
# ---------------------------------------------------------------------------

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"success": False, "message": str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint tidak ditemukan"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "message": "Internal server error"}), 500

# ---------------------------------------------------------------------------
# Helper: load CCEA config dari DB
# ---------------------------------------------------------------------------

_ccea_config_cache: dict | None = None
_ccea_config_lock  = threading.Lock()


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

# ---------------------------------------------------------------------------
# Helper: validasi jobs & machines dari request body
# ---------------------------------------------------------------------------

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

# ============================================================
# ENDPOINT 1: Health Check
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":  "ok",
        "service": "Fuzzy Mamdani + CCEA Scheduling Pipeline",
    })

# ============================================================
# ENDPOINT 2: Hitung Deadline (rule-based)
# ============================================================

@app.route("/predict/deadline", methods=["POST"])
def predict_deadline():
    body = request.get_json(silent=True) or {}
    jobs = body.get("jobs", [])

    if not isinstance(jobs, list) or len(jobs) == 0:
        return jsonify({"success": False, "message": "Field 'jobs' harus list non-kosong."}), 400

    base_time = datetime.now()
    results   = []
    errors    = []

    for job in jobs:
        job_id = job.get("job_id", "?")
        try:
            scheduled_start = (
                datetime.fromisoformat(job["scheduled_start"])
                if job.get("scheduled_start")
                else base_time
            )
            pred = hitung_deadline(job, scheduled_start)
            results.append({"job_id": job_id, **pred})
        except (PipelineInputError, ValueError) as exc:
            logger.warning("[predict_deadline] Job '%s' dilewati: %s", job_id, exc)
            errors.append({"job_id": job_id, "error": str(exc)})

    return jsonify({"success": True, "data": results, "errors": errors})

# ============================================================
# ENDPOINT 3: Hitung Prioritas Fuzzy
# ============================================================

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

# ============================================================
# ENDPOINT 4: Pipeline Lengkap (Fuzzy + CCEA)
# ============================================================

@app.route("/pipeline/run", methods=["POST"])
def pipeline_run():
    body  = request.get_json(silent=True) or {}
    token = body.get("token")

    try:
        jobs, machine_ids = _parse_body_jobs_machines(body)
    except PipelineInputError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

    logger.info("[PIPELINE] Mulai | %d jobs | %d machines", len(jobs), len(machine_ids))

    base_time = datetime.now()

    # ── STEP 1: Hitung Deadline (rule-based) ────────
    logger.info("[STEP 1] Rule-Based — Hitung Deadline")
    deadline_results: dict[str, dict] = {}
    for job in jobs:
        job_id = job.get("job_id", "?")
        try:
            scheduled_start = (
                datetime.fromisoformat(job["scheduled_start"])
                if job.get("scheduled_start")
                else base_time
            )
            deadline_results[job_id] = hitung_deadline(job, scheduled_start)
            logger.debug(
                "  %s → deadline: %s",
                job_id,
                deadline_results[job_id]["deadline_predicted"][:19],
            )
        except PipelineInputError as exc:
            logger.warning("[STEP 1] Job '%s' dilewati: %s", job_id, exc)
            deadline_results[job_id] = {}

    # ── STEP 2: Fuzzy Mamdani — Hitung Prioritas ────
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
        batch_fuzzy  = hitung_prioritas_batch(fuzzy_input, token)
    except FuzzyInputError as exc:
        return jsonify({"success": False, "message": f"Fuzzy error: {exc}"}), 400

    fuzzy_list   = batch_fuzzy.get("results", [])
    fuzzy_errors = batch_fuzzy.get("errors",  [])

    if fuzzy_errors:
        logger.warning("[STEP 2] %d job fuzzy gagal: %s", len(fuzzy_errors), fuzzy_errors)

    fuzzy_map = {r["job_id"]: r for r in fuzzy_list}

    for r in fuzzy_list:
        logger.debug(
            "  %s → skor: %s (crisp: %s, bobot: %s)",
            r["job_id"], r["skor_final"], r["skor_crisp"], r["bobot"],
        )

    # ── STEP 3: CCEA — Optimasi Penjadwalan ─────────
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
        ccea_result = run_ccea(ccea_jobs, machine_ids, ccea_config)
    except (CCEAInputError, CCEAConfigError) as exc:
        return jsonify({"success": False, "message": f"CCEA error: {exc}"}), 400

    # ── STEP 4: Gabungkan Hasil ──────────────────────
    logger.info("[STEP 4] Menggabungkan hasil...")

    final_schedule = [
        {
            "job_id":              item["job_id"],
            "assigned_machine_id": item["machine_id"],
            "scheduled_start":     (base_time + timedelta(minutes=item["start_time"])).isoformat(),
            "scheduled_end":       (base_time + timedelta(minutes=item["end_time"])).isoformat(),
            "duration":            item["duration"],
            "start_offset_menit":  item["start_time"],
            "end_offset_menit":    item["end_time"],
            # hasil rule-based deadline
            "deadline_predicted":  deadline_results.get(item["job_id"], {}).get("deadline_predicted"),
            "predicted_duration":  deadline_results.get(item["job_id"], {}).get("predicted_duration"),
            # hasil Fuzzy
            "skor_prioritas":      fuzzy_map.get(item["job_id"], {}).get("skor_final", 0),
            "skor_crisp":          fuzzy_map.get(item["job_id"], {}).get("skor_crisp", 0),
            "bobot_operation":     fuzzy_map.get(item["job_id"], {}).get("bobot", 1.0),
        }
        for item in ccea_result["schedule"]
    ]

    logger.info(
        "[PIPELINE] SELESAI | Makespan: %s menit | Jobs: %d | Mesin: %d",
        ccea_result["makespan"], len(jobs), len(machine_ids),
    )

    return jsonify({
        "success":        True,
        "makespan":       ccea_result["makespan"],
        "total_jobs":     len(jobs),
        "total_machines": len(machine_ids),
        "schedule":       final_schedule,
        "summary": {
            "fuzzy_rules":   27,
            "ccea_generasi": ccea_result.get("generasi"),
            "ccea_cache":    ccea_result.get("cache_stats"),
            "ccea_config":   ccea_config,
            "generated_at":  datetime.now().isoformat(),
        },
    })

# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("FLASK SERVICE RUNNING")
    logger.info("Port  : %d", FLASK_PORT)
    logger.info("DB API: %s", DB_API or "(tidak di-set)")
    logger.info("Pipeline: Fuzzy Mamdani + CCEA")
    logger.info("=" * 50)
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)