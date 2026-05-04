from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import os
import numpy as np
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

from fuzzy import hitung_prioritas_batch
from ccea import run_ccea

load_dotenv()

app  = Flask(__name__)
CORS(app)

DB_API      = os.getenv('DB_API')
FLASK_PORT  = int(os.getenv('FLASK_PORT', 5000))

# ── LOAD MODEL RF ────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    model_duration = joblib.load(os.path.join(MODEL_DIR, 'model_duration.pkl'))
    model_offset   = joblib.load(os.path.join(MODEL_DIR, 'model_offset.pkl'))
    label_encoder  = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
    with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
        metadata = json.load(f)
    print(f"[RF] Model loaded | R²: {metadata.get('r2_score')} | MAE: {metadata.get('mae')} menit")
except Exception as e:
    print(f"[RF] Gagal load model: {e}")
    model_duration = None
    model_offset   = None
    label_encoder  = None
    metadata       = {}


# ── HELPER: LOAD KONFIGURASI CCEA DARI DB ───────────
def load_ccea_config(token=None):
    try:
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        res = requests.get(f'{DB_API}/konfigurasi/ccea', headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json().get('data')
            if data:
                return data
    except Exception as e:
        print(f'[CCEA] Gagal load config: {e}, pakai default')
    return None


# ── HELPER: PREDIKSI DEADLINE RF ─────────────────────
def prediksi_deadline(job, scheduled_start_dt):
    if model_duration is None:
        duration = job.get('processing_time', 60)
        offset   = 0
    else:
        try:
            op_enc = label_encoder.transform([job.get('operation_type', 'Lathe')])[0]
        except Exception:
            op_enc = 0

        scheduled_start_ts = scheduled_start_dt.timestamp()
        scheduled_duration = job.get('processing_time', 60)

        X = np.array([[
            job.get('processing_time',      60),
            job.get('energy_consumption',   8),
            job.get('machine_availability', 90),
            op_enc,
            scheduled_duration,
            scheduled_start_ts,
        ]])

        duration = float(model_duration.predict(X)[0])
        offset   = float(model_offset.predict(X)[0])

    actual_start    = scheduled_start_dt + timedelta(minutes=max(0, offset))
    actual_end      = actual_start + timedelta(minutes=max(1, duration))
    deadline        = actual_end + timedelta(minutes=job.get('processing_time', 60) * 0.2)

    return {
        'predicted_duration': round(duration, 2),
        'predicted_offset':   round(offset, 2),
        'predicted_start':    actual_start.isoformat(),
        'predicted_end':      actual_end.isoformat(),
        'deadline_predicted': deadline.isoformat(),
    }


# ══════════════════════════════════════════════════════
# ENDPOINT 1: Health Check
# ══════════════════════════════════════════════════════
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':  'ok',
        'model_rf': model_duration is not None,
        'metadata': metadata,
    })


# ══════════════════════════════════════════════════════
# ENDPOINT 2: Prediksi Deadline (RF saja)
# ══════════════════════════════════════════════════════
@app.route('/predict/deadline', methods=['POST'])
def predict_deadline():
    try:
        body = request.get_json()
        jobs = body.get('jobs', [])

        if not jobs:
            return jsonify({'success': False, 'message': 'Data jobs kosong'}), 400

        base_time = datetime.now()
        results   = []

        for job in jobs:
            scheduled_start = datetime.fromisoformat(
                job.get('scheduled_start', base_time.isoformat())
            ) if job.get('scheduled_start') else base_time

            pred = prediksi_deadline(job, scheduled_start)
            results.append({
                'job_id':           job.get('job_id'),
                **pred,
            })

        return jsonify({'success': True, 'data': results})

    except Exception as e:
        print(f'[predict_deadline] Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500


# ══════════════════════════════════════════════════════
# ENDPOINT 3: Hitung Prioritas Fuzzy (Fuzzy saja)
# ══════════════════════════════════════════════════════
@app.route('/fuzzy/prioritas', methods=['POST'])
def fuzzy_prioritas():
    try:
        body  = request.get_json()
        jobs  = body.get('jobs', [])
        token = body.get('token')

        if not jobs:
            return jsonify({'success': False, 'message': 'Data jobs kosong'}), 400

        results = hitung_prioritas_batch(jobs, token)
        return jsonify({'success': True, 'data': results})

    except Exception as e:
        print(f'[fuzzy_prioritas] Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500


# ══════════════════════════════════════════════════════
# ENDPOINT 4: PIPELINE LENGKAP (RF + Fuzzy + CCEA)
# ══════════════════════════════════════════════════════
@app.route('/pipeline/run', methods=['POST'])
def pipeline_run():
    try:
        body     = request.get_json()
        jobs     = body.get('jobs', [])
        machines = body.get('machines', [])
        token    = body.get('token')

        if not jobs:
            return jsonify({'success': False, 'message': 'Data jobs kosong'}), 400
        if not machines:
            return jsonify({'success': False, 'message': 'Data machines kosong'}), 400

        print(f"\n{'='*50}")
        print(f"[PIPELINE] Mulai | {len(jobs)} jobs | {len(machines)} machines")
        print(f"{'='*50}")

        base_time    = datetime.now()
        machine_ids  = [m.get('machine_id', m) if isinstance(m, dict) else m for m in machines]

        # ── STEP 1: RANDOM FOREST - Prediksi Deadline ──
        print(f"\n[STEP 1] Random Forest - Prediksi Deadline")
        rf_results = {}
        for job in jobs:
            scheduled_start = datetime.fromisoformat(
                job.get('scheduled_start', base_time.isoformat())
            ) if job.get('scheduled_start') else base_time

            pred = prediksi_deadline(job, scheduled_start)
            rf_results[job['job_id']] = pred
            print(f"  {job['job_id']} → durasi: {pred['predicted_duration']} menit | "
                  f"deadline: {pred['deadline_predicted'][:19]}")

        # ── STEP 2: FUZZY MAMDANI - Hitung Prioritas ───
        print(f"\n[STEP 2] Fuzzy Mamdani - Hitung Prioritas")
        fuzzy_input = []
        for job in jobs:
            fuzzy_input.append({
                'job_id':              job['job_id'],
                'processing_time':     job.get('processing_time',      70),
                'energy_consumption':  job.get('energy_consumption',   8),
                'machine_availability': job.get('machine_availability', 90),
                'operation_type':      job.get('operation_type',       'Lathe'),
            })

        fuzzy_results = hitung_prioritas_batch(fuzzy_input, token)
        fuzzy_map     = {r['job_id']: r for r in fuzzy_results}

        for r in fuzzy_results:
            print(f"  {r['job_id']} → skor: {r['skor_final']} (crisp: {r['skor_crisp']}, bobot: {r['bobot']})")

        # ── STEP 3: CCEA - Optimasi Penjadwalan ────────
        print(f"\n[STEP 3] CCEA - Optimasi Penjadwalan")
        ccea_config = load_ccea_config(token)

        ccea_jobs = []
        for job in jobs:
            fz = fuzzy_map.get(job['job_id'], {})
            ccea_jobs.append({
                'job_id':         job['job_id'],
                'processing_time': job.get('processing_time', 60),
                'priority_score':  fz.get('skor_final', 50),
            })

        # urutkan berdasarkan prioritas sebelum masuk CCEA
        ccea_jobs.sort(key=lambda x: x['priority_score'], reverse=True)

        ccea_result = run_ccea(ccea_jobs, machine_ids, ccea_config)

        # ── STEP 4: GABUNGKAN HASIL ─────────────────────
        print(f"\n[STEP 4] Menggabungkan hasil...")

        schedule_start = base_time
        final_schedule = []

        for item in ccea_result['schedule']:
            job_id  = item['job_id']
            rf      = rf_results.get(job_id, {})
            fz      = fuzzy_map.get(job_id, {})

            scheduled_start_dt = schedule_start + timedelta(minutes=item['start_time'])
            scheduled_end_dt   = schedule_start + timedelta(minutes=item['end_time'])

            final_schedule.append({
                'job_id':              job_id,
                'assigned_machine_id': item['machine_id'],
                'scheduled_start':     scheduled_start_dt.isoformat(),
                'scheduled_end':       scheduled_end_dt.isoformat(),
                'duration':            item['duration'],
                'start_offset_menit':  item['start_time'],
                'end_offset_menit':    item['end_time'],

                # hasil RF
                'deadline_predicted':  rf.get('deadline_predicted'),
                'predicted_duration':  rf.get('predicted_duration'),

                # hasil Fuzzy
                'skor_prioritas':      fz.get('skor_final', 0),
                'skor_crisp':          fz.get('skor_crisp', 0),
                'bobot_operation':     fz.get('bobot', 1.0),
            })

        response = {
            'success':      True,
            'makespan':     ccea_result['makespan'],
            'total_jobs':   len(jobs),
            'total_machines': len(machine_ids),
            'schedule':     final_schedule,
            'summary': {
                'rf_model_r2':    metadata.get('r2_score'),
                'rf_model_mae':   metadata.get('mae'),
                'fuzzy_rules':    27,
                'ccea_config':    ccea_config,
                'generated_at':   datetime.now().isoformat(),
            },
        }

        print(f"\n{'='*50}")
        print(f"[PIPELINE] SELESAI!")
        print(f"  Makespan    : {ccea_result['makespan']} menit")
        print(f"  Total Jobs  : {len(jobs)}")
        print(f"  Total Mesin : {len(machine_ids)}")
        print(f"{'='*50}\n")

        return jsonify(response)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f'[pipeline_run] Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500


# ══════════════════════════════════════════════════════
# ENDPOINT 5: Info Model RF
# ══════════════════════════════════════════════════════
@app.route('/model/info', methods=['GET'])
def model_info():
    return jsonify({
        'success': True,
        'data': {
            **metadata,
            'is_active':  model_duration is not None,
            'trained_at': metadata.get('trained_at'),
        }
    })


# ══════════════════════════════════════════════════════
# ENDPOINT 6: Reset Model (re-training)
# ══════════════════════════════════════════════════════
@app.route('/model/reset', methods=['POST'])
def model_reset():
    try:
        import subprocess
        result = subprocess.run(
            ['python', 'train.py'],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__),
        )

        if result.returncode == 0:
            global model_duration, model_offset, label_encoder, metadata
            model_duration = joblib.load(os.path.join(MODEL_DIR, 'model_duration.pkl'))
            model_offset   = joblib.load(os.path.join(MODEL_DIR, 'model_offset.pkl'))
            label_encoder  = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
            with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
                metadata = json.load(f)

            return jsonify({
                'success': True,
                'message': 'Model berhasil direset dan dilatih ulang',
                'metadata': metadata,
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Training gagal',
                'error':   result.stderr,
            }), 500

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ══════════════════════════════════════════════════════
if __name__ == '__main__':
    print(f"\n{'='*50}")
    print(f"FLASK SERVICE RUNNING")
    print(f"Port  : {FLASK_PORT}")
    print(f"DB API: {DB_API}")
    print(f"Model : {'loaded' if model_duration else 'NOT LOADED'}")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=False)