"""
Inspeção rápida das planilhas de REDUÇÃO DE CUSTOS.

Objetivo: listar abas, colunas e um preview de linhas para entender o layout
antes de montar a análise (Julho vs Novembro, média Fev–Jul vs Novembro).
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent


def _preview_sheet(path: Path, sheet_name: str, nrows: int = 12) -> None:
    df = pd.read_excel(path, sheet_name=sheet_name, nrows=nrows)
    print(f"\n--- Aba: {sheet_name} | preview shape: {df.shape} ---")
    print("Colunas:", list(df.columns))
    print(df.head(5).to_string(index=False))


def main() -> None:
    arquivos = [
        "ANALISE_REDUCAO_CUSTOS.xlsx",
        "ANALISE_REDUCAO_CUSTOS_FINAL.xlsx",
        "JAN - SET 2025.xlsx",
        "MENSAL NOV - DEZ 2025.xlsx",
        "RESULTADO FINAL NOV - DEZ 2025.xlsx",
    ]

    for nome in arquivos:
        path = BASE_DIR / nome
        print("\n" + "=" * 90)
        print(nome)
        print("=" * 90)

        try:
            xls = pd.ExcelFile(path)
            print("Abas:", xls.sheet_names)
            for sheet in xls.sheet_names[:10]:
                _preview_sheet(path, sheet)
        except Exception as e:
            print("ERRO:", e)


if __name__ == "__main__":
    main()






