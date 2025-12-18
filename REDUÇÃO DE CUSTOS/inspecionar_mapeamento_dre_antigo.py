"""
Inspeção de termos no DRE antigo (JAN - SET 2025.xlsx) para apoiar o mapeamento
para o plano de contas (Nov/Dez 2025).
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
ARQ_ANTIGO = BASE_DIR / "JAN - SET 2025.xlsx"
ABA_ANTIGO = "Export"

MESES = [202502, 202503, 202504, 202505, 202506, 202507]


def main() -> None:
    df = pd.read_excel(ARQ_ANTIGO, sheet_name=ABA_ANTIGO, header=[0, 1])
    col_grp = df.columns[0]
    col_conta = df.columns[1]

    s = df[col_conta].astype(str)

    termos = [
        ("PAT", "PAT"),
        ("Assistência/Plano de saúde", "Assist"),
        ("Vale Transporte", "Vale Transporte"),
        ("13º", "13"),
        ("Salários", "Sal"),
        ("FGTS", "FGTS"),
        ("Pedágio", "Ped"),
        ("Combustível", "Combust"),
        ("Frete", "Fret"),
        ("Rescisão/Indenização", "Indeniza"),
        ("Aviso Prévio", "Aviso"),
        ("Rescis", "Rescis"),
    ]

    for label, pattern in termos:
        m = s.str.contains(pattern, case=False, na=False)
        print("\n" + "=" * 100)
        print(f"{label} | pattern={pattern} | matches={int(m.sum())}")
        print("=" * 100)
        if not m.any():
            continue
        cols = [col_grp, col_conta] + [(m_, "R$") for m_ in MESES]
        print(df.loc[m, cols].head(60).to_string(index=False))


if __name__ == "__main__":
    main()






