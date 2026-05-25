"""
preprocessing.py
Membersihkan dataset Hybrid Manufacturing Production Data sebelum
digunakan sebagai input Fuzzy Mamdani dan CCEA.

Yang dilakukan:
    - Imputasi missing values Actual_Start & Actual_End dengan median per grup Operation_Type
    - Fix Job_Status berdasarkan data aktual (Actual_Start, Actual_End)
    - Validasi konsistensi data hasil cleaning

Jalankan sekali sebelum training model:
    python preprocessing.py
"""

import logging
import os
import sys
import pandas as pd

# ---------------------------------------------------------------------------
# Logging - mencatat semua aktivitas script ke terminal
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Konstanta
# ---------------------------------------------------------------------------
INPUT_PATH  = "dataset/data.csv"       # path dataset asli
OUTPUT_PATH = "dataset/data_baru.csv"  # path hasil cleaning

# Kolom yang perlu dikonversi ke datetime
DATETIME_COLS = ["Scheduled_Start", "Scheduled_End", "Actual_Start", "Actual_End"]

# Kolom numerik yang dicek nilai negatifnya
NUMERIC_COLS  = ["Processing_Time", "Energy_Consumption", "Material_Used", "Machine_Availability"]

# Nilai valid untuk kolom Job_Status
STATUS_FAILED    = "Failed"
STATUS_DELAYED   = "Delayed"
STATUS_COMPLETED = "Completed"


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class PreprocessingError(RuntimeError):
    """Dilempar jika terjadi error saat loading atau validasi awal."""

class ValidationError(RuntimeError):
    """Dilempar jika data hasil cleaning tidak konsisten."""


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _fix_job_status(row: pd.Series) -> str:
    """
    Menentukan Job_Status yang benar berdasarkan data aktual.

    Rules:
        - Actual_Start atau Actual_End kosong (NaN) → Failed
        - Actual_End lebih lambat dari Scheduled_End  → Delayed
        - Actual_End tepat waktu atau lebih cepat     → Completed
    """
    if pd.isna(row["Actual_Start"]) or pd.isna(row["Actual_End"]):
        return STATUS_FAILED
    if row["Actual_End"] > row["Scheduled_End"]:
        return STATUS_DELAYED
    return STATUS_COMPLETED


def _validate_path(path: str) -> None:
    """Memastikan file input ada dan berformat CSV."""
    if not os.path.exists(path):
        raise PreprocessingError(f"File tidak ditemukan: '{path}'")
    if not path.endswith(".csv"):
        raise PreprocessingError(f"File harus berformat .csv: '{path}'")


def _validate_columns(df: pd.DataFrame) -> None:
    """Memastikan semua kolom wajib tersedia di dataset."""
    required = set(
        DATETIME_COLS + NUMERIC_COLS +
        ["Job_ID", "Machine_ID", "Operation_Type", "Job_Status", "Optimization_Category"]
    )
    missing = required - set(df.columns)
    if missing:
        raise PreprocessingError(f"Kolom wajib tidak ditemukan: {missing}")


def _impute_datetime_median_per_group(df: pd.DataFrame) -> pd.DataFrame:
    """
    Mengisi missing values pada Actual_Start dan Actual_End
    menggunakan median per kelompok Operation_Type.

    Jika suatu grup masih memiliki NaN setelah imputasi per grup
    (misal semua baris di grup tersebut NaN), maka diisi dengan
    median global sebagai fallback.

    Metode ini dipilih karena:
        - Setiap Operation_Type memiliki pola waktu yang berbeda
        - Median lebih robust terhadap outlier dibanding mean
        - Imputasi per grup menghasilkan nilai yang lebih representatif
    """
    for col in ["Actual_Start", "Actual_End"]:
        n_missing_before = df[col].isna().sum()
        if n_missing_before == 0:
            logger.info("Tidak ada missing values di '%s', skip imputasi.", col)
            continue

        # Imputasi dengan median per grup Operation_Type
        df[col] = df.groupby("Operation_Type")[col].transform(
            lambda x: x.fillna(x.dropna().quantile(0.5))
        )

        # Fallback: isi sisa NaN (jika ada grup yang seluruhnya NaN) dengan median global
        n_missing_after = df[col].isna().sum()
        if n_missing_after > 0:
            global_median = df[col].dropna().quantile(0.5)
            df[col] = df[col].fillna(global_median)
            logger.info(
                "  '%s': %d baris diisi median per grup, %d sisa diisi median global (%s)",
                col, n_missing_before - n_missing_after, n_missing_after, global_median
            )
        else:
            logger.info(
                "  '%s': %d missing values diisi dengan median per grup Operation_Type.",
                col, n_missing_before
            )

    return df


def _run_validation_checks(df: pd.DataFrame) -> bool:
    """
    Memvalidasi konsistensi data setelah cleaning.
    Mengembalikan True jika semua validasi lulus, False jika ada yang gagal.

    Validasi yang dilakukan:
        - Completed tidak boleh punya Actual_End > Scheduled_End
        - Delayed harus punya Actual_End > Scheduled_End
        - Failed tidak boleh punya Actual_Start
        - Semua kolom numerik tidak boleh bernilai negatif
    """
    all_ok = True

    # Cek inkonsistensi status vs waktu aktual
    checks = [
        (
            "Completed tapi Actual_End > Scheduled_End",
            df[
                (df["Job_Status"] == STATUS_COMPLETED) &
                (df["Actual_End"] > df["Scheduled_End"])
            ],
        ),
        (
            "Delayed tapi Actual_End <= Scheduled_End",
            df[
                (df["Job_Status"] == STATUS_DELAYED) &
                (df["Actual_End"].notna()) &
                (df["Actual_End"] <= df["Scheduled_End"])
            ],
        ),
        (
            "Failed tapi Actual_Start tidak NaN",
            df[
                (df["Job_Status"] == STATUS_FAILED) &
                (df["Actual_Start"].notna())
            ],
        ),
    ]

    for label, subset in checks:
        ok = len(subset) == 0
        status = "OK  " if ok else "FAIL"
        logger.info("[%s] %s: %d (harus 0)", status, label, len(subset))
        if not ok:
            all_ok = False

    # Cek nilai negatif di kolom numerik
    for col in NUMERIC_COLS:
        n_neg  = (df[col] < 0).sum()
        ok     = n_neg == 0
        status = "OK  " if ok else "FAIL"
        logger.info("[%s] Nilai negatif di %-25s: %d (harus 0)", status, col, n_neg)
        if not ok:
            all_ok = False

    return all_ok


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def run_preprocessing(
    input_path:  str = INPUT_PATH,
    output_path: str = OUTPUT_PATH,
) -> pd.DataFrame:
    """
    Menjalankan full cleaning pipeline dari input CSV ke output CSV bersih.

    Args:
        input_path  : Path ke file CSV input (default: dataset/data.csv)
        output_path : Path ke file CSV output (default: dataset/data_baru.csv)

    Returns:
        DataFrame hasil cleaning yang sudah tersimpan ke output_path.

    Raises:
        PreprocessingError : Jika file tidak ditemukan atau kolom tidak lengkap.
        ValidationError    : Jika data hasil cleaning tidak konsisten.
    """
    logger.info("=" * 50)
    logger.info("DATA CLEANING & PREPROCESSING")
    logger.info("=" * 50)

    # 1. Validasi path
    _validate_path(input_path)

    # 2. Load dataset
    df = pd.read_csv(input_path)
    logger.info("Dataset loaded: %d baris, %d kolom", *df.shape)
    _validate_columns(df)

    # 3. Konversi kolom datetime dari string ke Timestamp
    for col in DATETIME_COLS:
        df[col] = pd.to_datetime(df[col], errors="coerce")
    logger.info("Datetime columns converted.")

    # 4. Laporan missing values sebelum imputasi
    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if len(missing):
        logger.info("Missing values SEBELUM imputasi:")
        for col, val in missing.items():
            logger.info("  %s: %d (%.1f%%)", col, val, val / len(df) * 100)
    else:
        logger.info("Tidak ada missing values.")

    # 4b. Imputasi missing values Actual_Start & Actual_End dengan median per grup
    logger.info("─" * 40)
    logger.info("IMPUTASI MISSING VALUES (Median per Operation_Type)")
    logger.info("─" * 40)
    df = _impute_datetime_median_per_group(df)

    # Konfirmasi tidak ada lagi missing values di kolom yang diimputasi
    missing_after = df[["Actual_Start", "Actual_End"]].isnull().sum()
    if missing_after.sum() == 0:
        logger.info("Imputasi berhasil: tidak ada missing values di Actual_Start & Actual_End.")
    else:
        logger.warning("Masih ada missing values setelah imputasi: %s", missing_after.to_dict())

    # 5. Distribusi sebelum cleaning
    logger.info(
        "Distribusi Job_Status SEBELUM:\n%s",
        df["Job_Status"].value_counts().to_string()
    )
    logger.info(
        "Distribusi Optimization_Category SEBELUM:\n%s",
        df["Optimization_Category"].value_counts().to_string()
    )

    # 6. Fix Job_Status berdasarkan Actual_Start dan Actual_End
    df["Job_Status_baru"] = df.apply(_fix_job_status, axis=1)
    n_changed = (df["Job_Status"] != df["Job_Status_baru"]).sum()
    logger.info("Fix Job_Status: %d baris diubah", n_changed)

    # Log detail perubahan status
    detail = (
        df[df["Job_Status"] != df["Job_Status_baru"]]
        .groupby(["Job_Status", "Job_Status_baru"])
        .size()
    )
    for (lama, baru), cnt in detail.items():
        logger.info("  %s → %s: %d baris", lama, baru, cnt)

    df["Job_Status"] = df["Job_Status_baru"]
    df = df.drop(columns=["Job_Status_baru"])

    # 7. Optimization_Category tidak diubah
    # Dataset asli sudah konsisten:
    # Completed/Delayed → Moderate Efficiency
    # Failed            → Low Efficiency
    logger.info("Optimization_Category dibiarkan sesuai dataset asli.")

    # 8. Validasi hasil cleaning
    logger.info("─" * 40)
    logger.info("VALIDASI HASIL CLEANING")
    logger.info("─" * 40)
    all_ok = _run_validation_checks(df)
    if not all_ok:
        raise ValidationError(
            "Validasi gagal — ada inkonsistensi di data hasil cleaning. "
            "Periksa log di atas."
        )

    # 9. Distribusi setelah cleaning
    logger.info(
        "Distribusi Job_Status SETELAH:\n%s",
        df["Job_Status"].value_counts().to_string()
    )
    logger.info(
        "Distribusi Optimization_Category SETELAH:\n%s",
        df["Optimization_Category"].value_counts().to_string()
    )

    # 10. Simpan ke CSV
    # Datetime dikonversi kembali ke string sebelum disimpan
    # NaN tetap sebagai NaN (bukan string kosong)
    for col in DATETIME_COLS:
        df[col] = df[col].dt.strftime("%Y-%m-%d %H:%M:%S")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    df.to_csv(output_path, index=False)

    logger.info("=" * 50)
    logger.info("CLEANING SELESAI!")
    logger.info("  Input  : %s", input_path)
    logger.info("  Output : %s", output_path)
    logger.info("  Shape  : %d baris, %d kolom", *df.shape)
    logger.info("=" * 50)

    return df


# ---------------------------------------------------------------------------
# CLI - jalankan langsung dari terminal
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Data cleaning & preprocessing pipeline.")
    parser.add_argument("--input",  default=INPUT_PATH,  help="Path CSV input")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Path CSV output")
    args = parser.parse_args()

    try:
        df = run_preprocessing(input_path=args.input, output_path=args.output)
        print(df["Operation_Type"].unique())  # ← taruh di sini, setelah run_preprocessing
    except (PreprocessingError, ValidationError) as exc:
        logger.error("GAGAL: %s", exc)
        sys.exit(1)
