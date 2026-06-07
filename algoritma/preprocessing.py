import logging
import os
import sys
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ✅ Absolute path
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH  = os.path.join(BASE_DIR, "dataset", "data.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "dataset", "data_baru.csv")

DATETIME_COLS = ["Scheduled_Start", "Scheduled_End", "Actual_Start", "Actual_End"]
NUMERIC_COLS  = ["Processing_Time", "Energy_Consumption", "Material_Used", "Machine_Availability"]

STATUS_FAILED    = "Failed"
STATUS_DELAYED   = "Delayed"
STATUS_COMPLETED = "Completed"


class PreprocessingError(RuntimeError):
    pass

class ValidationError(RuntimeError):
    pass


def _fix_job_status(row: pd.Series) -> str:
    if pd.isna(row["Actual_Start"]) or pd.isna(row["Actual_End"]):
        return STATUS_FAILED
    if row["Actual_End"] > row["Scheduled_End"]:
        return STATUS_DELAYED
    return STATUS_COMPLETED


def _validate_path(path: str) -> None:
    if not os.path.exists(path):
        raise PreprocessingError(f"File tidak ditemukan: '{path}'")
    if not path.endswith(".csv"):
        raise PreprocessingError(f"File harus berformat .csv: '{path}'")


def _validate_columns(df: pd.DataFrame) -> None:
    required = set(
        DATETIME_COLS + NUMERIC_COLS +
        ["Job_ID", "Machine_ID", "Operation_Type", "Job_Status", "Optimization_Category"]
    )
    missing = required - set(df.columns)
    if missing:
        raise PreprocessingError(f"Kolom wajib tidak ditemukan: {missing}")


def _impute_datetime_median_per_group(
    df: pd.DataFrame,
    mask_failed: pd.Series,
) -> pd.DataFrame:
    mask_not_failed = ~mask_failed

    for col in ["Actual_Start", "Actual_End"]:
        n_missing = df.loc[mask_not_failed, col].isna().sum()
        if n_missing == 0:
            logger.info("Tidak ada missing values di '%s' (non-Failed), skip.", col)
            continue

        df.loc[mask_not_failed, col] = (
            df.loc[mask_not_failed]
            .groupby("Operation_Type")[col]
            .transform(lambda x: x.fillna(x.dropna().quantile(0.5)))
        )

        n_remaining = df.loc[mask_not_failed, col].isna().sum()
        if n_remaining > 0:
            global_median = df.loc[mask_not_failed, col].dropna().quantile(0.5)
            df.loc[mask_not_failed, col] = df.loc[mask_not_failed, col].fillna(global_median)
            logger.info("'%s': %d median grup + %d median global", col, n_missing - n_remaining, n_remaining)
        else:
            logger.info("'%s': %d missing diisi median per grup", col, n_missing)

    return df


def _impute_numeric(df: pd.DataFrame) -> pd.DataFrame:
    """✅ Imputasi missing values di kolom numerik dengan median per Operation_Type"""
    for col in NUMERIC_COLS:
        n_missing = df[col].isna().sum()
        if n_missing == 0:
            continue
        df[col] = df.groupby("Operation_Type")[col].transform(
            lambda x: x.fillna(x.median())
        )
        n_remaining = df[col].isna().sum()
        if n_remaining > 0:
            df[col] = df[col].fillna(df[col].median())
        logger.info("'%s': %d missing diimputasi", col, n_missing)
    return df


def _run_validation_checks(df: pd.DataFrame) -> bool:
    all_ok = True

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
            "Failed tapi Actual_Start tidak NaN",  # ✅ hapus duplikat
            df[
                (df["Job_Status"] == STATUS_FAILED) &
                (df["Actual_Start"].notna())
            ],
        ),
        (
            "Failed tapi Actual_End tidak NaN",    # ✅ ganti duplikat dengan check berbeda
            df[
                (df["Job_Status"] == STATUS_FAILED) &
                (df["Actual_End"].notna())
            ],
        ),
    ]

    for label, subset in checks:
        ok     = len(subset) == 0
        status = "OK  " if ok else "FAIL"
        logger.info("[%s] %s: %d (harus 0)", status, label, len(subset))
        if not ok:
            all_ok = False

    for col in NUMERIC_COLS:
        n_neg  = (df[col] < 0).sum()
        ok     = n_neg == 0
        status = "OK  " if ok else "FAIL"
        logger.info("[%s] Nilai negatif di %-25s: %d (harus 0)", status, col, n_neg)
        if not ok:
            all_ok = False

    # ✅ Tambah check duplikat Job_ID
    n_dup = df["Job_ID"].duplicated().sum()
    ok    = n_dup == 0
    logger.info("[%s] Duplikat Job_ID: %d (harus 0)", "OK  " if ok else "WARN", n_dup)

    return all_ok


def run_preprocessing(
    input_path:  str = INPUT_PATH,
    output_path: str = OUTPUT_PATH,
) -> pd.DataFrame:
    logger.info("=" * 50)
    logger.info("DATA CLEANING & PREPROCESSING")
    logger.info("=" * 50)

    _validate_path(input_path)

    # ✅ Auto-detect separator (handle ";" dan ",")
    df = pd.read_csv(input_path, sep=None, engine='python')
    logger.info("Dataset loaded: %d baris, %d kolom", *df.shape)
    _validate_columns(df)

    # Konversi datetime
    for col in DATETIME_COLS:
        df[col] = pd.to_datetime(df[col], errors="coerce")
    logger.info("Datetime columns converted.")

    # Laporan missing values
    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if len(missing):
        logger.info("Missing values SEBELUM imputasi:")
        for col, val in missing.items():
            logger.info("  %s: %d (%.1f%%)", col, val, val / len(df) * 100)
    else:
        logger.info("Tidak ada missing values.")

    # Tandai Failed asli
    mask_originally_failed = df["Actual_Start"].isna()
    n_failed_asli = mask_originally_failed.sum()
    logger.info("Baris Failed asli: %d baris", n_failed_asli)

    # Imputasi datetime (non-Failed only)
    df = _impute_datetime_median_per_group(df, mask_originally_failed)

    # ✅ Imputasi numerik
    df = _impute_numeric(df)

    # Distribusi sebelum
    logger.info("Job_Status SEBELUM:\n%s", df["Job_Status"].value_counts().to_string())

    # Fix Job_Status
    df["Job_Status_baru"] = df.apply(_fix_job_status, axis=1)
    n_changed = (df["Job_Status"] != df["Job_Status_baru"]).sum()
    logger.info("Fix Job_Status: %d baris diubah", n_changed)

    detail = (
        df[df["Job_Status"] != df["Job_Status_baru"]]
        .groupby(["Job_Status", "Job_Status_baru"])
        .size()
    )
    for (lama, baru), cnt in detail.items():
        logger.info("  %s → %s: %d baris", lama, baru, cnt)

    df["Job_Status"] = df["Job_Status_baru"]
    df = df.drop(columns=["Job_Status_baru"])

    # Kembalikan Failed asli
    df.loc[mask_originally_failed, "Job_Status"]   = STATUS_FAILED
    df.loc[mask_originally_failed, "Actual_Start"] = pd.NaT
    df.loc[mask_originally_failed, "Actual_End"]   = pd.NaT
    logger.info("Baris Failed asli dikembalikan: %d baris", n_failed_asli)

    # Validasi
    logger.info("─" * 40)
    logger.info("VALIDASI HASIL CLEANING")
    logger.info("─" * 40)
    all_ok = _run_validation_checks(df)
    if not all_ok:
        raise ValidationError("Validasi gagal — periksa log di atas.")

    # Distribusi setelah
    logger.info("Job_Status SETELAH:\n%s", df["Job_Status"].value_counts().to_string())

    # ✅ Fix: NaT → None (bukan string "NaT") saat simpan ke CSV
    for col in DATETIME_COLS:
        df[col] = df[col].apply(
            lambda x: x.strftime("%Y-%m-%d %H:%M:%S") if pd.notna(x) else None
        )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    df.to_csv(output_path, index=False)

    logger.info("=" * 50)
    logger.info("CLEANING SELESAI!")
    logger.info("  Input  : %s", input_path)
    logger.info("  Output : %s", output_path)
    logger.info("  Shape  : %d baris, %d kolom", *df.shape)
    logger.info("=" * 50)

    return df


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Data cleaning & preprocessing pipeline.")
    parser.add_argument("--input",  default=INPUT_PATH,  help="Path CSV input")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Path CSV output")
    args = parser.parse_args()

    try:
        df = run_preprocessing(input_path=args.input, output_path=args.output)
        print(df["Operation_Type"].unique())
    except (PreprocessingError, ValidationError) as exc:
        logger.error("GAGAL: %s", exc)
        sys.exit(1)