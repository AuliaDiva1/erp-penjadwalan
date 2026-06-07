import logging
import random
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Konstanta — sesuai paper Yuan et al. (2025) Section 5.1
# ---------------------------------------------------------------------------
DEFAULT_POP_SIZE       = 100   # ✅ sesuai paper: population size 100
DEFAULT_N_ITER         = 1000  # ✅ sesuai paper: max iterations 1000
DEFAULT_CROSSOVER_RATE = 0.8   # ✅ sesuai paper: crossover probability 0.8
DEFAULT_MUTATION_RATE  = 0.2   # ✅ sesuai paper: mutation probability 0.2
DEFAULT_EARLY_STOP     = 50    # adaptasi tambahan
DEFAULT_DELTA          = 0.6   # ✅ sesuai paper: adaptive threshold 0.6
MIN_SUBPOP_SIZE        = 10
MAX_N_SUBPOP           = 5
PRIORITY_FALLBACK      = 50.0
PRIORITY_WEIGHT        = 0.01
EPSILON                = 1e-9
LOG_INTERVAL           = 20
ELITISM_RATE           = 0.2   # ✅ sesuai paper: 20% elitism

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

    cleaned["pop_size"]       = _pos_int("jumlah_populasi", DEFAULT_POP_SIZE,  min_val=4)
    cleaned["n_iter"]         = _pos_int("jumlah_iterasi",  DEFAULT_N_ITER,    min_val=1)
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
    hits:   int = 0
    misses: int = 0

    def get(self, key: tuple) -> float | None:
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
# SADS — Self-Adaptive Decomposition Strategy
# Sesuai Algorithm 2, Yuan et al. (2025)
# ---------------------------------------------------------------------------

@dataclass
class SubpopContribution:
    contributions: list[float] = field(default_factory=list)

    def init(self, n: int) -> None:
        """Inisialisasi kontribusi merata"""
        self.contributions = [1.0 / n] * n

    def update(self, idx: int, fb: float, fbi: float) -> None:
        """
        Formula 20 dari paper:
        FC_i ← 0.5 × FC_i + 0.5 × (fb - fbi) / fb
        """
        if abs(fb) < EPSILON:
            self.contributions[idx] = 0.0
        else:
            self.contributions[idx] = (
                0.5 * self.contributions[idx] +
                0.5 * (fb - fbi) / abs(fb)
            )

    def max_contribution(self) -> tuple[float, int]:
        max_val = max(self.contributions)
        max_idx = self.contributions.index(max_val)
        return max_val, max_idx

    def mean(self) -> float:
        return sum(self.contributions) / len(self.contributions)

# ---------------------------------------------------------------------------
# Core algoritma
# ---------------------------------------------------------------------------

def hitung_makespan(
    chromosome: Chromosome,
    jobs:       list[dict],
    machines:   list[str],
) -> tuple[float, list[dict]]:
    machine_time   = {m: 0.0 for m in machines}
    job_ready_time = [0.0] * len(jobs)
    schedule:      list[dict] = []

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
    jobs:       list[dict],
    machines:   list[str],
    cache:      FitnessCache,
) -> float:
    key    = tuple(chromosome)
    cached = cache.get(key)
    if cached is not None:
        return cached

    makespan, _ = hitung_makespan(chromosome, jobs, machines)

    priority_penalty = sum(
        (i + 1) * (100.0 - jobs[job_idx].get("priority_score", PRIORITY_FALLBACK))
        for i, (job_idx, _) in enumerate(chromosome)
    )

    result = 1.0 / (makespan + priority_penalty * PRIORITY_WEIGHT + EPSILON)
    cache.set(key, result)
    return result


def _inisialisasi_populasi(
    jobs:     list[dict],
    machines: list[str],
    pop_size: int,
) -> list[Chromosome]:
    """
    Inisialisasi berbasis prioritas — adaptasi dari Yuan et al. (2025)
    yang menggunakan priority-based encoding (Section 4.2.1)
    """
    sorted_indices = sorted(
        range(len(jobs)),
        key=lambda i: jobs[i].get("priority_score", PRIORITY_FALLBACK),
        reverse=True,
    )
    populasi: list[Chromosome] = []
    for _ in range(pop_size):
        indices = sorted_indices[:]
        window  = max(3, len(indices) // 4)
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
    """
    Order Crossover (OX) — Davis (1985)
    Dipilih karena terbukti efektif untuk job scheduling
    dan lebih stabil untuk skala data kecil-menengah.
    Referensi: Davis, L. (1985). Applying adaptive algorithms
    to epistatic domains. IJCAI, 85, 162-164.
    """
    n = len(order1)
    if n <= 1:
        return order1[:], order2[:]

    a, b = sorted(random.sample(range(n), 2))

    def _fill(donor: list[int], segment: list[int], seg_start: int, seg_end: int) -> list[int]:
        child       = [-1] * n
        child[seg_start:seg_end + 1] = segment
        in_seg      = set(segment)
        donor_order = [x for x in donor if x not in in_seg]
        pos         = (seg_end + 1) % n
        for val in donor_order:
            while child[pos] != -1:
                pos = (pos + 1) % n
            child[pos] = val
            pos = (pos + 1) % n
        return child

    child_order1 = _fill(order2, order1[a:b + 1], a, b)
    child_order2 = _fill(order1, order2[a:b + 1], a, b)
    return child_order1, child_order2


def _crossover(
    p1: Chromosome,
    p2: Chromosome,
    rate: float,
) -> tuple[Chromosome, Chromosome]:
    if random.random() > rate or len(p1) <= 1:
        return p1[:], p2[:]

    order_p1 = [job_idx for job_idx, _ in p1]
    order_p2 = [job_idx for job_idx, _ in p2]
    mach_p1  = [m for _, m in p1]
    mach_p2  = [m for _, m in p2]

    # Stage 1: OX untuk task sequencing
    child_order1, child_order2 = _ox_crossover(order_p1, order_p2)

    # Stage 2: single-point untuk machine allocation
    # Sesuai paper Section 4.2.2
    point       = random.randint(1, len(p1) - 1)
    child_mach1 = mach_p1[:point] + mach_p2[point:]
    child_mach2 = mach_p2[:point] + mach_p1[point:]

    return list(zip(child_order1, child_mach1)), list(zip(child_order2, child_mach2))


def _mutasi(
    chromosome: Chromosome,
    machines:   list[str],
    rate:       float,
) -> Chromosome:
    """
    Insertion mutation untuk task sequencing stage +
    displacement untuk machine allocation stage.
    Sesuai paper Section 4.2.2 (Yuan et al., 2025).
    """
    hasil = chromosome[:]
    n     = len(hasil)

    # Machine mutation (displacement)
    for i in range(n):
        if random.random() < rate:
            hasil[i] = (hasil[i][0], random.choice(machines))

    # Insertion mutation untuk job ordering
    if n > 1 and random.random() < rate:
        # Pilih elemen, insert ke posisi random
        src = random.randint(0, n - 1)
        dst = random.randint(0, n - 1)
        if src != dst:
            job_idx, machine = hasil.pop(src)
            hasil.insert(dst, (job_idx, machine))

    return hasil


def _seleksi_roulette(
    populasi:  list[Chromosome],
    jobs:      list[dict],
    machines:  list[str],
    cache:     FitnessCache,
) -> Chromosome:
    """
    Roulette wheel selection — sesuai paper Section 4.2.2
    Yuan et al. (2025): 80% offspring via roulette.
    """
    fitnesses = [_compute_fitness(c, jobs, machines, cache) for c in populasi]
    total     = sum(fitnesses)
    if total < EPSILON:
        return random.choice(populasi)

    pick       = random.uniform(0, total)
    cumulative = 0.0
    for chrom, fit in zip(populasi, fitnesses):
        cumulative += fit
        if cumulative >= pick:
            return chrom
    return populasi[-1]


def _evolusi_subpopulasi(
    subpop:         list[Chromosome],
    jobs:           list[dict],
    machines:       list[str],
    crossover_rate: float,
    mutation_rate:  float,
    cache:          FitnessCache,
) -> list[Chromosome]:
    """
    20% Elitism + 80% Roulette wheel selection.
    Sesuai paper Section 4.2.2 (Yuan et al., 2025):
    'This study uses a hybrid approach combining elite preservation
    and the roulette wheel model, where 20% of the offspring are
    obtained using elite preservation, and 80% are obtained using
    the roulette wheel model.'
    """
    n        = len(subpop)
    n_elite  = max(1, int(n * ELITISM_RATE))

    # Elitism: ambil 20% terbaik langsung
    ranked     = sorted(subpop, key=lambda c: _compute_fitness(c, jobs, machines, cache), reverse=True)
    new_subpop = ranked[:n_elite]

    # Roulette: generate 80% sisanya
    while len(new_subpop) < n:
        p1     = _seleksi_roulette(subpop, jobs, machines, cache)
        p2     = _seleksi_roulette(subpop, jobs, machines, cache)
        c1, c2 = _crossover(p1, p2, crossover_rate)
        c1     = _mutasi(c1, machines, mutation_rate)
        c2     = _mutasi(c2, machines, mutation_rate)
        new_subpop.append(c1)
        if len(new_subpop) < n:
            new_subpop.append(c2)

    return new_subpop[:n]


def _replace_worst(
    subpop:    list[Chromosome],
    candidate: Chromosome,
    jobs:      list[dict],
    machines:  list[str],
    cache:     FitnessCache,
) -> None:
    if candidate in subpop:
        return
    worst_idx = min(
        range(len(subpop)),
        key=lambda i: _compute_fitness(subpop[i], jobs, machines, cache),
    )
    subpop[worst_idx] = candidate


def _sads_step(
    subpopulasi:    list[list[Chromosome]],
    contrib:        SubpopContribution,
    delta:          float,
    jobs:           list[dict],
    machines:       list[str],
    crossover_rate: float,
    mutation_rate:  float,
    cache:          FitnessCache,
    best_chrom:     Chromosome,
    best_fit:       float,
) -> tuple[list[list[Chromosome]], float, Chromosome, float]:
    """
    Self-Adaptive Decomposition Strategy (SADS).
    Sesuai Algorithm 2, Yuan et al. (2025):

    - Single-group phase: fokus subpop kontribusi tertinggi
      (ketika maxVal >= delta)
    - Global phase: semua subpop coevolve
      (ketika maxVal < delta, update delta = Mean(FC))
    """
    max_val, max_idx = contrib.max_contribution()

    if max_val >= delta:
        # Single-group optimization — fokus subpop terbaik
        idx_list = [max_idx]
    else:
        # Global optimization — semua subpop + update delta
        delta    = contrib.mean()
        idx_list = list(range(len(subpopulasi)))

    for i in idx_list:
        subpopulasi[i] = _evolusi_subpopulasi(
            subpopulasi[i], jobs, machines,
            crossover_rate, mutation_rate, cache,
        )
        _replace_worst(subpopulasi[i], best_chrom, jobs, machines, cache)

        # Best di subpop i
        best_i     = max(subpopulasi[i], key=lambda c: _compute_fitness(c, jobs, machines, cache))
        best_fit_i = _compute_fitness(best_i, jobs, machines, cache)

        # Update kontribusi — Formula 20
        contrib.update(i, best_fit, best_fit_i)

        # Update global best
        if best_fit_i > best_fit:
            best_fit   = best_fit_i
            best_chrom = best_i[:]

    return subpopulasi, delta, best_chrom, best_fit


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_ccea(
    jobs:     list[dict],
    machines: list[str],
    config:   dict | None = None,
) -> dict:
    """
    Cooperative Co-Evolution Algorithm (CCEA) dengan SADS.

    Referensi utama:
    - Yuan, Y., Zhang, Q., & Wang, Y. (2025). A cooperative co-evolution
      algorithm for fuzzy prefabricated components production scheduling.
      Computers & Industrial Engineering, 210, 111543.

    Adaptasi:
    - OX Crossover menggantikan WMX (Davis, 1985) — lebih stabil
      untuk skala data kecil-menengah
    - Tournament digantikan Elitism+Roulette sesuai paper
    - Fitness function dimodifikasi dengan priority score dari
      Fuzzy Mamdani sebagai novelty penelitian ini
    - SADS diimplementasi sesuai Algorithm 2 paper
    """
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
            "makespan":    round(pt, 2),
            "schedule":    [{
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

    n_subpop = max(2, min(len(jobs) // 3, MAX_N_SUBPOP))
    if len(jobs) < n_subpop * 2:
        n_subpop = max(1, len(jobs) // 2)
    subpop_size = max(MIN_SUBPOP_SIZE, pop_size // n_subpop)

    # ✅ SADS init — delta=0.6 sesuai paper Section 5.1
    contrib = SubpopContribution()
    contrib.init(n_subpop)
    delta   = DEFAULT_DELTA

    logger.info(
        "[CCEA] Start | Jobs: %d | Machines: %d | Subpop: %d×%d | Iter: %d | Delta: %.1f",
        len(jobs), len(machines), n_subpop, subpop_size, n_iter, delta,
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

        # ✅ SADS step — Algorithm 2 Yuan et al. (2025)
        subpopulasi, delta, new_best_chrom, new_best_fit = _sads_step(
            subpopulasi, contrib, delta,
            jobs, machines,
            crossover_rate, mutation_rate,
            cache, best_chrom, best_fit,
        )

        if new_best_fit > best_fit:
            best_fit   = new_best_fit
            best_chrom = new_best_chrom
            no_improve = 0
        else:
            no_improve += 1

        if gen_final % LOG_INTERVAL == 0:
            makespan, _ = hitung_makespan(best_chrom, jobs, machines)
            logger.debug(
                "[CCEA] Gen %d/%d | Makespan: %.2f | Delta: %.4f | No improve: %d",
                gen_final, n_iter, makespan, delta, no_improve,
            )

        if no_improve >= early_stop_n:
            logger.info("[CCEA] Early stop gen %d (no improve %d gen)", gen_final, early_stop_n)
            break

    makespan, schedule = hitung_makespan(best_chrom, jobs, machines)

    job_ids_in_schedule = [s["job_id"] for s in schedule]
    expected_job_ids    = [j["job_id"] for j in jobs]
    if sorted(job_ids_in_schedule) != sorted(expected_job_ids):
        logger.error("[CCEA] Integrity check GAGAL!")
    else:
        logger.info("[CCEA] Integrity check OK — semua job terjadwal tepat sekali.")

    logger.info(
        "[CCEA] Selesai | Gen: %d | Makespan: %.2f | Delta: %.4f | %s",
        gen_final, makespan, delta, cache.stats(),
    )

    return {
        "makespan":    round(makespan, 2),
        "schedule":    schedule,
        "chromosome":  best_chrom,
        "generasi":    gen_final,
        "cache_stats": cache.stats(),
    }