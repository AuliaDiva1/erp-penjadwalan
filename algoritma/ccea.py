import numpy as np
import random
import os
from dotenv import load_dotenv

load_dotenv()


def hitung_makespan(chromosome, jobs, machines):
    machine_time = {m: 0.0 for m in machines}
    job_schedule = []

    for job_idx, machine_id in chromosome:
        job        = jobs[job_idx]
        start_time = machine_time[machine_id]
        end_time   = start_time + job['processing_time']
        machine_time[machine_id] = end_time

        job_schedule.append({
            'job_id':         job['job_id'],
            'machine_id':     machine_id,
            'start_time':     round(start_time, 2),
            'end_time':       round(end_time, 2),
            'duration':       job['processing_time'],
            'priority_score': job.get('priority_score', 0),
        })

    makespan = max(machine_time.values())
    return makespan, job_schedule


def inisialisasi_populasi(jobs, machines, pop_size):
    populasi = []
    for _ in range(pop_size):
        chromosome = [(j, random.choice(machines)) for j in range(len(jobs))]
        populasi.append(chromosome)
    return populasi


def fitness(chromosome, jobs, machines):
    makespan, schedule = hitung_makespan(chromosome, jobs, machines)

    priority_penalty = 0
    for i, (job_idx, _) in enumerate(chromosome):
        priority = jobs[job_idx].get('priority_score', 50)
        priority_penalty += i * (100 - priority)

    return 1.0 / (makespan + priority_penalty * 0.01 + 1e-9)


def crossover(p1, p2, rate=0.8):
    if random.random() > rate or len(p1) <= 1:
        return p1[:], p2[:]
    point = random.randint(1, len(p1) - 1)
    c1    = p1[:point] + p2[point:]
    c2    = p2[:point] + p1[point:]
    return c1, c2


def mutasi(chromosome, machines, rate=0.1):
    hasil = chromosome[:]
    for i in range(len(hasil)):
        if random.random() < rate:
            hasil[i] = (hasil[i][0], random.choice(machines))
    return hasil


def dekomposisi_random(n_jobs, n_subcomp):
    indices = list(range(n_jobs))
    random.shuffle(indices)
    size    = max(1, n_jobs // n_subcomp)
    return [indices[i:i+size] for i in range(0, n_jobs, size)]


def seleksi_turnamen(populasi, jobs, machines, k=3):
    kandidat = random.sample(populasi, min(k, len(populasi)))
    return max(kandidat, key=lambda c: fitness(c, jobs, machines))


def run_ccea(jobs, machines, config=None):
    if not jobs:
        return {'makespan': 0, 'schedule': [], 'chromosome': []}

    if len(jobs) == 1:
        machine_id = machines[0] if machines else 'M01'
        job        = jobs[0]
        return {
            'makespan': job['processing_time'],
            'schedule': [{
                'job_id':         job['job_id'],
                'machine_id':     machine_id,
                'start_time':     0,
                'end_time':       job['processing_time'],
                'duration':       job['processing_time'],
                'priority_score': job.get('priority_score', 0),
            }],
            'chromosome': [(0, machine_id)],
        }

    cfg            = config or {}
    pop_size       = int(cfg.get('jumlah_populasi', 50))
    n_iter         = int(cfg.get('jumlah_iterasi',  100))
    dekomposisi    = cfg.get('dekomposisi',          'random')
    crossover_rate = float(cfg.get('crossover_rate', 0.8))
    mutation_rate  = float(cfg.get('mutation_rate',  0.1))
    n_subcomp      = max(2, len(jobs) // 5)

    print(f"[CCEA] Jobs: {len(jobs)} | Machines: {len(machines)}")
    print(f"[CCEA] Pop: {pop_size} | Iter: {n_iter} | Decomp: {dekomposisi}")

    populasi   = inisialisasi_populasi(jobs, machines, pop_size)
    best_chrom = max(populasi, key=lambda c: fitness(c, jobs, machines))
    best_fit   = fitness(best_chrom, jobs, machines)

    for gen in range(n_iter):
        if dekomposisi == 'random' and len(jobs) > 5:
            subcomps = dekomposisi_random(len(jobs), n_subcomp)
        else:
            subcomps = [list(range(len(jobs)))]

        new_populasi = []
        while len(new_populasi) < pop_size:
            p1     = seleksi_turnamen(populasi, jobs, machines)
            p2     = seleksi_turnamen(populasi, jobs, machines)
            c1, c2 = crossover(p1, p2, crossover_rate)
            c1     = mutasi(c1, machines, mutation_rate)
            c2     = mutasi(c2, machines, mutation_rate)
            new_populasi.extend([c1, c2])

        new_populasi[0] = best_chrom
        populasi        = new_populasi[:pop_size]

        gen_best     = max(populasi, key=lambda c: fitness(c, jobs, machines))
        gen_best_fit = fitness(gen_best, jobs, machines)

        if gen_best_fit > best_fit:
            best_fit   = gen_best_fit
            best_chrom = gen_best[:]

        if (gen + 1) % 20 == 0:
            makespan, _ = hitung_makespan(best_chrom, jobs, machines)
            print(f"[CCEA] Gen {gen+1}/{n_iter} | Makespan: {makespan:.2f} menit")

    makespan, schedule = hitung_makespan(best_chrom, jobs, machines)
    print(f"[CCEA] Selesai! Makespan final: {makespan:.2f} menit")

    return {
        'makespan':   round(makespan, 2),
        'schedule':   schedule,
        'chromosome': best_chrom,
    }


if __name__ == '__main__':
    print("=" * 50)
    print("TEST CCEA")
    print("=" * 50)

    test_jobs = [
        {'job_id': 'J001', 'processing_time': 76,  'priority_score': 98.5},
        {'job_id': 'J002', 'processing_time': 55,  'priority_score': 60.1},
        {'job_id': 'J003', 'processing_time': 100, 'priority_score': 95.4},
        {'job_id': 'J004', 'processing_time': 30,  'priority_score': 45.0},
        {'job_id': 'J005', 'processing_time': 88,  'priority_score': 78.3},
        {'job_id': 'J006', 'processing_time': 45,  'priority_score': 55.2},
    ]

    test_machines = ['M01', 'M02', 'M03']

    result = run_ccea(test_jobs, test_machines)

    print(f"\nMakespan : {result['makespan']} menit")
    print(f"\nJadwal:")
    for s in result['schedule']:
        print(f"  {s['job_id']} → {s['machine_id']} | "
              f"{s['start_time']} - {s['end_time']} menit | "
              f"Prioritas: {s['priority_score']}")