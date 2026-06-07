import pandas as pd
from fuzzy import DEFAULT_RULES, DEFAULT_MF, DEFAULT_BOBOT, hitung_prioritas

df = pd.read_csv("dataset/data_baru.csv")

# Bagi per himpunan berdasarkan batas MF
pt_rendah = df[df["Processing_Time"] <= 57]["Processing_Time"].mean()
pt_sedang = df[(df["Processing_Time"] > 57) & (df["Processing_Time"] <= 95)]["Processing_Time"].mean()
pt_tinggi = df[df["Processing_Time"] > 95]["Processing_Time"].mean()

ec_rendah = df[df["Energy_Consumption"] <= 6.33]["Energy_Consumption"].mean()
ec_sedang = df[(df["Energy_Consumption"] > 6.33) & (df["Energy_Consumption"] <= 10.66)]["Energy_Consumption"].mean()
ec_tinggi = df[df["Energy_Consumption"] > 10.66]["Energy_Consumption"].mean()

ma_rendah = df[df["Machine_Availability"] <= 86]["Machine_Availability"].mean()
ma_sedang = df[(df["Machine_Availability"] > 86) & (df["Machine_Availability"] <= 93)]["Machine_Availability"].mean()
ma_tinggi = df[df["Machine_Availability"] > 93]["Machine_Availability"].mean()

values = {
    "processing_time":      {"Rendah": pt_rendah, "Sedang": pt_sedang, "Tinggi": pt_tinggi},
    "energy_consumption":   {"Rendah": ec_rendah, "Sedang": ec_sedang, "Tinggi": ec_tinggi},
    "machine_availability": {"Rendah": ma_rendah, "Sedang": ma_sedang, "Tinggi": ma_tinggi},
}

print("=== Nilai representatif dari dataset ===")
for var, himpunan in values.items():
    for label, val in himpunan.items():
        print(f"  {var} {label}: {val:.2f}")

print("\n=== Hasil firing rules ===")
for pt_label, pt_val in values["processing_time"].items():
    for ec_label, ec_val in values["energy_consumption"].items():
        for ma_label, ma_val in values["machine_availability"].items():
            job = {
                "job_id":               f"{pt_label}-{ec_label}-{ma_label}",
                "processing_time":      pt_val,
                "energy_consumption":   ec_val,
                "machine_availability": ma_val,
                "operation_type":       "Lathe",
            }
            result = hitung_prioritas(job, DEFAULT_RULES, DEFAULT_BOBOT, DEFAULT_MF)
            print(f"PT={pt_label} EC={ec_label} MA={ma_label} → fired={result['fired_rules']} skor={result['skor_final']:.4f}")