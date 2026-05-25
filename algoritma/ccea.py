import logging
import random
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Konstanta
# ---------------------------------------------------------------------------

DEFAULT_POP_SIZE       = 50
DEFAULT_N_ITER         = 100
DEFAULT_CROSSOVER_RATE = 0.8
DEFAULT_MUTATION_RATE  = 0.1
DEFAULT_EARLY_STOP     = 20
MIN_SUBPOP_SIZE        = 10
MAX_N_SUBPOP           = 5
PRIORITY_FALLBACK      = 50.0
PRIORITY_WEIGHT        = 0.01
EPSILON                = 1e-9
LOG_INTERVAL           = 20

Chromosome = list[tuple[int, str]]

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class CCEAInputError(ValueError):
    """Input jobs/machines tidak valid."""

class CCEAConfigError(ValueError):
    """Config GA tidak valid."""

# ---------------------------------------------------------------------------
# Validasi
# ---------------------------------------------------------------------------

_REQUIRED_JOB_KEYS = {"job_id", "processing_time"}

def _validate_jobs(jobs: list[dict]) -> None:
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
            raise CCEAInputError(
                f"jobs[{i}]['processing_time'] harus angka positif, dapat: {pt!r}"
            )

def _validate_machines(machines: list[str]) -> None:
    if not isinstance(machines, list) or len(machines) == 0:
        raise CCEAInputError("'machines' harus list non-kosong.")
    if len(set(machines)) != len(machines):
        raise CCEAInputError("'machines' mengandung duplikat.")

def _validate_config(cfg: dict) -> dict:
    cleaned: dict[str, Any] = {}

    def _pos_int(key, default, min_val=1):
        val = cfg.get(key, default)
        try:
            val = int(val)
        except (TypeError, ValueError):
            raise CCEAConfigError(f"Config '{key}' harus integer, dapat: {val!r}")
        if val < min_val:
            raise CCEAConfigError(f"Config '{key}' minimal {min_val}, dapat: {val}")
        return val

    def _pos_float(key, default, min_val=0.0, max_val=1.0):
        val = cfg.get(key, default)
        try:
            val = float(val)
        except (TypeError, ValueError):
            raise CCEAConfigError(f"Config '{key}' harus float, dapat: {val!r}")
        if not (min_val <= val <= max_val):
            raise CCEAConfigError(
                f"Config '{key}' harus dalam [{min_val}, {max_val}], dapat: {val}"
            )
        return val

    cleaned["pop_size"]       = _pos_int("jumlah_populasi", DEFAULT_POP_SIZE, min_val=4)
    cleaned["n_iter"]         = _pos_int("jumlah_iterasi",  DEFAULT_N_ITER,   min_val=1)
    cleaned["crossover_rate"] = _pos_float("crossover_rate", DEFAULT_CROSSOVER_RATE)
    cleaned["mutation_rate"]  = _pos_float("mutation_rate",  DEFAULT_MUTATION_RATE)
    early_stop                = _pos_int("early_stop", DEFAULT_EARLY_STOP, min_val=1)
    cleaned["early_stop"]     = min(early_stop, cleaned["n_iter"])

    return cleaned

# ---------------------------------------------------------------------------
# Fitness Cache
# ---------------------------------------------------------------------------

@dataclass
class FitnessCache:
    _store: dict[tuple, float] = field(default_factory=dict)
    hits: int = 0
    misses: int = 0

    def get(self, key: tuple) -> float | None:
        # Pakai `in` agar nilai 0.0 tidak dianggap miss
        if key in self._store:
            self.hits += 1
            return self._store[key]
        self.misses += 1
        return None

    def set(self, key: tuple, val: float) -> None:
        self._store[key] = val

    def stats(self) -> str:
        total = self.hits + self.misses
        ratio = self.hits / total * 100 if total else 0
        return f"Cache hits: {self.hits}/{total} ({ratio:.1f}%)"

# ---------------------------------------------------------------------------
# Core algoritma
# ---------------------------------------------------------------------------

def hitung_makespan(
    chromosome: Chromosome,
    jobs: list[dict],
    machines: list[str],
) -> tuple[float, list[dict]]:
    machine_time   = {m: 0.0 for m in machines}
    job_ready_time = [0.0] * len(jobs)
    schedule: list[dict] = []

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


def _compute_fitness(
    chromosome: Chromosome,
    jobs: list[dict],
    machines: list[str],
    cache: FitnessCache,
) -> float:
    key    = tuple(chromosome)
    cached = cache.get(key)
    if cached is not None:
        return cached

    makespan, _ = hitung_makespan(chromosome, jobs, machines)

    # (i+1) agar posisi pertama tetap dihukum jika prioritas rendah
    priority_penalty = sum(
        (i + 1) * (100.0 - jobs[job_idx].get("priority_score", PRIORITY_FALLBACK))
        for i, (job_idx, _) in enumerate(chromosome)
    )

    result = 1.0 / (makespan + priority_penalty * PRIORITY_WEIGHT + EPSILON)
    cache.set(key, result)
    return result


def _inisialisasi_populasi(
    jobs: list[dict],
    machines: list[str],
    pop_size: int,
) -> list[Chromosome]:
    sorted_indices = sorted(
        range(len(jobs)),
        key=lambda i: jobs[i].get("priority_score", PRIORITY_FALLBACK),
        reverse=True,
    )
    populasi: list[Chromosome] = []
    for _ in range(pop_size):
        indices = sorted_indices[:]
        # Window shuffle lebih lebar agar populasi awal lebih beragam
        window = max(3, len(indices) // 4)
        for i in range(len(indices)):
            j = random.randint(i, min(i + window, len(indices) - 1))
            indices[i], indices[j] = indices[j], indices[i]
        chromosome: Chromosome = [
            (
                job_idx,
                random.choice(machines) if random.random() < 0.3
                else machines[rank % len(machines)],
            )
            for rank, job_idx in enumerate(indices)
        ]
        populasi.append(chromosome)
    return populasi


def _ox_crossover(
    order1: list[int],
    order2: list[int],
) -> tuple[list[int], list[int]]:
    n = len(order1)
    if n <= 1:
        return order1[:], order2[:]

    a, b = sorted(random.sample(range(n), 2))

    def _fill(donor: list[int], segment: list[int], seg_start: int, seg_end: int) -> list[int]:
        child  = [-1] * n
        child[seg_start:seg_end + 1] = segment
        in_seg = set(segment)
        donor_order = [x for x in donor if x not in in_seg]
        pos = (seg_end + 1) % n
        for val in donor_order:
            while child[pos] != -1:
                pos = (pos + 1) % n
            child[pos] = val
            pos = (pos + 1) % n
        return child

    child_order1 = _fill(order2, order1[a:b + 1], a, b)
    child_order2 = _fill(order1, order2[a:b + 1], a, b)
    return child_order1, child_order2


def _crossover(p1: Chromosome, p2: Chromosome, rate: float) -> tuple[Chromosome, Chromosome]:
    if random.random() > rate or len(p1) <= 1:
        return p1[:], p2[:]

    order_p1 = [job_idx for job_idx, _ in p1]
    order_p2 = [job_idx for job_idx, _ in p2]
    mach_p1  = [m for _, m in p1]
    mach_p2  = [m for _, m in p2]

    child_order1, child_order2 = _ox_crossover(order_p1, order_p2)

    point       = random.randint(1, len(p1) - 1)
    child_mach1 = mach_p1[:point] + mach_p2[point:]
    child_mach2 = mach_p2[:point] + mach_p1[point:]

    return list(zip(child_order1, child_mach1)), list(zip(child_order2, child_mach2))


def _mutasi(chromosome: Chromosome, machines: list[str], rate: float) -> Chromosome:
    hasil = chromosome[:]
    n     = len(hasil)

    for i in range(n):
        if random.random() < rate:
            hasil[i] = (hasil[i][0], random.choice(machines))

    if n > 1 and random.random() < rate:
        i, j     = random.sample(range(n), 2)
        ji, mi   = hasil[i]
        jj, mj   = hasil[j]
        hasil[i] = (jj, mi)
        hasil[j] = (ji, mj)

    return hasil


def _seleksi_turnamen(
    populasi: list[Chromosome],
    jobs: list[dict],
    machines: list[str],
    cache: FitnessCache,
    k: int = 3,
) -> Chromosome:
    kandidat = random.sample(populasi, min(k, len(populasi)))
    return max(kandidat, key=lambda c: _compute_fitness(c, jobs, machines, cache))


def _replace_worst(
    subpop: list[Chromosome],
    candidate: Chromosome,
    jobs: list[dict],
    machines: list[str],
    cache: FitnessCache,
) -> None:
    if candidate in subpop:
        return
    worst_idx = min(
        range(len(subpop)),
        key=lambda i: _compute_fitness(subpop[i], jobs, machines, cache),
    )
    subpop[worst_idx] = candidate


def _evolusi_subpopulasi(
    subpop: list[Chromosome],
    jobs: list[dict],
    machines: list[str],
    crossover_rate: float,
    mutation_rate: float,
    cache: FitnessCache,
) -> list[Chromosome]:
    new_subpop: list[Chromosome] = []
    while len(new_subpop) < len(subpop):
        p1     = _seleksi_turnamen(subpop, jobs, machines, cache)
        p2     = _seleksi_turnamen(subpop, jobs, machines, cache)
        c1, c2 = _crossover(p1, p2, crossover_rate)
        c1     = _mutasi(c1, machines, mutation_rate)
        c2     = _mutasi(c2, machines, mutation_rate)
        new_subpop.append(c1)
        if len(new_subpop) < len(subpop):
            new_subpop.append(c2)
    return new_subpop

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_ccea(
    jobs: list[dict],
    machines: list[str],
    config: dict | None = None,
) -> dict:
    _validate_jobs(jobs)
    _validate_machines(machines)
    cfg = _validate_config(config or {})

    if len(jobs) == 0:
        return {"makespan": 0.0, "schedule": [], "chromosome": [], "generasi": 0, "cache_stats": ""}

    if len(jobs) == 1:
        machine_id = machines[0]
        job        = jobs[0]
        pt         = float(job["processing_time"])
        return {
            "makespan": round(pt, 2),
            "schedule": [{
                "job_id":         job["job_id"],
                "machine_id":     machine_id,
                "start_time":     0.0,
                "end_time":       round(pt, 2),
                "duration":       pt,
                "priority_score": job.get("priority_score", PRIORITY_FALLBACK),
            }],
            "chromosome":  [(0, machine_id)],
            "generasi":    0,
            "cache_stats": "",
        }

    pop_size       = cfg["pop_size"]
    n_iter         = cfg["n_iter"]
    crossover_rate = cfg["crossover_rate"]
    mutation_rate  = cfg["mutation_rate"]
    early_stop_n   = cfg["early_stop"]

    # Guard: jangan buat terlalu banyak subpop jika jobs sedikit
    n_subpop = max(2, min(len(jobs) // 3, MAX_N_SUBPOP))
    if len(jobs) < n_subpop * 2:
        n_subpop = max(1, len(jobs) // 2)
    subpop_size = max(MIN_SUBPOP_SIZE, pop_size // n_subpop)

    logger.info(
        "[CCEA] Start | Jobs: %d | Machines: %d | Subpop: %d×%d | Iter: %d",
        len(jobs), len(machines), n_subpop, subpop_size, n_iter,
    )

    cache = FitnessCache()

    subpopulasi = [
        _inisialisasi_populasi(jobs, machines, subpop_size)
        for _ in range(n_subpop)
    ]

    semua_individu = [ind for subpop in subpopulasi for ind in subpop]
    best_chrom     = max(semua_individu, key=lambda c: _compute_fitness(c, jobs, machines, cache))
    best_fit       = _compute_fitness(best_chrom, jobs, machines, cache)
    no_improve     = 0
    gen_final      = 0

    for gen in range(n_iter):
        gen_final = gen + 1

        for i in range(n_subpop):
            subpopulasi[i] = _evolusi_subpopulasi(
                subpopulasi[i], jobs, machines, crossover_rate, mutation_rate, cache
            )
            _replace_worst(subpopulasi[i], best_chrom, jobs, machines, cache)

        representatif = [
            max(subpop, key=lambda c: _compute_fitness(c, jobs, machines, cache))
            for subpop in subpopulasi
        ]
        gen_best     = max(representatif, key=lambda c: _compute_fitness(c, jobs, machines, cache))
        gen_best_fit = _compute_fitness(gen_best, jobs, machines, cache)

        if gen_best_fit > best_fit:
            best_fit   = gen_best_fit
            best_chrom = gen_best[:]
            no_improve = 0
        else:
            no_improve += 1

        if gen_final % LOG_INTERVAL == 0:
            makespan, _ = hitung_makespan(best_chrom, jobs, machines)
            logger.debug(
                "[CCEA] Gen %d/%d | Makespan: %.2f | No improve: %d",
                gen_final, n_iter, makespan, no_improve,
            )

        if no_improve >= early_stop_n:
            logger.info(
                "[CCEA] Early stop gen %d (tidak ada perbaikan selama %d gen)",
                gen_final, early_stop_n,
            )
            break

    makespan, schedule = hitung_makespan(best_chrom, jobs, machines)

    job_ids_in_schedule = [s["job_id"] for s in schedule]
    expected_job_ids    = [j["job_id"] for j in jobs]
    if sorted(job_ids_in_schedule) != sorted(expected_job_ids):
        logger.error(
            "[CCEA] Integrity check GAGAL! Expected: %s | Got: %s",
            sorted(expected_job_ids), sorted(job_ids_in_schedule),
        )
    else:
        logger.info("[CCEA] Integrity check OK — semua job terjadwal tepat sekali.")

    logger.info(
        "[CCEA] Selesai | Gen: %d | Makespan: %.2f | %s",
        gen_final, makespan, cache.stats(),
    )

    return {
        "makespan":    round(makespan, 2),
        "schedule":    schedule,
        "chromosome":  best_chrom,
        "generasi":    gen_final,
        "cache_stats": cache.stats(),
    }

# ---------------------------------------------------------------------------
# CLI / smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import time
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    print("=" * 60)
    print("SMOKE TEST — CCEA Scheduler (Production)")
    print("=" * 60)

    test_jobs = [
        {"job_id": "J001", "processing_time": 76,  "priority_score": 98.5},
        {"job_id": "J002", "processing_time": 55,  "priority_score": 60.1},
        {"job_id": "J003", "processing_time": 100, "priority_score": 95.4},
        {"job_id": "J004", "processing_time": 30,  "priority_score": 45.0},
        {"job_id": "J005", "processing_time": 88,  "priority_score": 78.3},
        {"job_id": "J006", "processing_time": 45,  "priority_score": 55.2},
    ]
    test_machines = ["M01", "M02", "M03"]

    t0      = time.perf_counter()
    result  = run_ccea(test_jobs, test_machines)
    elapsed = time.perf_counter() - t0

    print(f"\nMakespan  : {result['makespan']} menit")
    print(f"Generasi  : {result['generasi']}")
    print(f"Cache     : {result['cache_stats']}")
    print(f"Waktu     : {elapsed:.3f} detik")
    print(f"\n{'Job':<8} {'Machine':<10} {'Start':>8} {'End':>8} {'Priority':>10}")
    print("-" * 50)
    for s in result["schedule"]:
        print(
            f"{s['job_id']:<8} {s['machine_id']:<10} "
            f"{s['start_time']:>8.1f} {s['end_time']:>8.1f} "
            f"{s['priority_score']:>10.1f}"
        )

    job_ids = [s["job_id"] for s in result["schedule"]]
    assert len(job_ids) == len(set(job_ids)), f"DUPLIKAT TERDETEKSI: {job_ids}"
    print("\n✓ Tidak ada duplikat job dalam schedule")

    print("\n--- Test 1 job ---")
    r1 = run_ccea(
        [{"job_id": "SOLO", "processing_time": 42, "priority_score": 80}],
        ["M01"]
    )
    print(f"Makespan: {r1['makespan']} (expected: 42.0)")
    assert r1["makespan"] == 42.0
    print("✓ OK")

    print("\n--- Test input tidak valid ---")
    try:
        run_ccea([{"job_id": "BAD", "processing_time": -5}], ["M01"])
    except CCEAInputError as e:
        print(f"✓ CCEAInputError: {e}")

    try:
        run_ccea(
            [{"job_id": "OK", "processing_time": 10}],
            ["M01"],
            config={"mutation_rate": 5.0},
        )
    except CCEAConfigError as e:
        print(f"✓ CCEAConfigError: {e}")

    print("\nSemua test selesai ✓")