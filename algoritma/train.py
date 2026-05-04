import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import json
import os

print("=" * 50)
print("TRAINING MODEL RANDOM FOREST REGRESSION")
print("=" * 50)

# ── 1. LOAD DATASET ──────────────────────────────────
df = pd.read_csv('dataset/data.csv')
print(f"\n✓ Dataset loaded: {df.shape[0]} baris, {df.shape[1]} kolom")
print(f"  Kolom: {list(df.columns)}")

# ── 2. CEK MISSING VALUES ─────────────────────────────
print(f"\n✓ Missing values:")
print(df.isnull().sum())

# ── 3. KONVERSI DATETIME ──────────────────────────────
datetime_cols = ['Scheduled_Start', 'Scheduled_End', 'Actual_Start', 'Actual_End']
for col in datetime_cols:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

print(f"\n✓ Datetime columns converted")

# ── 4. HITUNG ACTUAL DURATION DAN START OFFSET ───────
df_complete = df.dropna(subset=['Actual_Start', 'Actual_End']).copy()

df_complete['Actual_Duration'] = (
    df_complete['Actual_End'] - df_complete['Actual_Start']
).dt.total_seconds() / 60

df_complete['Start_Offset'] = (
    df_complete['Actual_Start'] - df_complete['Scheduled_Start']
).dt.total_seconds() / 60

df_complete['Scheduled_Duration'] = (
    df_complete['Scheduled_End'] - df_complete['Scheduled_Start']
).dt.total_seconds() / 60

df_complete['Scheduled_Start_num'] = df_complete['Scheduled_Start'].astype(np.int64) / 1e9

print(f"\n✓ Data lengkap (non-null): {len(df_complete)} baris")

# ── 5. ENCODE OPERATION TYPE ──────────────────────────
le = LabelEncoder()
df_complete['Operation_Type_enc'] = le.fit_transform(df_complete['Operation_Type'])
print(f"\n✓ Operation Type encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# ── 6. FEATURES DAN TARGET ────────────────────────────
features = [
    'Processing_Time',
    'Energy_Consumption',
    'Machine_Availability',
    'Operation_Type_enc',
    'Scheduled_Duration',
    'Scheduled_Start_num',
]

X = df_complete[features]
y_duration = df_complete['Actual_Duration']
y_offset   = df_complete['Start_Offset']

print(f"\n✓ Features: {features}")
print(f"  X shape: {X.shape}")

# ── 7. TRAIN MODEL DURATION ───────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y_duration, test_size=0.2, random_state=42)

model_duration = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
model_duration.fit(X_train, y_train)

y_pred     = model_duration.predict(X_test)
mae        = mean_absolute_error(y_test, y_pred)
rmse       = np.sqrt(mean_squared_error(y_test, y_pred))
r2         = r2_score(y_test, y_pred)

print(f"\n✓ Model Duration trained:")
print(f"  MAE  : {mae:.2f} menit")
print(f"  RMSE : {rmse:.2f} menit")
print(f"  R²   : {r2:.4f} ({r2*100:.1f}%)")

# ── 8. TRAIN MODEL OFFSET ─────────────────────────────
model_offset = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
model_offset.fit(X_train, y_offset[X_train.index])

print(f"\n✓ Model Offset trained")

# ── 9. SIMPAN MODEL ───────────────────────────────────
os.makedirs('models', exist_ok=True)

joblib.dump(model_duration, 'models/model_duration.pkl')
joblib.dump(model_offset,   'models/model_offset.pkl')
joblib.dump(le,             'models/label_encoder.pkl')

print(f"\n✓ Models saved to models/")

# ── 10. SIMPAN METADATA ───────────────────────────────
metadata = {
    'nama_model':  'Random Forest Regressor',
    'versi':       'v1.0',
    'mae':         round(mae, 4),
    'rmse':        round(rmse, 4),
    'r2_score':    round(r2, 4),
    'n_estimators': 100,
    'features':    features,
    'operation_types': list(le.classes_),
    'trained_at':  pd.Timestamp.now().isoformat(),
}

with open('models/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"\n✓ Metadata saved to models/metadata.json")
print(f"\n{'='*50}")
print(f"TRAINING SELESAI!")
print(f"  R² Score : {r2*100:.1f}%")
print(f"  MAE      : {mae:.2f} menit")
print(f"  RMSE     : {rmse:.2f} menit")
print(f"{'='*50}")