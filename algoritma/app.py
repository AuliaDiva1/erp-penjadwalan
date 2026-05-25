import json
import logging
import os
import threading
from datetime import datetime, timedelta

import joblib
import numpy as np
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

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
MODEL_DIR  = os.path.join(os.path.dirname(__file__), "models")
DB_TIMEOUT = 5

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ModelNotLoadedError(RuntimeError):
    """Model RF belum di-load."""

class PipelineInputError(ValueError):
    """Input pipeline tidak valid."""

# ---------------------------------------------------------------------------
# Helper: baca metrik dari metadata
# ---------------------------------------------------------------------------

def _meta_r2(meta: dict) -> float | None:
    nested = meta.get("duration_model", {})
    return nested.get("r2_test") or meta.get("r2_score")


def _meta_mae(meta: dict) -> float | None:
    nested = meta.get("duration_model", {})
    return nested.get("mae") or meta.get("mae")


# ---------------------------------------------------------------------------
# Model loader
# ---------------------------------------------------------------------------

_model_lock = threading.Lock()


def _load_models() -> dict:
    try:
        duration      = joblib.load(os.path.join(MODEL_DIR, "model_duration.pkl"))
        offset        = joblib.load(os.path.join(MODEL_DIR, "model_offset.pkl"))
        label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        with open(os.path.join(MODEL_DIR, "metadata.json")) as f:
            meta = json.load(f)
        logger.info(
            "[RF] Model loaded | R²: %s | MAE: %s menit",
            _meta_r2(meta),
            _meta_mae(meta),
        )
        return {
            "duration":      duration,
            "offset":        offset,
            "label_encoder": label_encoder,
            "metadata":      meta,
        }
    except Exception as exc:
        raise ModelNotLoadedError(f"Gagal load model RF: {exc}") from exc


try:
    _models = _load_models()
except ModelNotLoadedError as e:
    logger.warning("%s", e)
    _models = {}


def get_models() -> dict:
    return _models


def reload_models() -> dict:
    global _models
    with _model_lock:
        _models = _load_models()
    return _models

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
# Helper: prediksi deadline (RF)
# ---------------------------------------------------------------------------

def prediksi_deadline(job: dict, scheduled_start_dt: datetime) -> dict:
    pt = job.get("processing_time")
    if pt is None or not isinstance(pt, (int, float)) or pt <= 0:
        raise PipelineInputError(
            f"Job '{job.get('job_id', '?')}' processing_time tidak valid: {pt!r}"
        )

    models = get_models()

    if not models:
        duration = float(pt)
        offset   = 0.0
    else:
        try:
            op_type = job.get("operation_type", "Lathe")
            try:
                op_enc = int(models["label_encoder"].transform([op_type])[0])
            except Exception:
                logger.warning("[RF] Operation type '%s' tidak dikenal, pakai 0.", op_type)
                op_enc = 0

            X = np.array([[
                float(pt),
                float(job.get("energy_consumption",   8.0)),
                float(job.get("machine_availability", 90.0)),
                op_enc,
                scheduled_start_dt.hour,
                scheduled_start_dt.weekday(),
            ]])

            duration = float(models["duration"].predict(X)[0])
            offset   = float(models["offset"].predict(X)[0])

        except Exception as exc:
            logger.warning(
                "[RF] Prediksi gagal untuk job '%s': %s, pakai fallback.",
                job.get("job_id"), exc,
            )
            duration = float(pt)
            offset   = 0.0

    actual_start = scheduled_start_dt + timedelta(minutes=max(0.0, offset))
    actual_end   = actual_start       + timedelta(minutes=max(1.0, duration))
    deadline     = actual_end         + timedelta(minutes=float(pt) * 0.2)

    return {
        "predicted_duration": round(duration, 2),
        "predicted_offset":   round(offset, 2),
        "predicted_start":    actual_start.isoformat(),
        "predicted_end":      actual_end.isoformat(),
        "deadline_predicted": deadline.isoformat(),
    }

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
    models   = get_models()
    metadata = models.get("metadata", {})
    return jsonify({
        "status":   "ok",
        "model_rf": bool(models),
        "r2_score": _meta_r2(metadata),
        "mae":      _meta_mae(metadata),
        "metadata": metadata,
    })

# ============================================================
# ENDPOINT 2: Prediksi Deadline (RF saja)
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
            pred = prediksi_deadline(job, scheduled_start)
            results.append({"job_id": job_id, **pred})
        except (PipelineInputError, ValueError) as exc:
            logger.warning("[predict_deadline] Job '%s' dilewati: %s", job_id, exc)
            errors.append({"job_id": job_id, "error": str(exc)})

    return jsonify({"success": True, "data": results, "errors": errors})

# ============================================================
# ENDPOINT 3: Hitung Prioritas Fuzzy (Fuzzy saja)
# ============================================================

@app.route("/fuzzy/prioritas", methods=["POST"])
def fuzzy_prioritas():
    body  = request.get_json(silent=True) or {}
    jobs  = body.get("jobs", [])
    token = body.get("token")

    if not isinstance(jobs, list) or len(jobs) == 0:
        return jsonify({"success": False, "message": "Field 'jobs' harus list non-kosong."}), 400

    try:
        # hitung_prioritas_batch return {"results": [...], "errors": [...]}
        batch = hitung_prioritas_batch(jobs, token)
        return jsonify({
            "success": True,
            "data":    batch.get("results", []),
            "errors":  batch.get("errors",  []),
        })
    except FuzzyInputError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

# ============================================================
# ENDPOINT 4: Pipeline Lengkap (RF + Fuzzy + CCEA)
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

    # ── STEP 1: RF — Prediksi Deadline ──────────────
    logger.info("[STEP 1] Random Forest — Prediksi Deadline")
    rf_results: dict[str, dict] = {}
    for job in jobs:
        job_id = job.get("job_id", "?")
        try:
            scheduled_start = (
                datetime.fromisoformat(job["scheduled_start"])
                if job.get("scheduled_start")
                else base_time
            )
            rf_results[job_id] = prediksi_deadline(job, scheduled_start)
            logger.debug(
                "  %s → durasi: %s menit | deadline: %s",
                job_id,
                rf_results[job_id]["predicted_duration"],
                rf_results[job_id]["deadline_predicted"][:19],
            )
        except PipelineInputError as exc:
            logger.warning("[STEP 1] Job '%s' dilewati: %s", job_id, exc)
            rf_results[job_id] = {}

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
        # FIX: hitung_prioritas_batch return dict {"results": [...], "errors": [...]}
        # bukan list langsung
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
    metadata = get_models().get("metadata", {})

    final_schedule = [
        {
            "job_id":              item["job_id"],
            "assigned_machine_id": item["machine_id"],
            "scheduled_start":     (base_time + timedelta(minutes=item["start_time"])).isoformat(),
            "scheduled_end":       (base_time + timedelta(minutes=item["end_time"])).isoformat(),
            "duration":            item["duration"],
            "start_offset_menit":  item["start_time"],
            "end_offset_menit":    item["end_time"],
            # hasil RF
            "deadline_predicted":  rf_results.get(item["job_id"], {}).get("deadline_predicted"),
            "predicted_duration":  rf_results.get(item["job_id"], {}).get("predicted_duration"),
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
            "rf_model_r2":   _meta_r2(metadata),
            "rf_model_mae":  _meta_mae(metadata),
            "fuzzy_rules":   27,
            "ccea_generasi": ccea_result.get("generasi"),
            "ccea_cache":    ccea_result.get("cache_stats"),
            "ccea_config":   ccea_config,
            "generated_at":  datetime.now().isoformat(),
        },
    })

# ============================================================
# ENDPOINT 5: Info Model RF
# ============================================================

@app.route("/model/info", methods=["GET"])
def model_info():
    models   = get_models()
    metadata = models.get("metadata", {})
    return jsonify({
        "success": True,
        "data": {
            **metadata,
            "r2_score":   _meta_r2(metadata),
            "mae":        _meta_mae(metadata),
            "is_active":  bool(models),
            "trained_at": metadata.get("trained_at"),
        },
    })

# ============================================================
# ENDPOINT 6: Reset Model (re-training)
# ============================================================

@app.route("/model/reset", methods=["POST"])
def model_reset():
    try:
        import train
        import importlib
        importlib.reload(train)
    except Exception as exc:
        logger.error("[model/reset] Training gagal: %s", exc)
        return jsonify({"success": False, "message": f"Training gagal: {exc}"}), 500

    try:
        new_models = reload_models()
        invalidate_config_cache()
        return jsonify({
            "success":  True,
            "message":  "Model berhasil direset dan dilatih ulang.",
            "r2_score": _meta_r2(new_models.get("metadata", {})),
            "mae":      _meta_mae(new_models.get("metadata", {})),
            "metadata": new_models.get("metadata", {}),
        })
    except Exception as exc:
        logger.error("[model/reset] Gagal load model baru: %s", exc)
        return jsonify({"success": False, "message": f"Gagal load model baru: {exc}"}), 500

# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    models   = get_models()
    metadata = models.get("metadata", {})
    logger.info("=" * 50)
    logger.info("FLASK SERVICE RUNNING")
    logger.info("Port  : %d", FLASK_PORT)
    logger.info("DB API: %s", DB_API or "(tidak di-set)")
    logger.info("Model : %s", "loaded" if models else "NOT LOADED")
    if models:
        logger.info("R²    : %s", _meta_r2(metadata))
        logger.info("MAE   : %s menit", _meta_mae(metadata))
    logger.info("=" * 50)
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)