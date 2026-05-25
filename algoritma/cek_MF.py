import pandas as pd

df = pd.read_csv("dataset/data_baru.csv")

print("=== Processing_Time ===")
print(f"min : {df['Processing_Time'].min()}")
print(f"p33 : {df['Processing_Time'].quantile(0.33)}")
print(f"p66 : {df['Processing_Time'].quantile(0.66)}")
print(f"max : {df['Processing_Time'].max()}")

print("\n=== Energy_Consumption ===")
print(f"min : {df['Energy_Consumption'].min()}")
print(f"p33 : {df['Energy_Consumption'].quantile(0.33)}")
print(f"p66 : {df['Energy_Consumption'].quantile(0.66)}")
print(f"max : {df['Energy_Consumption'].max()}")

print("\n=== Machine_Availability ===")
print(f"min : {df['Machine_Availability'].min()}")
print(f"p25 : {df['Machine_Availability'].quantile(0.25)}")
print(f"p50 : {df['Machine_Availability'].quantile(0.50)}")
print(f"p75 : {df['Machine_Availability'].quantile(0.75)}")
print(f"max : {df['Machine_Availability'].max()}")

# ── CEK BOBOT ─────────────────────────────────────────
print("\n=== Bobot Operation Type ===")
min_pct = None
hasil = {}
for op in sorted(df["Operation_Type"].unique()):
    subset = df[df["Operation_Type"] == op]
    pct = len(subset[subset["Job_Status"].isin(["Delayed", "Failed"])]) / len(subset) * 100
    hasil[op] = pct
    if min_pct is None or pct < min_pct:
        min_pct = pct

print(f"{'Operasi':<12} {'% Delayed/Failed':>18} {'Bobot':>8}")
print("-" * 42)
for op, pct in sorted(hasil.items(), key=lambda x: -x[1]):
    bobot = round(pct / min_pct, 2)
    print(f"{op:<12} {pct:>17.2f}% {bobot:>8.2f}")

# ── CEK MATERIAL_USED ─────────────────────────────────
print("\n=== Material_Used vs Actual_Duration ===")

df['Actual_Start'] = pd.to_datetime(df['Actual_Start'], errors='coerce')
df['Actual_End']   = pd.to_datetime(df['Actual_End'],   errors='coerce')
df['Actual_Duration'] = (df['Actual_End'] - df['Actual_Start']).dt.total_seconds() / 60

stats = (
    df.groupby('Material_Used')['Actual_Duration']
    .agg(count='count', mean='mean', std='std')
    .sort_values('mean', ascending=False)
)

overall_mean = df['Actual_Duration'].mean()
stats['selisih_vs_rata2'] = stats['mean'] - overall_mean
print(df['Material_Used'].dtype)
print(df['Material_Used'].unique()[:20])
print(df['Material_Used'].value_counts().head(10))
print(f"Rata-rata keseluruhan: {overall_mean:.2f} menit\n")
print(f"{'Material':<15} {'N':>6} {'Mean':>10} {'Std':>10} {'Selisih':>10}")
print("-" * 55)
for mat, row in stats.iterrows():
    print(f"{mat:<15} {int(row['count']):>6} {row['mean']:>10.2f} {row['std']:>10.2f} {row['selisih_vs_rata2']:>+10.2f}")

# Kesimpulan otomatis
max_selisih = stats['selisih_vs_rata2'].abs().max()
print(f"\nKesimpulan: ", end="")
if max_selisih > 10:
    print(f"selisih max {max_selisih:.1f} menit → Material_Used LAYAK ditambahkan sebagai fitur RF.")
else:
    print(f"selisih max {max_selisih:.1f} menit → Material_Used tidak signifikan, skip.")