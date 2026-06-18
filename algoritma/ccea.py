import logging
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

DEFAULT_POP_SIZE       = 100
DEFAULT_N_ITER         = 1000
DEFAULT_CROSSOVER_RATE = 0.8
DEFAULT_MUTATION_RATE  = 0.2
DEFAULT_EARLY_STOP     = 50
DEFAULT_DELTA          = 0.6
MIN_SUBPOP_SIZE        = 10
MAX_N_SUBPOP           = 5
PRIORITY_FALLBACK      = 50.0
PRIORITY_WEIGHT        = 0.01
LOAD_BALANCE_WEIGHT    = 10.0
EPSILON                = 1e-9
LOG_INTERVAL           = 20
ELITISM_RATE           = 0.2

Chromosome = list[tuple[int, str]]

class CCEAInputError(ValueError): pass
class CCEAConfigError(ValueError): pass

_REQUIRED_JOB_KEYS = {"job_id", "processing_time"}


# ============================================================
# VALIDASI
# ============================================================

def _validate_jobs(jobs):
    if not isinstance(jobs, list):
        raise CCEAInputError("'jobs' harus list.")
    for i, job in enumerate(jobs):
        if not isinstance(job, dict):
            raise CCEAInputError(f"jobs[{i}] harus dict.")
        missing = _REQUIRED_JOB_KEYS - job.keys()
        if missing:
            raise CCEAInputError(f"jobs[{i}] kurang key: {missing}")
        pt = job["processing_time"]
        if not isinstance(pt, (int, float)) or pt <= 0:
            raise CCEAInputError(f"jobs[{i}]['processing_time'] tidak valid: {pt!r}")

def _validate_machines(machines):
    if not isinstance(machines, list) or len(machines) == 0:
        raise CCEAInputError("'machines' harus list non-kosong.")
    if len(set(machines)) != len(machines):
        raise CCEAInputError("'machines' mengandung duplikat.")

def _validate_config(cfg):
    cleaned = {}
    def _pos_int(key, default, min_val=1):
        val = cfg.get(key, default)
        try: val = int(val)
        except: raise CCEAConfigError(f"Config '{key}' harus integer.")
        if val < min_val: raise CCEAConfigError(f"Config '{key}' minimal {min_val}.")
        return val
    def _pos_float(key, default, min_val=0.0, max_val=1.0):
        val = cfg.get(key, default)
        try: val = float(val)
        except: raise CCEAConfigError(f"Config '{key}' harus float.")
        if not (min_val <= val <= max_val): raise CCEAConfigError(f"Config '{key}' harus [{min_val},{max_val}].")
        return val
    cleaned["pop_size"]       = _pos_int("jumlah_populasi", DEFAULT_POP_SIZE,  min_val=4)
    cleaned["n_iter"]         = _pos_int("jumlah_iterasi",  DEFAULT_N_ITER,    min_val=1)
    cleaned["crossover_rate"] = _pos_float("crossover_rate", DEFAULT_CROSSOVER_RATE)
    cleaned["mutation_rate"]  = _pos_float("mutation_rate",  DEFAULT_MUTATION_RATE)
    early_stop                = _pos_int("early_stop", DEFAULT_EARLY_STOP, min_val=1)
    cleaned["early_stop"]     = min(early_stop, cleaned["n_iter"])
    return cleaned


# ============================================================
# KALENDER HELPER
# ============================================================

def _parse_time(t_str):
    """'08:00' atau '08:00:00' → (hour, minute)"""
    parts = t_str.split(':')
    return int(parts[0]), int(parts[1])

def _is_workday(dt, kalender):
    """Cek apakah dt adalah hari kerja (bukan libur, bukan weekend)."""
    day_name = dt.strftime('%A')
    date_str = dt.strftime('%Y-%m-%d')
    if day_name not in kalender.get('work_days', []):
        return False
    if date_str in kalender.get('holidays', []):
        return False
    return True

def _get_work_start_dt(dt, kalender):
    """Datetime jam mulai kerja pada hari dt."""
    h, m = _parse_time(kalender.get('work_start', '08:00'))
    return dt.replace(hour=h, minute=m, second=0, microsecond=0)

def _get_work_end_dt(dt, kalender):
    """Datetime jam selesai kerja pada hari dt (pakai overtime per hari kalau aktif)."""
    day_name = dt.strftime('%A')  # "Monday", "Tuesday", dst
    ot = kalender.get('overtime_per_day', {}).get(day_name, {})
    if ot.get('enabled') and ot.get('overtime_end'):
        h, m = _parse_time(ot['overtime_end'])
    else:
        h, m = _parse_time(kalender.get('work_end', '17:00'))
    return dt.replace(hour=h, minute=m, second=0, microsecond=0)

def _advance_to_worktime(dt, kalender):
    """
    Geser dt ke slot kerja berikutnya kalau:
    - Bukan hari kerja / hari libur
    - Sebelum jam mulai kerja
    - Setelah/sama dengan jam selesai kerja
    """
    for _ in range(365):
        if not _is_workday(dt, kalender):
            dt = _get_work_start_dt(dt + timedelta(days=1), kalender)
            continue
        work_start = _get_work_start_dt(dt, kalender)
        work_end   = _get_work_end_dt(dt, kalender)
        if dt < work_start:
            dt = work_start
            continue
        if dt >= work_end:
            dt = _get_work_start_dt(dt + timedelta(days=1), kalender)
            continue
        break
    return dt

def _add_work_minutes(start_dt, menit, kalender):
    """
    Tambah `menit` menit kerja ke start_dt,
    skip jam non-kerja, weekend, dan hari libur.
    """
    remaining = float(menit)
    current   = _advance_to_worktime(start_dt, kalender)

    for _ in range(10000):
        if remaining <= 0:
            break
        if not _is_workday(current, kalender):
            current = _get_work_start_dt(current + timedelta(days=1), kalender)
            continue
        work_end           = _get_work_end_dt(current, kalender)
        menit_tersisa_hari = (work_end - current).total_seconds() / 60.0
        if remaining <= menit_tersisa_hari:
            current   = current + timedelta(minutes=remaining)
            remaining = 0
        else:
            remaining -= menit_tersisa_hari
            current    = _get_work_start_dt(current + timedelta(days=1), kalender)

    return current

def _ensure_fits_today(start_dt, menit, kalender):
    """
    Non-preemptive: kalau sisa jam kerja hari ini tidak cukup buat
    menyelesaikan job secara utuh, geser start ke awal hari kerja berikutnya.
    Kalau durasi job > satu hari kerja penuh (tidak ada pilihan), biarkan
    tetap mulai hari ini (akan dipecah oleh _add_work_minutes).
    """
    current = _advance_to_worktime(start_dt, kalender)
    logger.debug("[EFT] input=%s menit=%.1f → setelah advance=%s", start_dt, menit, current)

    for i in range(365):
        work_end           = _get_work_end_dt(current, kalender)
        work_start         = _get_work_start_dt(current, kalender)
        menit_sehari_penuh = (work_end - work_start).total_seconds() / 60.0
        menit_tersisa_hari = (work_end - current).total_seconds() / 60.0

        logger.debug(
            "[EFT] iter=%d | current=%s | tersisa=%.1f | durasi=%.1f | sehari=%.1f",
            i, current, menit_tersisa_hari, menit, menit_sehari_penuh,
        )

        # Job lebih panjang dari satu hari kerja penuh → terpaksa dipecah, biarkan
        if menit > menit_sehari_penuh:
            logger.debug("[EFT] → durasi > sehari, biarkan di %s", current)
            return current

        # Sisa hari ini cukup → mulai sekarang
        if menit <= menit_tersisa_hari:
            logger.debug("[EFT] → cukup, mulai di %s", current)
            return current

        # Tidak cukup → geser ke awal hari kerja berikutnya
        next_day = current + timedelta(days=1)
        current  = _advance_to_worktime(_get_work_start_dt(next_day, kalender), kalender)
        logger.debug("[EFT] → tidak cukup, geser ke %s", current)

    return current

def _parse_mro_datetime(mro_str):
    """Parse string datetime dari BE ke datetime object."""
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f'):
        try:
            return datetime.strptime(mro_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Format datetime tidak dikenali: {mro_str!r}")


# ============================================================
# FITNESS CACHE & SUBPOP CONTRIBUTION
# ============================================================

@dataclass
class FitnessCache:
    _store: dict = field(default_factory=dict)
    hits:   int  = 0
    misses: int  = 0
    def get(self, key):
        if key in self._store:
            self.hits += 1
            return self._store[key]
        self.misses += 1
        return None
    def set(self, key, val): self._store[key] = val
    def stats(self):
        total = self.hits + self.misses
        ratio = self.hits / total * 100 if total else 0
        return f"Cache hits: {self.hits}/{total} ({ratio:.1f}%)"

@dataclass
class SubpopContribution:
    contributions: list = field(default_factory=list)
    def init(self, n): self.contributions = [1.0 / n] * n
    def update(self, idx, fb, fbi):
        if abs(fb) < EPSILON: self.contributions[idx] = 0.0
        else: self.contributions[idx] = 0.5 * self.contributions[idx] + 0.5 * (fb - fbi) / abs(fb)
    def max_contribution(self):
        max_val = max(self.contributions)
        return max_val, self.contributions.index(max_val)
    def mean(self): return sum(self.contributions) / len(self.contributions)


# ============================================================
# HITUNG MAKESPAN (float — untuk fitness/evolusi)
# ============================================================

def hitung_makespan(chromosome, jobs, machines, mro=None):
    """
    Versi float — dipakai internal CCEA untuk evolusi (cepat).
    mro: dict {machine_id: float menit} — offset mesin busy.
    Output start_time/end_time dalam menit float.
    """
    machine_time   = {m: float(mro.get(m, 0.0)) if mro else 0.0 for m in machines}
    job_ready_time = [0.0] * len(jobs)
    schedule       = []
    for job_idx, machine_id in chromosome:
        job        = jobs[job_idx]
        start_time = max(machine_time[machine_id], job_ready_time[job_idx])
        end_time   = start_time + float(job["processing_time"])
        machine_time[machine_id] = end_time
        job_ready_time[job_idx]  = end_time
        schedule.append({
            "job_id":         job["job_id"],
            "machine_id":     machine_id,
            "start_time":     round(start_time, 2),
            "end_time":       round(end_time, 2),
            "duration":       job["processing_time"],
            "priority_score": job.get("priority_score", PRIORITY_FALLBACK),
        })
    makespan = max(machine_time.values()) if machine_time else 0.0
    return makespan, schedule


# ============================================================
# HITUNG MAKESPAN CALENDAR (datetime — untuk output final)
# ============================================================

def hitung_makespan_calendar(chromosome, jobs, machines, mro_dt=None, kalender=None, pipeline_start=None):
    """
    Versi datetime + kalender — dipakai HANYA untuk output schedule final.
    mro_dt: dict {machine_id: "YYYY-MM-DD HH:MM:SS"} dari BE (machine_busy_until).
    kalender: dict config work_calendar dari BE.
    pipeline_start: datetime titik awal (default: sekarang WIB).
    Output start_time/end_time dalam string "YYYY-MM-DD HH:MM:SS".
    """
    now = pipeline_start or datetime.now()

    machine_time = {}
    for m in machines:
        if mro_dt and m in mro_dt and mro_dt[m]:
            try:
                machine_time[m] = _parse_mro_datetime(mro_dt[m])
            except Exception:
                machine_time[m] = now
        else:
            machine_time[m] = now

    if kalender:
        for m in machines:
            machine_time[m] = _advance_to_worktime(machine_time[m], kalender)

    job_ready_time = [now] * len(jobs)
    schedule       = []

    for job_idx, machine_id in chromosome:
        job = jobs[job_idx]
        pt  = float(job['processing_time'])

        raw_start = max(machine_time[machine_id], job_ready_time[job_idx])

        if kalender:
            # NON-PREEMPTIVE: geser start ke besok kalau sisa hari ini tidak cukup
            start_dt = _ensure_fits_today(raw_start, pt, kalender)
            end_dt   = _add_work_minutes(start_dt, pt, kalender)
        else:
            start_dt = raw_start
            end_dt   = start_dt + timedelta(minutes=pt)

        machine_time[machine_id] = end_dt
        job_ready_time[job_idx]  = end_dt

        schedule.append({
            "job_id":              job["job_id"],
            "assigned_machine_id": machine_id,
            "scheduled_start":     start_dt.strftime('%Y-%m-%d %H:%M:%S'),
            "scheduled_end":       end_dt.strftime('%Y-%m-%d %H:%M:%S'),
            "duration_menit":      pt,
            "priority_score":      job.get("priority_score", PRIORITY_FALLBACK),
        })

    if schedule:
        last_end = max(
            datetime.strptime(s["scheduled_end"], '%Y-%m-%d %H:%M:%S')
            for s in schedule
        )
        makespan_menit = (last_end - now).total_seconds() / 60.0
    else:
        makespan_menit = 0.0

    return round(makespan_menit, 2), schedule


# ============================================================
# FITNESS
# ============================================================

def _compute_fitness(chromosome, jobs, machines, cache, mro=None):
    key    = tuple(chromosome)
    cached = cache.get(key)
    if cached is not None: return cached

    makespan, _ = hitung_makespan(chromosome, jobs, machines, mro)

    priority_penalty = sum(
        (i + 1) * (100.0 - jobs[job_idx].get("priority_score", PRIORITY_FALLBACK))
        for i, (job_idx, _) in enumerate(chromosome)
    )

    machine_loads = {}
    for job_idx, machine_id in chromosome:
        pt = float(jobs[job_idx]["processing_time"])
        machine_loads[machine_id] = machine_loads.get(machine_id, 0.0) + pt

    used_machines  = len(machine_loads)
    total_machines = len(machines)

    if used_machines == 1 and total_machines > 1:
        load_imbalance = sum(float(j["processing_time"]) for j in jobs) * total_machines
    elif used_machines > 1:
        loads             = list(machine_loads.values())
        avg               = sum(loads) / len(loads)
        load_imbalance    = sum(abs(l - avg) for l in loads) / len(loads)
        utilization_bonus = used_machines / total_machines
        load_imbalance   /= (utilization_bonus + EPSILON)
    else:
        load_imbalance = 0.0

    busy_penalty = 0.0
    if mro:
        for _, machine_id in chromosome:
            busy_penalty += mro.get(machine_id, 0.0)

    result = 1.0 / (
        makespan
        + priority_penalty * PRIORITY_WEIGHT
        + load_imbalance   * LOAD_BALANCE_WEIGHT
        + busy_penalty     * 0.5
        + EPSILON
    )
    cache.set(key, result)
    return result


# ============================================================
# INISIALISASI POPULASI
# ============================================================

def _inisialisasi_populasi(jobs, machines, pop_size, mro=None):
    sorted_indices  = sorted(
        range(len(jobs)),
        key=lambda i: jobs[i].get("priority_score", PRIORITY_FALLBACK),
        reverse=True,
    )
    sorted_machines = sorted(machines, key=lambda m: (mro or {}).get(m, 0.0))

    populasi = []
    for _ in range(pop_size):
        indices = sorted_indices[:]
        window  = max(3, len(indices) // 4)
        for i in range(len(indices)):
            j = random.randint(i, min(i + window, len(indices) - 1))
            indices[i], indices[j] = indices[j], indices[i]

        chromosome = []
        for rank, job_idx in enumerate(indices):
            if random.random() < 0.7:
                top_free = max(1, len(sorted_machines) // 3)
                machine  = random.choice(sorted_machines[:top_free])
            else:
                machine = random.choice(machines)
            chromosome.append((job_idx, machine))
        populasi.append(chromosome)
    return populasi


# ============================================================
# GENETIK OPERATOR
# ============================================================

def _ox_crossover(order1, order2):
    n = len(order1)
    if n <= 1: return order1[:], order2[:]
    a, b = sorted(random.sample(range(n), 2))
    def _fill(donor, segment, seg_start, seg_end):
        child = [-1] * n
        child[seg_start:seg_end + 1] = segment
        in_seg      = set(segment)
        donor_order = [x for x in donor if x not in in_seg]
        pos = (seg_end + 1) % n
        for val in donor_order:
            while child[pos] != -1: pos = (pos + 1) % n
            child[pos] = val
            pos = (pos + 1) % n
        return child
    return _fill(order2, order1[a:b+1], a, b), _fill(order1, order2[a:b+1], a, b)

def _crossover(p1, p2, rate):
    if random.random() > rate or len(p1) <= 1: return p1[:], p2[:]
    order_p1 = [j for j, _ in p1]; order_p2 = [j for j, _ in p2]
    mach_p1  = [m for _, m in p1]; mach_p2  = [m for _, m in p2]
    child_order1, child_order2 = _ox_crossover(order_p1, order_p2)
    point = random.randint(1, len(p1) - 1)
    return (list(zip(child_order1, mach_p1[:point] + mach_p2[point:])),
            list(zip(child_order2, mach_p2[:point] + mach_p1[point:])))

def _mutasi(chromosome, machines, rate):
    hasil = chromosome[:]
    n     = len(hasil)
    for i in range(n):
        if random.random() < rate:
            hasil[i] = (hasil[i][0], random.choice(machines))
    if n > 1 and random.random() < rate:
        src = random.randint(0, n - 1)
        dst = random.randint(0, n - 1)
        if src != dst:
            job_idx, machine = hasil.pop(src)
            hasil.insert(dst, (job_idx, machine))
    return hasil

def _seleksi_roulette(populasi, jobs, machines, cache, mro=None):
    fitnesses = [_compute_fitness(c, jobs, machines, cache, mro) for c in populasi]
    total = sum(fitnesses)
    if total < EPSILON: return random.choice(populasi)
    pick = random.uniform(0, total)
    cumulative = 0.0
    for chrom, fit in zip(populasi, fitnesses):
        cumulative += fit
        if cumulative >= pick: return chrom
    return populasi[-1]

def _evolusi_subpopulasi(subpop, jobs, machines, crossover_rate, mutation_rate, cache, mro=None):
    n       = len(subpop)
    n_elite = max(1, int(n * ELITISM_RATE))
    ranked     = sorted(subpop, key=lambda c: _compute_fitness(c, jobs, machines, cache, mro), reverse=True)
    new_subpop = ranked[:n_elite]
    while len(new_subpop) < n:
        p1     = _seleksi_roulette(subpop, jobs, machines, cache, mro)
        p2     = _seleksi_roulette(subpop, jobs, machines, cache, mro)
        c1, c2 = _crossover(p1, p2, crossover_rate)
        c1     = _mutasi(c1, machines, mutation_rate)
        c2     = _mutasi(c2, machines, mutation_rate)
        new_subpop.append(c1)
        if len(new_subpop) < n: new_subpop.append(c2)
    return new_subpop[:n]

def _replace_worst(subpop, candidate, jobs, machines, cache, mro=None):
    if candidate in subpop: return
    worst_idx = min(range(len(subpop)), key=lambda i: _compute_fitness(subpop[i], jobs, machines, cache, mro))
    subpop[worst_idx] = candidate

def _sads_step(subpopulasi, contrib, delta, jobs, machines, crossover_rate, mutation_rate, cache, best_chrom, best_fit, mro=None):
    max_val, max_idx = contrib.max_contribution()
    if max_val >= delta:
        idx_list = [max_idx]
    else:
        delta    = contrib.mean()
        idx_list = list(range(len(subpopulasi)))

    for i in idx_list:
        subpopulasi[i] = _evolusi_subpopulasi(subpopulasi[i], jobs, machines, crossover_rate, mutation_rate, cache, mro)
        _replace_worst(subpopulasi[i], best_chrom, jobs, machines, cache, mro)
        best_i     = max(subpopulasi[i], key=lambda c: _compute_fitness(c, jobs, machines, cache, mro))
        best_fit_i = _compute_fitness(best_i, jobs, machines, cache, mro)
        contrib.update(i, best_fit, best_fit_i)
        if best_fit_i > best_fit:
            best_fit   = best_fit_i
            best_chrom = best_i[:]

    return subpopulasi, delta, best_chrom, best_fit


# ============================================================
# RUN CCEA
# ============================================================

def run_ccea(jobs, machines, config=None, machine_ready_offset=None, kalender=None, pipeline_start=None):
    _validate_jobs(jobs)
    _validate_machines(machines)
    cfg = _validate_config(config or {})

    now = datetime.now()
    if pipeline_start:
        try:
            now = _parse_mro_datetime(pipeline_start)
        except Exception:
            logger.warning("[CCEA] pipeline_start tidak bisa diparse, pakai datetime.now()")

    mro_dt    = machine_ready_offset or {}
    mro_float = {}
    for m in machines:
        if m in mro_dt and mro_dt[m]:
            try:
                dt_busy = _parse_mro_datetime(mro_dt[m])
                delta_menit = (dt_busy - now).total_seconds() / 60.0
                mro_float[m] = max(0.0, delta_menit)
            except Exception:
                mro_float[m] = 0.0
        else:
            mro_float[m] = 0.0

    if len(jobs) == 0:
        return {"makespan": 0.0, "schedule": [], "chromosome": [], "generasi": 0, "cache_stats": ""}

    if len(jobs) == 1:
        job        = jobs[0]
        pt         = float(job["processing_time"])
        machine_id = min(machines, key=lambda m: mro_float.get(m, 0.0))

        if kalender:
            raw_start = now
            if machine_id in mro_dt and mro_dt[machine_id]:
                try:
                    raw_start = _parse_mro_datetime(mro_dt[machine_id])
                except Exception:
                    raw_start = now
            start_dt = _ensure_fits_today(raw_start, pt, kalender)
            end_dt   = _add_work_minutes(start_dt, pt, kalender)
            makespan = (end_dt - now).total_seconds() / 60.0
            schedule_item = {
                "job_id":              job["job_id"],
                "assigned_machine_id": machine_id,
                "scheduled_start":     start_dt.strftime('%Y-%m-%d %H:%M:%S'),
                "scheduled_end":       end_dt.strftime('%Y-%m-%d %H:%M:%S'),
                "duration_menit":      pt,
                "priority_score":      job.get("priority_score", PRIORITY_FALLBACK),
            }
        else:
            start_float = mro_float.get(machine_id, 0.0)
            end_float   = start_float + pt
            makespan    = end_float
            start_dt    = now + timedelta(minutes=start_float)
            end_dt      = now + timedelta(minutes=end_float)
            schedule_item = {
                "job_id":              job["job_id"],
                "assigned_machine_id": machine_id,
                "scheduled_start":     start_dt.strftime('%Y-%m-%d %H:%M:%S'),
                "scheduled_end":       end_dt.strftime('%Y-%m-%d %H:%M:%S'),
                "duration_menit":      pt,
                "priority_score":      job.get("priority_score", PRIORITY_FALLBACK),
            }

        return {
            "makespan":    round(makespan, 2),
            "schedule":    [schedule_item],
            "chromosome":  [(0, machine_id)],
            "generasi":    0,
            "cache_stats": "",
        }

    pop_size       = cfg["pop_size"]
    n_iter         = cfg["n_iter"]
    crossover_rate = cfg["crossover_rate"]
    mutation_rate  = cfg["mutation_rate"]
    early_stop_n   = cfg["early_stop"]

    n_subpop = max(2, min(len(jobs) // 3, MAX_N_SUBPOP))
    if len(jobs) < n_subpop * 2: n_subpop = max(1, len(jobs) // 2)
    subpop_size = max(MIN_SUBPOP_SIZE, pop_size // n_subpop)

    contrib = SubpopContribution()
    contrib.init(n_subpop)
    delta = DEFAULT_DELTA

    logger.info("[CCEA] Start | Jobs: %d | Machines: %d | Subpop: %d×%d | MRO float: %s",
                len(jobs), len(machines), n_subpop, subpop_size, mro_float)

    cache       = FitnessCache()
    subpopulasi = [_inisialisasi_populasi(jobs, machines, subpop_size, mro_float) for _ in range(n_subpop)]

    semua_individu = [ind for subpop in subpopulasi for ind in subpop]
    best_chrom     = max(semua_individu, key=lambda c: _compute_fitness(c, jobs, machines, cache, mro_float))
    best_fit       = _compute_fitness(best_chrom, jobs, machines, cache, mro_float)
    no_improve     = 0
    gen_final      = 0

    for gen in range(n_iter):
        gen_final = gen + 1
        subpopulasi, delta, new_best_chrom, new_best_fit = _sads_step(
            subpopulasi, contrib, delta, jobs, machines,
            crossover_rate, mutation_rate, cache, best_chrom, best_fit, mro_float,
        )
        if new_best_fit > best_fit:
            best_fit   = new_best_fit
            best_chrom = new_best_chrom
            no_improve = 0
        else:
            no_improve += 1

        if gen_final % LOG_INTERVAL == 0:
            makespan_log, _ = hitung_makespan(best_chrom, jobs, machines, mro_float)
            logger.debug("[CCEA] Gen %d | Makespan: %.2f | No improve: %d", gen_final, makespan_log, no_improve)

        if no_improve >= early_stop_n:
            logger.info("[CCEA] Early stop gen %d", gen_final)
            break

    makespan, schedule = hitung_makespan_calendar(
        best_chrom, jobs, machines,
        mro_dt=mro_dt,
        kalender=kalender,
        pipeline_start=now,
    )

    job_ids_in_schedule = [s["job_id"] for s in schedule]
    expected_job_ids    = [j["job_id"] for j in jobs]
    if sorted(job_ids_in_schedule) != sorted(expected_job_ids):
        logger.error("[CCEA] Integrity check GAGAL!")
    else:
        logger.info("[CCEA] Integrity check OK")

    logger.info("[CCEA] Selesai | Gen: %d | Makespan: %.2f | %s", gen_final, makespan, cache.stats())

    return {
        "makespan":    round(makespan, 2),
        "schedule":    schedule,
        "chromosome":  best_chrom,
        "generasi":    gen_final,
        "cache_stats": cache.stats(),
    }