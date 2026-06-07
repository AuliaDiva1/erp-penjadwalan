import json
import logging
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, classification_report,
    f1_score, confusion_matrix
)
from sklearn.model_selection import GridSearchCV, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH  = os.path.join(BASE_DIR, "dataset", "data_baru.csv")
MODELS_DIR    = os.path.join(BASE_DIR, "models")
MODEL_PATH    = os.path.join(MODELS_DIR, "model_status.pkl")
ENCODER_PATH  = os.path.join(MODELS_DIR, "label_encoder.pkl")
STATUS_ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder_status.pkl")
METADATA_PATH = os.path.join(MODELS_DIR, "metadata.json")

DATETIME_COLS = ["Scheduled_Start", "Scheduled_End", "Actual_Start", "Actual_End"]
NUMERIC_COLS  = ["Processing_Time", "Energy_Consumption", "Material_Used", "Machine_Availability"]

FEATURES = [
    "Processing_Time",
    "Energy_Consumption",
    "Machine_Availability",
    "Operation_Type_enc",
    "Hour_of_Day",
    "Day_of_Week",
]

TARGET       = "Job_Status"
TEST_SIZE    = 0.2
RANDOM_STATE = 42

# ✅ Lookup delay median per status — dari analisis data
DELAY_LOOKUP = {
    "Completed": -2.0,   # median Completed
    "Delayed":    5.0,   # median Delayed
    "Failed":     0.0,   # tidak diproses
}

PARAM_GRID = {
    "n_estimators":     [100, 200, 300],
    "max_depth":        [5, 10, 15, None],
    "min_samples_leaf": [1, 3, 5],
    "class_weight":     ["balanced", None],
}


class TrainingError(RuntimeError):
    pass


def load_dataset(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise TrainingError(f"Dataset tidak ditemukan: '{path}'")
    df = pd.read_csv(path, sep=None, engine='python')
    logger.info("Dataset loaded: %d baris, %d kolom", df.shape[0], df.shape[1])
    return df


def engineer_features(df: pd.DataFrame) -> tuple[pd.DataFrame, LabelEncoder, LabelEncoder]:
    for col in DATETIME_COLS:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Fitur waktu
    df["Hour_of_Day"] = df["Scheduled_Start"].dt.hour
    df["Day_of_Week"] = df["Scheduled_Start"].dt.dayofweek

    # Encoding operation type
    le_op = LabelEncoder()
    df["Operation_Type_enc"] = le_op.fit_transform(df["Operation_Type"].astype(str))

    # Encoding target status
    le_status = LabelEncoder()
    df["Job_Status_enc"] = le_status.fit_transform(df["Job_Status"].astype(str))

    logger.info("Distribusi target:\n%s", df["Job_Status"].value_counts().to_string())
    logger.info("Classes: %s", list(le_status.classes_))

    return df, le_op, le_status


def tune_hyperparameters(X_train, y_train) -> RandomForestClassifier:
    logger.info("GridSearchCV hyperparameter tuning...")
    base = RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1)
    gs   = GridSearchCV(
        estimator  = base,
        param_grid = PARAM_GRID,
        cv         = 5,
        scoring    = "f1_weighted",
        n_jobs     = -1,
        verbose    = 0,
    )
    gs.fit(X_train, y_train)
    logger.info("Best Params  : %s", gs.best_params_)
    logger.info("Best CV F1   : %.2f%%", gs.best_score_ * 100)
    return gs.best_estimator_


def evaluate_model(
    model, X_train, X_test, y_train, y_test,
    X_full, y_full, le_status
) -> dict:
    y_pred_train = model.predict(X_train)
    y_pred_test  = model.predict(X_test)

    acc_train = accuracy_score(y_train, y_pred_train)
    acc_test  = accuracy_score(y_test,  y_pred_test)
    f1_train  = f1_score(y_train, y_pred_train, average="weighted")
    f1_test   = f1_score(y_test,  y_pred_test,  average="weighted")

    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring="f1_weighted")

    logger.info("── Evaluasi Model ──────────────────────────")
    logger.info("  Accuracy Train : %.2f%%", acc_train * 100)
    logger.info("  Accuracy Test  : %.2f%%", acc_test  * 100)
    logger.info("  F1 Train       : %.2f%%", f1_train  * 100)
    logger.info("  F1 Test        : %.2f%%", f1_test   * 100)
    logger.info("  CV F1 Avg      : %.2f%% (± %.2f%%)",
                cv_scores.mean() * 100, cv_scores.std() * 100)
    logger.info("────────────────────────────────────────────")

    # Classification report
    report = classification_report(
        y_test, y_pred_test,
        target_names=le_status.classes_
    )
    logger.info("Classification Report:\n%s", report)

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred_test)
    logger.info("Confusion Matrix:\n%s", cm)

    if (acc_train - acc_test) > 0.10:
        logger.warning(
            "Indikasi overfitting: selisih Accuracy Train-Test %.2f%%",
            (acc_train - acc_test) * 100
        )

    return {
        "accuracy_train": round(acc_train,         4),
        "accuracy_test":  round(acc_test,          4),
        "f1_train":       round(f1_train,          4),
        "f1_test":        round(f1_test,           4),
        "cv_f1_mean":     round(cv_scores.mean(),  4),
        "cv_f1_std":      round(cv_scores.std(),   4),
        # Untuk kompatibilitas app.py
        "r2_score":       round(acc_test,          4),
        "mae":            round((1 - acc_test) * 100, 2),
    }


def log_feature_importance(model, features) -> None:
    importances = pd.Series(
        model.feature_importances_, index=features
    ).sort_values(ascending=False)
    logger.info("── Feature Importance ──────────────────────")
    for feat, score in importances.items():
        logger.info("  %-25s : %.4f (%.2f%%)", feat, score, score * 100)
    logger.info("────────────────────────────────────────────")


def save_artifacts(model, le_op, le_status, metrics) -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)

    joblib.dump(model,     MODEL_PATH)
    joblib.dump(le_op,     ENCODER_PATH)
    joblib.dump(le_status, STATUS_ENCODER_PATH)

    metadata = {
        "duration_model": {
            "r2_test":        metrics["accuracy_test"],
            "mae":            metrics["mae"],
            "accuracy_train": metrics["accuracy_train"],
            "accuracy_test":  metrics["accuracy_test"],
            "f1_train":       metrics["f1_train"],
            "f1_test":        metrics["f1_test"],
            "cv_f1_mean":     metrics["cv_f1_mean"],
            "cv_f1_std":      metrics["cv_f1_std"],
        },
        "r2_score":   metrics["accuracy_test"],
        "mae":        metrics["mae"],
        "nama_model": "Random Forest Job Status Classifier",
        "target":     TARGET,
        "features":   FEATURES,
        "classes":    list(le_status.classes_),
        "delay_lookup": DELAY_LOOKUP,
        "note": (
            "RF memprediksi status job (Completed/Delayed/Failed). "
            "Deadline dihitung dari predicted_status + DELAY_LOOKUP median. "
            "Actual_Duration = Processing_Time (dataset sintetis Kaggle)."
        ),
        "references": {
            "algorithm":  "Breiman (2001) DOI:10.1023/A:1010933404324",
            "tuning":     "Probst et al. (2019) DOI:10.1002/widm.1301",
            "context":    "Lingitz et al. (2018) DOI:10.1016/j.procir.2018.03.148",
            "scheduling": "Penchev et al. (2023) DOI:10.1016/j.heliyon.2023.e17485",
        },
        "trained_at": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=4)

    logger.info("Model         disimpan : %s", MODEL_PATH)
    logger.info("Encoder op    disimpan : %s", ENCODER_PATH)
    logger.info("Encoder status disimpan: %s", STATUS_ENCODER_PATH)
    logger.info("Metadata      disimpan : %s", METADATA_PATH)


def run_training() -> None:
    logger.info("=" * 60)
    logger.info("TRAINING MODEL RF — JOB STATUS CLASSIFIER")
    logger.info("=" * 60)

    df = load_dataset(DATASET_PATH)
    df, le_op, le_status = engineer_features(df)

    missing = [f for f in FEATURES if f not in df.columns]
    if missing:
        raise TrainingError(f"Fitur tidak ditemukan: {missing}")

    X = df[FEATURES]
    y = df["Job_Status_enc"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE,
        stratify=y  # ✅ stratified split agar distribusi kelas seimbang
    )
    logger.info("Split: %d train / %d test (stratified)", len(X_train), len(X_test))

    model   = tune_hyperparameters(X_train, y_train)
    log_feature_importance(model, FEATURES)
    metrics = evaluate_model(model, X_train, X_test, y_train, y_test, X, y, le_status)
    save_artifacts(model, le_op, le_status, metrics)

    logger.info("=" * 60)
    logger.info("TRAINING SELESAI.")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        run_training()
    except TrainingError as exc:
        logger.error("GAGAL: %s", exc)
        sys.exit(1)