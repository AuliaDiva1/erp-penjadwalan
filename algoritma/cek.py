from fuzzy import hitung_prioritas, DEFAULT_MF, DEFAULT_RULES, DEFAULT_BOBOT, _fuzzify, _normalize_label

jobs = [
    {"job_id": "JOB364", "processing_time": 112, "energy_consumption": 8.48, "machine_availability": 89, "operation_type": "Lathe"},
    {"job_id": "JOB365", "processing_time": 114, "energy_consumption": 8.25, "machine_availability": 89, "operation_type": "Milling"},
    {"job_id": "JOB366", "processing_time": 105, "energy_consumption": 8.86, "machine_availability": 89, "operation_type": "Drilling"},
    {"job_id": "JOB367", "processing_time": 108, "energy_consumption": 8.49, "machine_availability": 89, "operation_type": "Grinding"},
    {"job_id": "JOB368", "processing_time": 106, "energy_consumption": 8.55, "machine_availability": 90, "operation_type": "Additive"},
]

for job in jobs:
    pt = float(job["processing_time"])
    ec = float(job["energy_consumption"])
    ma = float(job["machine_availability"])
    op = job["operation_type"]

    mu_pt = _fuzzify(pt, DEFAULT_MF["processing_time"])
    mu_ec = _fuzzify(ec, DEFAULT_MF["energy_consumption"])
    mu_ma = _fuzzify(ma, DEFAULT_MF["machine_availability"])

    print(f"\n{'='*50}")
    print(f"{job['job_id']} | PT={pt} | EC={ec} | MA={ma} | Op={op}")
    print(f"  μ_PT : {mu_pt}")
    print(f"  μ_EC : {mu_ec}")
    print(f"  μ_MA : {mu_ma}")

    fired = []
    for rule in DEFAULT_RULES:
        alpha = min(
            mu_pt.get(rule["processing_time"], 0.0),
            mu_ec.get(rule["energy_consumption"], 0.0),
            mu_ma.get(rule["machine_availability"], 0.0),
        )
        if alpha > 0.0:
            fired.append((alpha, rule["prioritas"], rule))

    print(f"  Fired rules ({len(fired)}):")
    for alpha, prioritas, rule in fired:
        print(f"    PT={rule['processing_time']:6} EC={rule['energy_consumption']:6} MA={rule['machine_availability']:6} → {prioritas:6} | α={alpha:.4f}")

    result = hitung_prioritas(job, DEFAULT_RULES, DEFAULT_BOBOT, DEFAULT_MF)
    print(f"  crisp={result['skor_crisp']} | bobot={result['bobot']} | final={result['skor_final']}")