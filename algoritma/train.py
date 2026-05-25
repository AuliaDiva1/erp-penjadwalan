import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import json
import os

print("=" * 60)
print("   TRAINING MODEL PREDIKSI DURASI (PRODUCTION READY)")
print("=" * 60)

# ── 1. LOAD DATASET ──────────────────────────────────
df = pd.read_csv('dataset/data_baru.csv')
print(f"\n✓ Dataset loaded: {df.shape[0]} baris")

# ── 2. PREPROCESSING & FEATURE ENGINEERING ───────────
# Konversi waktu
datetime_cols = ['Scheduled_Start', 'Actual_Start', 'Actual_End']
for col in datetime_cols:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

# Target: Actual Duration (Menit)
df['Actual_Duration'] = (df['Actual_End'] - df['Actual_Start']).dt.total_seconds() / 60

# Fitur Waktu: Jam dan Hari
df['Hour_of_Day'] = df['Scheduled_Start'].dt.hour
df['Day_of_Week'] = df['Scheduled_Start'].dt.dayofweek

# Encoding Tipe Operasi
le = LabelEncoder()
df['Operation_Type_enc'] = le.fit_transform(df['Operation_Type'])

print(f"✓ Feature engineering & encoding selesai.")

# ── 3. SELEKSI FITUR & TARGET ────────────────────────
features = [
    'Processing_Time', 
    'Energy_Consumption', 
    'Machine_Availability', 
    'Operation_Type_enc', 
    'Hour_of_Day', 
    'Day_of_Week'
]

X = df[features]
y = df['Actual_Duration']

# ── 4. SPLIT DATA & TRAINING (OPTIMIZED) ─────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Tuning: Membatasi kedalaman pohon untuk mencegah overfitting
model_duration = RandomForestRegressor(
    n_estimators=100, 
    max_depth=10,        # Mencegah model terlalu "hafal" data
    min_samples_leaf=5,   # Menjaga stabilitas prediksi
    random_state=42, 
    n_jobs=-1
)

model_duration.fit(X_train, y_train)

# ── 5. EVALUASI MODEL ────────────────────────────────
y_pred = model_duration.predict(X_test)
r2_train = r2_score(y_train, model_duration.predict(X_train))
r2_test  = r2_score(y_test, y_pred)
mae      = mean_absolute_error(y_test, y_pred)
mape     = (np.abs(y_test - y_pred) / y_test).mean() * 100

print(f"\n✓ Model Duration Evaluation:")
print(f"  - R² Train : {r2_train*100:.2f}%")
print(f"  - R² Test  : {r2_test*100:.2f}%")
print(f"  - MAE      : {mae:.2f} menit")
print(f"  - MAPE     : {mape:.2f}%")

# Cross Validation untuk memastikan kestabilan
cv_scores = cross_val_score(model_duration, X, y, cv=5, scoring='r2')
print(f"  - CV R² Avg: {cv_scores.mean()*100:.2f}% (± {cv_scores.std()*100:.2f}%)")

# ── 6. SIMPAN MODEL & METADATA ────────────────────────
os.makedirs('models', exist_ok=True)
joblib.dump(model_duration, 'models/model_duration.pkl')
joblib.dump(le,             'models/label_encoder.pkl')

metadata = {
    'model_info': {
        'name': 'Random Forest Duration Predictor',
        'features': features,
        'r2_score': round(r2_test, 4),
        'mae_minutes': round(mae, 2)
    },
    'trained_at': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')
}

with open('models/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)

print(f"\n✓ Models & Metadata saved successfully in /models/")
print("=" * 60)