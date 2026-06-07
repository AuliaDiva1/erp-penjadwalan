import pandas as pd

df = pd.read_csv("dataset/data_baru.csv")
df["Scheduled_Start"] = pd.to_datetime(df["Scheduled_Start"])
df["Scheduled_End"]   = pd.to_datetime(df["Scheduled_End"])
df["Actual_Start"]    = pd.to_datetime(df["Actual_Start"])
df["Actual_End"]      = pd.to_datetime(df["Actual_End"])

print("=== Processing_Time per Status ===")
print(df.groupby("Job_Status")["Processing_Time"].describe().round(2))

print("\n=== Machine_Availability per Status ===")
print(df.groupby("Job_Status")["Machine_Availability"].describe().round(2))

print("\n=== Energy_Consumption per Status ===")
print(df.groupby("Job_Status")["Energy_Consumption"].describe().round(2))

print("\n=== Material_Used per Status ===")
print(df.groupby("Job_Status")["Material_Used"].describe().round(2))

print("\n=== Operation_Type per Status ===")
print(pd.crosstab(df["Job_Status"], df["Operation_Type"]))

print("\n=== Machine_ID per Status ===")
print(pd.crosstab(df["Job_Status"], df["Machine_ID"]))