import logging
import threading
from collections import Counter
from typing import Any

import numpy as np
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Konstanta
# ---------------------------------------------------------------------------
DB_API: str       = os.getenv("DB_API", "")
DB_TIMEOUT: int   = 5        # detik
Z_RESOLUTION: int = 200      # titik sampling defuzzifikasi
DEFAULT_CRISP_FALLBACK: float = 50.0
MAX_SKOR: float   = 100.0
MIN_SKOR: float   = 0.0

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class FuzzyConfigError(ValueError):
    """Config dari DB tidak valid."""

class FuzzyInputError(ValueError):
    """Input job tidak valid."""

# ---------------------------------------------------------------------------
# Default config / Membership Function
# ---------------------------------------------------------------------------
# fuzzy.py - Update DEFAULT_MF dan DEFAULT_BOBOT sesuai distribusi data
OUTPUT_MF: dict[str, tuple[float, float, float]] = {
    "Rendah": (0.0,   0.0,  50.0),
    "Sedang": (25.0, 50.0,  75.0),
    "Tinggi": (50.0, 100.0, 100.0),
}

DEFAULT_MF: dict[str, dict[str, list[float]]] = {
    "processing_time": {
        "rendah": [20.0,  20.0,  57.0],
        "sedang": [20.0,  57.0,  95.0],
        "tinggi": [57.0,  95.0, 120.0],
    },
    "energy_consumption": {
        "rendah": [2.01,  2.01,  6.33],
        "sedang": [2.01,  6.33, 10.66],
        "tinggi": [6.33, 10.66, 14.98],
    },
    "machine_availability": {
        "rendah": [80.0, 80.0, 86.0],
        "sedang": [80.0, 86.0, 93.0],
        "tinggi": [86.0, 93.0, 99.0],
    },
}

DEFAULT_BOBOT: dict[str, float] = {
    "Drilling": 1.20,  # % Delayed tertinggi 52.4%
    "Lathe":    1.15,  # % Delayed 51.4%
    "Additive": 1.10,  # % Delayed 50.0%
    "Milling":  1.05,  # % Delayed 45.8%
    "Grinding": 1.00,  # % Delayed terendah 43.3% (baseline)
}
# ---------------------------------------------------------------------------
# Build default rules (27 kombinasi)
# ---------------------------------------------------------------------------

def _build_default_rules() -> list[dict[str, str]]:
    rules: list[dict[str, str]] = []
    for pt in ("Rendah", "Sedang", "Tinggi"):
        for ec in ("Rendah", "Sedang", "Tinggi"):
            for ma in ("Rendah", "Sedang", "Tinggi"):
                if pt == "Tinggi" and ec == "Tinggi":
                    prioritas = "Tinggi"
                elif pt == "Tinggi" and ma == "Rendah":
                    prioritas = "Tinggi"
                elif pt == "Tinggi" and ec == "Sedang" and ma == "Rendah":
                    prioritas = "Tinggi"
                elif pt == "Sedang" and ec == "Tinggi" and ma == "Rendah":
                    prioritas = "Tinggi"
                elif pt == "Sedang" and ec == "Tinggi" and ma == "Sedang":
                    prioritas = "Tinggi"
                elif pt == "Rendah" and ec == "Rendah" and ma == "Tinggi":
                    prioritas = "Rendah"
                elif pt == "Rendah" and ec == "Rendah" and ma == "Sedang":
                    prioritas = "Rendah"
                elif pt == "Rendah" and ma == "Tinggi":
                    prioritas = "Rendah"
                elif pt == "Sedang" and ec == "Rendah" and ma == "Tinggi":
                    prioritas = "Rendah"
                elif pt == "Tinggi" and ec == "Rendah" and ma == "Tinggi":
                    prioritas = "Sedang"
                else:
                    prioritas = "Sedang"

                rules.append({
                    "processing_time":      pt,
                    "energy_consumption":   ec,
                    "machine_availability": ma,
                    "prioritas":            prioritas,
                })
    return rules


DEFAULT_RULES: list[dict[str, str]] = _build_default_rules()

# ---------------------------------------------------------------------------
# Normalisasi label
# ---------------------------------------------------------------------------

def _normalize_label(label: str) -> str:
    """
    Normalisasi label MF ke Title Case yang konsisten.

    Contoh:
        "rendah"    → "Rendah"
        "TINGGI"    → "Tinggi"
        "very_low"  → "Very Low"   (underscore → spasi)
    """
    return label.strip().replace("_", " ").title()

# ---------------------------------------------------------------------------
# Validasi
# ---------------------------------------------------------------------------

_VALID_PRIORITAS  = {"Rendah", "Sedang", "Tinggi"}
_REQUIRED_MF_KEYS = {"processing_time", "energy_consumption", "machine_availability"}
_REQUIRED_JOB_KEYS = [
    ("processing_time",      "Processing_Time"),
    ("energy_consumption",   "Energy_Consumption"),
    ("machine_availability", "Machine_Availability"),
    ("operation_type",       "Operation_Type"),
]
_NUMERIC_JOB_KEYS = [
    ("processing_time",      "Processing_Time"),
    ("energy_consumption",   "Energy_Consumption"),
    ("machine_availability", "Machine_Availability"),
]


def _validate_mf(mf: Any) -> None:
    if not isinstance(mf, dict):
        raise FuzzyConfigError("membership_functions harus dict.")
    missing = _REQUIRED_MF_KEYS - mf.keys()
    if missing:
        raise FuzzyConfigError(f"membership_functions kurang key: {missing}")
    for var, sets in mf.items():
        if not isinstance(sets, dict):
            raise FuzzyConfigError(f"MF '{var}' harus dict.")
        for label, params in sets.items():
            if not isinstance(params, (list, tuple)) or len(params) != 3:
                raise FuzzyConfigError(
                    f"MF '{var}.{label}' harus list/tuple [a, b, c], dapat: {params}"
                )
            a, b, c = params
            if not (a <= b <= c):
                raise FuzzyConfigError(
                    f"MF '{var}.{label}' harus a<=b<=c, dapat: {params}"
                )


def _validate_rules(rules: Any) -> None:
    if not isinstance(rules, list) or len(rules) == 0:
        raise FuzzyConfigError("fuzzy_rules harus list non-kosong.")
    required = {"processing_time", "energy_consumption", "machine_availability", "prioritas"}
    for i, rule in enumerate(rules):
        if not isinstance(rule, dict):
            raise FuzzyConfigError(f"Rule[{i}] harus dict.")
        missing = required - rule.keys()
        if missing:
            raise FuzzyConfigError(f"Rule[{i}] kurang key: {missing}")
        if rule["prioritas"] not in _VALID_PRIORITAS:
            raise FuzzyConfigError(
                f"Rule[{i}] prioritas '{rule['prioritas']}' tidak valid. "
                f"Harus salah satu dari: {_VALID_PRIORITAS}"
            )


def _validate_bobot(bobot: Any) -> None:
    if not isinstance(bobot, dict) or len(bobot) == 0:
        raise FuzzyConfigError("bobot_operation_type harus dict non-kosong.")
    for k, v in bobot.items():
        if not isinstance(v, (int, float)) or v <= 0:
            raise FuzzyConfigError(f"Bobot '{k}' harus angka positif, dapat: {v}")


def _validate_job(job: dict) -> None:
    """Raise FuzzyInputError jika field wajib tidak ada atau tipe salah."""
    job_id = job.get("job_id", job.get("Job_ID", "?"))
    for snake, pascal in _REQUIRED_JOB_KEYS:
        val = job.get(snake, job.get(pascal))
        if val is None:
            raise FuzzyInputError(f"Job '{job_id}' kurang field '{snake}'.")
    for snake, pascal in _NUMERIC_JOB_KEYS:
        val = job.get(snake, job.get(pascal))
        if not isinstance(val, (int, float)):
            raise FuzzyInputError(
                f"Job '{job_id}' field '{snake}' harus numerik, dapat: {val!r}"
            )

# ---------------------------------------------------------------------------
# Config cache (singleton, thread-safe)
# ---------------------------------------------------------------------------
# CATATAN: config di-cache secara global (shared semua request).
# Token hanya dipakai pada saat reload pertama atau force_reload=True.
# Jika config bersifat per-user, nonaktifkan cache atau gunakan key per token.
# ---------------------------------------------------------------------------

_config_lock    = threading.Lock()
_cached_config: tuple | None = None  # (rules, bobot, mf)


def _load_config_from_db(token: str | None = None) -> tuple:
    """Load config dari DB dengan validasi. Kembalikan (rules, bobot, mf)."""
    if not DB_API:
        logger.warning("[Fuzzy] DB_API tidak di-set, pakai DEFAULT config.")
        return DEFAULT_RULES, DEFAULT_BOBOT, DEFAULT_MF

    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        res = requests.get(
            f"{DB_API}/konfigurasi/fuzzy",
            headers=headers,
            timeout=DB_TIMEOUT,
        )
        res.raise_for_status()
        data = res.json().get("data")
        if not data:
            raise FuzzyConfigError("Response DB kosong.")

        rules  = data.get("fuzzy_rules",          DEFAULT_RULES)
        bobot  = data.get("bobot_operation_type", DEFAULT_BOBOT)
        mf     = data.get("membership_functions", DEFAULT_MF)

        _validate_rules(rules)
        _validate_bobot(bobot)
        _validate_mf(mf)

        logger.info("[Fuzzy] Config berhasil di-load dari DB.")
        return rules, bobot, mf

    except (requests.RequestException, FuzzyConfigError) as exc:
        logger.warning("[Fuzzy] Gagal load config dari DB (%s), pakai DEFAULT.", exc)
        return DEFAULT_RULES, DEFAULT_BOBOT, DEFAULT_MF


def get_config(token: str | None = None, force_reload: bool = False) -> tuple:
    """
    Kembalikan (rules, bobot, mf).
    Config di-cache per proses; gunakan force_reload=True untuk refresh.
    """
    global _cached_config
    with _config_lock:
        if _cached_config is None or force_reload:
            _cached_config = _load_config_from_db(token)
        return _cached_config


def invalidate_config_cache() -> None:
    """Paksa reload config dari DB pada request berikutnya."""
    global _cached_config
    with _config_lock:
        _cached_config = None
    logger.info("[Fuzzy] Config cache di-invalidate.")

# ---------------------------------------------------------------------------
# Fuzzy core
# ---------------------------------------------------------------------------

def _triangular_mf(x: float, a: float, b: float, c: float) -> float:
    """
    Membership function segitiga.

    Mengembalikan derajat keanggotaan x pada himpunan [a, b, c].
    Diasumsikan a <= b <= c (divalidasi saat load config).
    """
    if x <= a or x >= c:
        # Titik ujung: jika x == a == b atau x == b == c, nilai = 1.0
        if x == a == b:
            return 1.0
        if x == c == b:
            return 1.0
        return 0.0
    if x <= b:
        return (x - a) / (b - a) if b != a else 1.0
    return (c - x) / (c - b) if c != b else 1.0


def _fuzzify(value: float, mf_dict: dict[str, tuple]) -> dict[str, float]:
    """
    Fuzzifikasi: hitung derajat keanggotaan `value` untuk setiap label MF.

    Label dinormalisasi dengan _normalize_label agar konsisten dengan key rule.
    Contoh: "rendah" → "Rendah", "very_low" → "Very Low"
    """
    return {
        _normalize_label(label): _triangular_mf(value, float(a), float(b), float(c))
        for label, (a, b, c) in mf_dict.items()
    }


def _aggregate_output(fired_rules: list[tuple[float, str]]) -> tuple[np.ndarray, np.ndarray]:
    """
    Agregasi output semua rule yang fired (Mamdani max-min).

    Untuk setiap titik z pada universe of discourse:
      1. Implication  : clip output MF tiap rule pada alpha (min)
      2. Agregasi     : ambil nilai maksimum antar semua rule (max)

    Implementasi vectorized NumPy untuk performa optimal.

    Returns
    -------
    z_vals     : np.ndarray, titik-titik universe of discourse
    aggregated : np.ndarray, nilai mu hasil agregasi di tiap titik z
    """
    z_vals     = np.linspace(MIN_SKOR, MAX_SKOR, Z_RESOLUTION)
    aggregated = np.zeros(Z_RESOLUTION, dtype=np.float64)

    for alpha, label in fired_rules:
        a, b, c = OUTPUT_MF[label]
        # Bangun triangular MF secara vectorized
        eps   = 1e-9  # hindari div-by-zero jika b==a atau c==b
        left  = np.where(z_vals <= b, (z_vals - a) / (b - a + eps), 1.0)
        right = np.where(z_vals >= b, (c - z_vals) / (c - b + eps), 1.0)
        mu    = np.clip(np.minimum(left, right), 0.0, 1.0)

        # Implication (clipping Mamdani) lalu agregasi (max)
        aggregated = np.maximum(aggregated, np.minimum(alpha, mu))

    return z_vals, aggregated


def _defuzzify_centroid(z_vals: np.ndarray, mu_vals: np.ndarray) -> float:
    """
    Defuzzifikasi dengan metode centroid (center of gravity).

    Formula:
        z* = Σ(z · μ(z) · dz) / Σ(μ(z) · dz)

    Karena z_vals dihasilkan dari np.linspace (jarak antar titik konstan),
    faktor dz saling cancel sehingga rumus menjadi:
        z* = Σ(z · μ(z)) / Σ(μ(z))

    Jika seluruh μ = 0 (tidak ada rule fired atau semua alpha = 0),
    dikembalikan DEFAULT_CRISP_FALLBACK.
    """
    denom = float(np.sum(mu_vals))
    if denom == 0.0:
        logger.debug(
            "[Fuzzy] Semua mu=0 (tidak ada rule fired atau nilai input di luar range MF). "
            "Centroid fallback ke %.1f",
            DEFAULT_CRISP_FALLBACK,
        )
        return DEFAULT_CRISP_FALLBACK
    return float(np.sum(z_vals * mu_vals) / denom)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def hitung_prioritas(
    job: dict,
    rules: list[dict],
    bobot: dict[str, float],
    mf_config: dict,
) -> dict:
    _validate_job(job)

    job_id = job.get("job_id", job.get("Job_ID", "?"))
    pt = float(job.get("processing_time",      job.get("Processing_Time")))
    ec = float(job.get("energy_consumption",   job.get("Energy_Consumption")))
    ma = float(job.get("machine_availability", job.get("Machine_Availability")))
    op = str(  job.get("operation_type",       job.get("Operation_Type", "")))

    # --- Fuzzifikasi ---
    mu_pt = _fuzzify(pt, mf_config["processing_time"])
    mu_ec = _fuzzify(ec, mf_config["energy_consumption"])
    mu_ma = _fuzzify(ma, mf_config["machine_availability"])

    # --- Evaluasi rule & implication (firing strength) ---
    fired_rules: list[tuple[float, str]] = []
    for rule in rules:
        alpha = min(
            mu_pt.get(rule["processing_time"],      0.0),
            mu_ec.get(rule["energy_consumption"],   0.0),
            mu_ma.get(rule["machine_availability"], 0.0),
        )
        if alpha > 0.0:
            fired_rules.append((alpha, rule["prioritas"]))

    if not fired_rules:
        logger.warning(
            "[Fuzzy] Job '%s': tidak ada rule fired. "
            "PT=%.1f (valid %.1f–%.1f), EC=%.2f (valid %.2f–%.2f), "
            "MA=%.1f (valid %.1f–%.1f). "
            "Pastikan nilai input berada dalam rentang MF. "
            "Skor fallback ke %.1f.",
            job_id,
            pt,
            list(mf_config["processing_time"].values())[0][0],
            list(mf_config["processing_time"].values())[-1][2],
            ec,
            list(mf_config["energy_consumption"].values())[0][0],
            list(mf_config["energy_consumption"].values())[-1][2],
            ma,
            list(mf_config["machine_availability"].values())[0][0],
            list(mf_config["machine_availability"].values())[-1][2],
            DEFAULT_CRISP_FALLBACK,
        )

    # --- Agregasi & Defuzzifikasi ---
    z_vals, aggregated = _aggregate_output(fired_rules)
    skor_crisp         = _defuzzify_centroid(z_vals, aggregated)

    # --- Pembobotan operation type ---
    bobot_op = bobot.get(op, 1.0)
    if op not in bobot:
        logger.warning(
            "[Fuzzy] Job '%s': operation type '%s' tidak ada di bobot, pakai 1.0.", job_id, op
        )

    # Clip SEBELUM round agar tidak ada peluang nilai melampaui MAX_SKOR
    skor_final = round(min(skor_crisp * bobot_op, MAX_SKOR), 4)

    return {
        "skor_crisp":  round(skor_crisp, 4),
        "bobot":       bobot_op,
        "skor_final":  skor_final,
        "fired_rules": len(fired_rules),
    }


def hitung_prioritas_batch(
    jobs: list[dict],
    token: str | None = None,
    force_reload: bool = False,
) -> dict:
    """
    Hitung dan urutkan prioritas untuk banyak job.

    Parameters
    ----------
    jobs         : list of job dict
    token        : JWT token untuk DB API (opsional; hanya dipakai saat reload config)
    force_reload : jika True, paksa reload config dari DB

    Returns
    -------
    dict dengan key:
        "results" : list of dict (sorted descending by skor_final)
        "errors"  : list of dict job yang gagal diproses (job_id + pesan error)
    """
    if not isinstance(jobs, list) or len(jobs) == 0:
        raise FuzzyInputError("jobs harus list non-kosong.")

    rules, bobot, mf_config = get_config(token, force_reload)

    results: list[dict] = []
    errors:  list[dict] = []

    for job in jobs:
        job_id = job.get("job_id", job.get("Job_ID", "?"))
        try:
            result = hitung_prioritas(job, rules, bobot, mf_config)
            results.append({
                "job_id":     job_id,
                "skor_final": result["skor_final"],
                "skor_crisp": result["skor_crisp"],
                "bobot":      result["bobot"],
                "detail":     result,
            })
        except FuzzyInputError as exc:
            logger.error("[Fuzzy] Job '%s' dilewati: %s", job_id, exc)
            errors.append({"job_id": job_id, "error": str(exc)})

    results.sort(key=lambda x: x["skor_final"], reverse=True)

    if errors:
        logger.warning("[Fuzzy] %d job gagal diproses: %s", len(errors), errors)

    return {"results": results, "errors": errors}

# ---------------------------------------------------------------------------
# CLI / smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("=" * 60)
    print("SMOKE TEST — Fuzzy Mamdani (Production)")
    print("=" * 60)

    dist = Counter(r["prioritas"] for r in DEFAULT_RULES)
    print(f"\nDistribusi DEFAULT_RULES ({len(DEFAULT_RULES)} total):")
    for k, v in sorted(dist.items()):
        print(f"  {k}: {v} rules")

    test_jobs = [
        # Normal cases
        {"job_id": "JOB-001", "processing_time": 95,   "energy_consumption": 12,   "machine_availability": 82,  "operation_type": "Lathe"},
        {"job_id": "JOB-002", "processing_time": 30,   "energy_consumption": 3,    "machine_availability": 97,  "operation_type": "Grinding"},
        {"job_id": "JOB-003", "processing_time": 70,   "energy_consumption": 8,    "machine_availability": 88,  "operation_type": "Milling"},
        {"job_id": "JOB-004", "processing_time": 110,  "energy_consumption": 14,   "machine_availability": 81,  "operation_type": "Drilling"},
        {"job_id": "JOB-005", "processing_time": 25,   "energy_consumption": 2.5,  "machine_availability": 98,  "operation_type": "Additive"},
        # Edge cases — nilai di luar range MF → fired=0, fallback 50.0
        {"job_id": "JOB-006", "processing_time": 20,   "energy_consumption": 2.01, "machine_availability": 100, "operation_type": "Grinding"},
        {"job_id": "JOB-007", "processing_time": 121,  "energy_consumption": 15.0, "machine_availability": 70,  "operation_type": "Lathe"},
        # Operation type tidak ada di bobot → pakai 1.0
        {"job_id": "JOB-008", "processing_time": 57,   "energy_consumption": 6.33, "machine_availability": 87,  "operation_type": "UnknownType"},
    ]

    batch_result = hitung_prioritas_batch(test_jobs)
    results = batch_result["results"]
    errors  = batch_result["errors"]

    print(f"\nHasil Prioritas (tertinggi → terendah):")
    print(f"{'No':<4} {'Job ID':<10} {'Crisp':>8} {'Bobot':>7} {'Final':>8} {'Fired':>6}")
    print("-" * 50)
    for i, r in enumerate(results, 1):
        print(
            f"{i:<4} {r['job_id']:<10} "
            f"{r['skor_crisp']:>8.4f} "
            f"{r['bobot']:>7.2f} "
            f"{r['skor_final']:>8.4f} "
            f"{r['detail']['fired_rules']:>6}"
        )

    if errors:
        print(f"\nJob gagal ({len(errors)}):")
        for e in errors:
            print(f"  {e['job_id']}: {e['error']}")

    # Test: job dengan field hilang → masuk errors, tidak crash
    print("\n--- Test job tidak valid ---")
    bad_jobs = [
        {"job_id": "BAD-001"},
        {"job_id": "BAD-002", "processing_time": "NaN", "energy_consumption": 5,
         "machine_availability": 90, "operation_type": "Lathe"},
    ]
    bad_result = hitung_prioritas_batch(bad_jobs)
    assert len(bad_result["errors"]) == 2, "Harus ada 2 error"
    assert len(bad_result["results"]) == 0, "Tidak ada hasil valid"
    print(f"Bad jobs diproses tanpa crash ✓ ({len(bad_result['errors'])} errors tertangkap)")