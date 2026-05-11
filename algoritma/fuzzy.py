import numpy as np
import requests
import os
from dotenv import load_dotenv

load_dotenv()

DB_API = os.getenv('DB_API')

DEFAULT_MF = {
    'processing_time': {
        'rendah': [20, 20, 57],
        'sedang': [20, 57, 95],
        'tinggi': [57, 95, 121],
    },
    'energy_consumption': {
        'rendah': [2.01, 2.01, 6.33],
        'sedang': [2.01, 6.33, 10.66],
        'tinggi': [6.33, 10.66, 15.0],
    },
    'machine_availability': {
        'rendah': [80, 80, 86],
        'sedang': [80, 86, 93],
        'tinggi': [86, 93, 100],
    },
}

DEFAULT_BOBOT = {
    'Lathe':    1.20,  # Prioritas Tinggi (Sering Delayed/Failed)
    'Milling':  1.10,
    'Grinding': 1.08,
    'Additive': 0.98,
    'Drilling': 0.95,  # Prioritas Rendah (Paling Stabil)
}

DEFAULT_RULES = []
for pt in ['Rendah', 'Sedang', 'Tinggi']:
    for ec in ['Rendah', 'Sedang', 'Tinggi']:
        for ma in ['Rendah', 'Sedang', 'Tinggi']:
            prioritas = 'Sedang'
            if pt == 'Tinggi' and ec == 'Tinggi':
                prioritas = 'Tinggi'
            elif pt == 'Rendah' and ec == 'Rendah':
                prioritas = 'Rendah'
            elif ma == 'Rendah' and pt == 'Tinggi':
                prioritas = 'Tinggi'
            elif ma == 'Tinggi' and pt == 'Rendah':
                prioritas = 'Rendah'
            DEFAULT_RULES.append({
                'processing_time':      pt,
                'energy_consumption':   ec,
                'machine_availability': ma,
                'prioritas':            prioritas,
            })

OUTPUT_MF = {
    'Rendah': (0,   0,   50),
    'Sedang': (0,   50, 100),
    'Tinggi': (50, 100, 100),
}


def triangular_mf(x, a, b, c):
    if x < a or x > c:
        return 0.0
    elif a <= x <= b:
        return (x - a) / (b - a) if b != a else 1.0
    else:
        return (c - x) / (c - b) if c != b else 1.0


def fuzzify(value, mf_dict):
    return {label: triangular_mf(value, a, b, c) for label, (a, b, c) in mf_dict.items()}


def load_config_from_db(token=None):
    try:
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        res = requests.get(f'{DB_API}/konfigurasi/fuzzy', headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json().get('data')
            if data:
                return (
                    data.get('fuzzy_rules',          DEFAULT_RULES),
                    data.get('bobot_operation_type', DEFAULT_BOBOT),
                    data.get('membership_functions', DEFAULT_MF),
                )
    except Exception as e:
        print(f'[Fuzzy] Gagal load config dari DB: {e}, pakai default')
    return DEFAULT_RULES, DEFAULT_BOBOT, DEFAULT_MF


def aggregate_output(fired_rules):
    z_vals     = np.linspace(0, 100, 200)
    aggregated = {}
    for z in z_vals:
        max_mu = 0.0
        for alpha, output_label in fired_rules:
            a, b, c = OUTPUT_MF[output_label]
            mu      = min(alpha, triangular_mf(z, a, b, c))
            max_mu  = max(max_mu, mu)
        aggregated[z] = max_mu
    return aggregated


def defuzzify_centroid(aggregated):
    z_vals  = np.array(list(aggregated.keys()))
    mu_vals = np.array(list(aggregated.values()))
    denom   = np.sum(mu_vals)
    if denom == 0:
        return 50.0
    return float(np.sum(z_vals * mu_vals) / denom)


def hitung_prioritas(job, token=None):
    rules, bobot, mf_config = load_config_from_db(token)

    pt = job.get('processing_time',      job.get('Processing_Time', 70))
    ec = job.get('energy_consumption',   job.get('Energy_Consumption', 8))
    ma = job.get('machine_availability', job.get('Machine_Availability', 90))
    op = job.get('operation_type',       job.get('Operation_Type', 'Lathe'))

    mf_pt = {k.capitalize(): v for k, v in mf_config['processing_time'].items()}
    mf_ec = {k.capitalize(): v for k, v in mf_config['energy_consumption'].items()}
    mf_ma = {k.capitalize(): v for k, v in mf_config['machine_availability'].items()}

    mu_pt = fuzzify(pt, mf_pt)
    mu_ec = fuzzify(ec, mf_ec)
    mu_ma = fuzzify(ma, mf_ma)

    fired_rules = []
    for rule in rules:
        alpha = min(
            mu_pt.get(rule['processing_time'],      0),
            mu_ec.get(rule['energy_consumption'],   0),
            mu_ma.get(rule['machine_availability'], 0),
        )
        if alpha > 0:
            fired_rules.append((alpha, rule['prioritas']))

    aggregated = aggregate_output(fired_rules)
    skor_crisp = defuzzify_centroid(aggregated)
    bobot_op   = bobot.get(op, 1.0)
    skor_final = skor_crisp * bobot_op

    return {
        'skor_crisp':  round(skor_crisp, 4),
        'bobot':       bobot_op,
        'skor_final':  round(skor_final, 4),
        'fired_rules': len(fired_rules),
    }


def hitung_prioritas_batch(jobs, token=None):
    results = []
    for job in jobs:
        result = hitung_prioritas(job, token)
        results.append({
            'job_id':     job.get('job_id', job.get('Job_ID')),
            'skor_final': result['skor_final'],
            'skor_crisp': result['skor_crisp'],
            'bobot':      result['bobot'],
            'detail':     result,
        })
    results.sort(key=lambda x: x['skor_final'], reverse=True)
    return results


if __name__ == '__main__':
    print("=" * 50)
    print("TEST FUZZY MAMDANI")
    print("=" * 50)

    test_jobs = [
        {'job_id': 'JOB-001', 'processing_time': 95, 'energy_consumption': 12,
         'machine_availability': 82, 'operation_type': 'Additive'},
        {'job_id': 'JOB-002', 'processing_time': 30, 'energy_consumption': 3,
         'machine_availability': 97, 'operation_type': 'Drilling'},
        {'job_id': 'JOB-003', 'processing_time': 70, 'energy_consumption': 8,
         'machine_availability': 88, 'operation_type': 'Milling'},
    ]

    results = hitung_prioritas_batch(test_jobs)
    for i, r in enumerate(results):
        print(f"{i+1}. {r['job_id']} → Crisp: {r['skor_crisp']} | Bobot: {r['bobot']} | Final: {r['skor_final']}")