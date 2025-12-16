import pandas as pd

try:
    df = pd.read_excel("Efetivo_28102025.xlsx")
    print("Columns:", df.columns.tolist())
    print("First 5 rows:")
    print(df.head().to_string())
except Exception as e:
    print(f"Error: {e}")




