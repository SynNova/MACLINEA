"""
ANÁLISE DE REDUÇÃO DE CUSTOS RECORRENTES (Plano de contas: Média anual vs Novembro)

Entradas (pasta REDUÇÃO DE CUSTOS):
  - JAN - SET 2025.xlsx (aba Export)  -> DRE "antigo" (grupos/contas com colunas YYYYMM R$/%)
  - MENSAL NOV - DEZ 2025.xlsx (aba Consulta) -> Novo plano (Código/Descrição com coluna Novembro)

Regras do pedido (versão atual):
  - Resultado final no formato do **plano de contas** (Nov/Dez)
  - Comparar **média anual** (base do DRE antigo; meses disponíveis Jan–Set/2025) com **Novembro/2025**
  - Há gap em Outubro/2025 (não existe dado no conjunto fornecido)
  - Considerar mudança de categorização (DRE antigo vs novo plano) via mapeamento por regras
  - Foco: custos recorrentes (separa itens não recorrentes como rescisões/ações/13º)

Saídas:
  - imprime resumo no console
  - gera Excel de apoio com abas de base e comparativos
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
import unicodedata

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent

ARQ_ANTIGO = BASE_DIR / "JAN - SET 2025.xlsx"
ABA_ANTIGO = "Export"

ARQ_NOVO = BASE_DIR / "MENSAL NOV - DEZ 2025.xlsx"
ABA_NOVO = "Consulta"

MES_JUL = 202507

# "Média anual" (na prática: média mensal do ano com base nos meses disponíveis no DRE antigo).
# O arquivo `JAN - SET 2025.xlsx` traz 202501..202509.
MESES_MEDIA_ANUAL = [202501, 202502, 202503, 202504, 202505, 202506, 202507, 202508, 202509]
ROTULO_MEDIA_ANUAL = "Média anual (Jan–Set/2025)"

CODIGOS_AGREGADORES_NOVO_PLANO = {
    "1",
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "1.6",
    "1.7",
    "2",
    "2.1",
    "2.2",
    "2.3",
}


def _norm(txt: object) -> str:
    """Normaliza texto (lower, sem acentos, espaços colapsados)."""
    if txt is None:
        return ""
    s = str(txt)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _split_conta(conta_raw: str) -> tuple[str, str]:
    """
    Se a célula for "código - descrição", separa.
    Ex.: '3.04... - Telefone' => (codigo, descricao).
    """
    s = str(conta_raw).strip()
    if " - " in s:
        codigo, desc = s.split(" - ", 1)
        return codigo.strip(), desc.strip()
    return "", s


def carregar_dre_antigo() -> pd.DataFrame:
    df = pd.read_excel(ARQ_ANTIGO, sheet_name=ABA_ANTIGO, header=[0, 1])

    # As duas primeiras colunas são o bloco "Anomes" (Descrição / Conta)
    col_grupo = df.columns[0]
    col_conta = df.columns[1]

    # Seleciona apenas colunas de R$ dos meses necessários
    meses_necessarios = sorted(set(MESES_MEDIA_ANUAL + [MES_JUL]))
    cols_valor = [(m, "R$") for m in meses_necessarios]
    missing = [c for c in cols_valor if c not in df.columns]
    if missing:
        raise ValueError(f"Colunas de mês não encontradas no DRE antigo: {missing}")

    out = df[[col_grupo, col_conta] + cols_valor].copy()
    out.columns = ["grupo_raw", "conta_raw"] + [f"v_{m}" for m, _ in cols_valor]

    out["grupo_raw"] = out["grupo_raw"].astype(str).str.strip()
    out["conta_raw"] = out["conta_raw"].astype(str).str.strip()

    out["conta_codigo"], out["conta_desc"] = zip(*out["conta_raw"].map(_split_conta))
    out["grupo_norm"] = out["grupo_raw"].map(_norm)
    out["conta_desc_norm"] = out["conta_desc"].map(_norm)

    # Mantém apenas linhas com conta preenchida
    out = out[out["conta_raw"].notna()].copy()

    return out


def dre_antigo_long(df_antigo: pd.DataFrame) -> pd.DataFrame:
    value_cols = [c for c in df_antigo.columns if c.startswith("v_")]
    df_long = df_antigo.melt(
        id_vars=[
            "grupo_raw",
            "conta_raw",
            "conta_codigo",
            "conta_desc",
            "grupo_norm",
            "conta_desc_norm",
        ],
        value_vars=value_cols,
        var_name="mes",
        value_name="valor",
    )
    df_long["mes"] = df_long["mes"].str.replace("v_", "", regex=False).astype(int)
    df_long["valor"] = pd.to_numeric(df_long["valor"], errors="coerce").fillna(0.0)

    # Definimos "gasto" como -valor: despesas (negativas) viram positivas; receitas viram negativas
    df_long["gasto"] = -df_long["valor"]
    return df_long


def carregar_plano_novo() -> pd.DataFrame:
    df = pd.read_excel(ARQ_NOVO, sheet_name=ABA_NOVO)
    col_codigo = df.columns[1]
    col_desc = df.columns[2]
    col_nov = df.columns[4]

    out = df[[col_codigo, col_desc, col_nov]].copy()
    out.columns = ["codigo", "desc", "valor_nov"]
    out["codigo"] = out["codigo"].astype(str).str.strip()
    out["desc"] = out["desc"].astype(str).str.strip()
    out["desc_norm"] = out["desc"].map(_norm)
    out["valor_nov"] = pd.to_numeric(out["valor_nov"], errors="coerce").fillna(0.0)
    out["gasto_nov"] = -out["valor_nov"]
    # Evita "-0,00" na apresentação
    out["gasto_nov"] = out["gasto_nov"].where(out["gasto_nov"].abs() > 1e-9, 0.0)

    # Remove linhas agregadoras óbvias (totais do relatório) para evitar dupla contagem
    out = out[~out["codigo"].isin(CODIGOS_AGREGADORES_NOVO_PLANO)].copy()

    return out


def carregar_plano_novo_completo() -> pd.DataFrame:
    """Carrega o plano novo mantendo também linhas agregadoras (1.3, 1.4, etc) para formatação do relatório."""
    df = pd.read_excel(ARQ_NOVO, sheet_name=ABA_NOVO)
    col_codigo = df.columns[1]
    col_desc = df.columns[2]
    col_nov = df.columns[4]

    out = df[[col_codigo, col_desc, col_nov]].copy()
    out.columns = ["codigo", "desc", "valor_nov"]
    out["codigo"] = out["codigo"].astype(str).str.strip()
    out["desc"] = out["desc"].astype(str).str.strip()
    out["desc_norm"] = out["desc"].map(_norm)
    out["valor_nov"] = pd.to_numeric(out["valor_nov"], errors="coerce").fillna(0.0)
    out["gasto_nov"] = -out["valor_nov"]
    # Evita "-0,00" na apresentação
    out["gasto_nov"] = out["gasto_nov"].where(out["gasto_nov"].abs() > 1e-9, 0.0)
    return out


def calcular_base_old(
    df_old_long: pd.DataFrame,
    old_group_contains: tuple[str, ...] = (),
    old_conta_contains: tuple[str, ...] = (),
    old_conta_exclude_contains: tuple[str, ...] = (),
    meses_media: list[int] | None = None,
    mes_referencia: int | None = MES_JUL,
) -> tuple[float, float]:
    """
    Retorna (base_mes_referencia, base_media) do DRE antigo para uma regra de seleção.

    - `mes_referencia`: normalmente Julho/2025 (202507), usado como âncora opcional.
    - `meses_media`: lista de meses para calcular a média. Se None, usa `MESES_MEDIA_ANUAL`.
    """
    regra_tmp = RegraCategoria(
        categoria="__tmp__",
        old_group_contains=old_group_contains,
        old_conta_contains=old_conta_contains,
        old_conta_exclude_contains=old_conta_exclude_contains,
    )
    mask_old = aplicar_regra_old(df_old_long, regra_tmp)
    old_mes = (
        df_old_long.loc[mask_old, ["mes", "gasto"]]
        .groupby("mes", as_index=False)["gasto"]
        .sum()
        .set_index("mes")["gasto"]
    )
    meses_media = meses_media or MESES_MEDIA_ANUAL
    base_ref = float(old_mes.get(mes_referencia, 0.0)) if mes_referencia is not None else 0.0
    base_media = float(old_mes.reindex(meses_media, fill_value=0.0).mean())
    return base_ref, base_media


def _codigo_nivel2(codigo: str) -> str:
    """
    Retorna o prefixo de 2 níveis (ex.: 1.3.01.1 -> 1.3, 2.2.03 -> 2.2).
    Se não houver 2 níveis, retorna o próprio.
    """
    parts = str(codigo).strip().split(".")
    if len(parts) >= 2:
        return ".".join(parts[:2])
    return str(codigo).strip()


def _descricao_categoria_por_codigo(df_plano_full: pd.DataFrame) -> dict[str, str]:
    """
    Mapa código agregado (ex.: 1.3, 1.4, 2.2) -> descrição,
    usando a planilha do novo plano (se existir linha agregadora).
    """
    wanted = set(CODIGOS_AGREGADORES_NOVO_PLANO)
    out: dict[str, str] = {}
    for _, r in df_plano_full.iterrows():
        cod = str(r["codigo"]).strip()
        if cod in wanted:
            out[cod] = str(r["desc"]).strip()
    return out


@dataclass(frozen=True)
class RegraCategoria:
    categoria: str
    old_group_contains: tuple[str, ...] = ()
    old_conta_contains: tuple[str, ...] = ()
    old_conta_exclude_contains: tuple[str, ...] = ()
    new_code_prefixes: tuple[str, ...] = ()
    new_codes: tuple[str, ...] = ()
    new_desc_contains: tuple[str, ...] = ()
    new_desc_exclude_contains: tuple[str, ...] = ()
    observacao: str = ""


def _mask_contains(series: pd.Series, termos: tuple[str, ...]) -> pd.Series:
    if not termos:
        return pd.Series([True] * len(series), index=series.index)
    mask = pd.Series([False] * len(series), index=series.index)
    for t in termos:
        mask = mask | series.str.contains(re.escape(_norm(t)), na=False)
    return mask


def _mask_excludes(series: pd.Series, termos: tuple[str, ...]) -> pd.Series:
    if not termos:
        return pd.Series([True] * len(series), index=series.index)
    mask = pd.Series([True] * len(series), index=series.index)
    for t in termos:
        mask = mask & ~series.str.contains(re.escape(_norm(t)), na=False)
    return mask


def aplicar_regra_old(df_old_long: pd.DataFrame, regra: RegraCategoria) -> pd.Series:
    # Evita dupla contagem: não considerar a linha "Total" do grupo.
    mask_not_total = df_old_long["conta_raw"].map(_norm) != "total"

    mask_group = _mask_contains(df_old_long["grupo_norm"], regra.old_group_contains)
    mask_conta = _mask_contains(df_old_long["conta_desc_norm"], regra.old_conta_contains)
    mask_excl = _mask_excludes(df_old_long["conta_desc_norm"], regra.old_conta_exclude_contains)

    return mask_not_total & mask_group & mask_conta & mask_excl


def aplicar_regra_new(df_new: pd.DataFrame, regra: RegraCategoria) -> pd.Series:
    mask = pd.Series([True] * len(df_new), index=df_new.index)

    if regra.new_code_prefixes:
        mask_prefix = pd.Series([False] * len(df_new), index=df_new.index)
        for pref in regra.new_code_prefixes:
            pref = str(pref).strip()
            if not pref:
                continue
            mask_prefix = mask_prefix | df_new["codigo"].astype(str).str.startswith(pref)
        mask = mask & mask_prefix

    if regra.new_codes:
        mask_codes = pd.Series([False] * len(df_new), index=df_new.index)
        for code in regra.new_codes:
            code = str(code).strip()
            mask_codes = mask_codes | (df_new["codigo"] == code)
        mask = mask & mask_codes

    if regra.new_desc_contains:
        mask = mask & _mask_contains(df_new["desc_norm"], regra.new_desc_contains)

    if regra.new_desc_exclude_contains:
        mask = mask & _mask_excludes(df_new["desc_norm"], regra.new_desc_exclude_contains)

    return mask


def sumarizar_categoria(
    df_old_long: pd.DataFrame,
    df_new: pd.DataFrame,
    regra: RegraCategoria,
) -> dict[str, object]:
    mask_old = aplicar_regra_old(df_old_long, regra)
    mask_new = aplicar_regra_new(df_new, regra)

    # Antigo: total por mês e média anual
    old_mes = (
        df_old_long.loc[mask_old, ["mes", "gasto"]]
        .groupby("mes", as_index=False)["gasto"]
        .sum()
        .set_index("mes")["gasto"]
    )
    base_jul = float(old_mes.get(MES_JUL, 0.0))
    base_avg = float(old_mes.reindex(MESES_MEDIA_ANUAL, fill_value=0.0).mean())

    # Novo: Novembro
    nov = float(df_new.loc[mask_new, "gasto_nov"].sum())

    # Reduções (positivo = reduziu custo)
    red_vs_jul = base_jul - nov
    red_vs_avg = base_avg - nov

    pct_vs_jul = None if abs(base_jul) < 1e-9 else red_vs_jul / base_jul
    pct_vs_avg = None if abs(base_avg) < 1e-9 else red_vs_avg / base_avg

    return {
        "categoria": regra.categoria,
        "base_julho": base_jul,
        "base_media_fev_jul": base_avg,
        "novembro": nov,
        "reducao_vs_julho": red_vs_jul,
        "reducao_vs_media": red_vs_avg,
        "pct_vs_julho": pct_vs_jul,
        "pct_vs_media": pct_vs_avg,
        "observacao": regra.observacao,
    }


def fmt_brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_brl_opt(v: float | None) -> str:
    if v is None:
        return "-"
    if isinstance(v, float) and pd.isna(v):
        return "-"
    return fmt_brl(float(v))


def fmt_pct(v: float | None) -> str:
    if v is None:
        return "-"
    # DataFrame pode converter None -> NaN
    if isinstance(v, float) and pd.isna(v):
        return "-"
    return f"{v*100:,.1f}%".replace(",", "X").replace(".", ",").replace("X", ".")


def _md_table(df: pd.DataFrame, cols: list[str]) -> str:
    header = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    rows = []
    for _, r in df.iterrows():
        rows.append("| " + " | ".join(str(r[c]) for c in cols) + " |")
    return "\n".join([header, sep, *rows])


def main() -> None:
    df_antigo = carregar_dre_antigo()
    df_old_long = dre_antigo_long(df_antigo)

    df_novo = carregar_plano_novo()
    df_plano_full = carregar_plano_novo_completo()
    df_plano_leaf = df_plano_full[~df_plano_full["codigo"].isin(CODIGOS_AGREGADORES_NOVO_PLANO)].copy()
    desc_categorias = _descricao_categoria_por_codigo(df_plano_full)

    # Regras (mapeamento) — ajuste conforme necessidade.
    regras: list[RegraCategoria] = [
        # PESSOAL
        RegraCategoria(
            categoria="Pessoal (recorrente)",
            old_group_contains=("pessoal",),
            old_conta_contains=(),
            old_conta_exclude_contains=("13", "aviso previo", "indeniza"),
            new_code_prefixes=("1.3.",),
            new_desc_contains=(),
            new_desc_exclude_contains=("rescisao", "13", "acoes trabalhistas", "seguro funcionarios", "comissao"),
            observacao="Exclui 13º, rescisões/indenizações e ações trabalhistas para focar recorrência.",
        ),
        RegraCategoria(
            categoria="Pessoal (não recorrente: 13º + rescisões + ações)",
            old_group_contains=("pessoal",),
            old_conta_contains=("13", "aviso previo", "indeniza"),
            old_conta_exclude_contains=(),
            new_code_prefixes=("1.3.",),
            new_desc_contains=("rescisao", "13", "acoes trabalhistas"),
            new_desc_exclude_contains=(),
            observacao="Itens sazonais/extraordinários (servem de contexto, não entram no 'recorrente').",
        ),
        # OCUPAÇÃO / UTILIDADES
        RegraCategoria(
            categoria="Aluguel",
            old_conta_contains=("alugu",),
            new_codes=("1.4.10",),
        ),
        RegraCategoria(
            categoria="Energia elétrica",
            old_conta_contains=("energia eletrica",),
            new_codes=("1.4.14",),
        ),
        RegraCategoria(
            categoria="Água",
            old_conta_contains=("agua",),
            new_codes=("1.4.13",),
        ),
        RegraCategoria(
            categoria="Telefonia/Internet",
            old_conta_contains=("telefone",),
            new_codes=("1.4.12",),
        ),
        RegraCategoria(
            categoria="Vigilância/Segurança",
            old_conta_contains=("seguranca",),
            new_codes=("1.4.06",),
        ),
        # ADMIN / SERVIÇOS
        RegraCategoria(
            categoria="Despesas administrativas (bucket)",
            old_group_contains=("utilizadades e servicos", "material de consumo", "despesas indedutiveis"),
            old_conta_exclude_contains=("manuten", "repar", "segur", "indeniza"),
            new_codes=("1.4.11",),
            observacao="Bucket aproximado: no DRE antigo esses itens aparecem espalhados (correios, refeições, materiais etc.).",
        ),
        RegraCategoria(
            categoria="Viagens/Fretes/Combustível/Pedágio",
            old_group_contains=("viagens, comb.",),
            new_codes=("1.4.03", "1.4.07", "1.4.08", "1.4.09", "1.4.18"),
        ),
        RegraCategoria(
            categoria="Seguros (inclui seguro funcionários)",
            old_group_contains=("seguros",),
            new_codes=("1.4.15", "1.3.05"),
            observacao="No novo plano 'Seguro Funcionários' está dentro de Funcionários; aqui foi alocado em Seguros.",
        ),
        RegraCategoria(
            categoria="Manutenções",
            old_conta_contains=("manuten", "repar"),
            new_codes=("1.5.01", "1.5.02", "1.5.03"),
        ),
        RegraCategoria(
            categoria="Consultoria/Auditoria/Jurídico/Contabilidade",
            old_group_contains=("consultorias",),
            new_codes=("1.4.01", "1.4.22"),
        ),
        RegraCategoria(
            categoria="Financeiro (juros + tarifas)",
            old_group_contains=("juros s/financiamentos", "gestao financeira passiva"),
            new_codes=("1.4.02", "2.2.02", "2.2.03"),
            observacao="Exclui parcela (principal) de empréstimos; mantém juros/IOF quando explicitados.",
        ),
        RegraCategoria(
            categoria="Comissões",
            old_group_contains=("comiss",),
            new_codes=("1.3.14",),
        ),
    ]

    linhas = [sumarizar_categoria(df_old_long, df_novo, r) for r in regras]
    df_out = pd.DataFrame(linhas)

    # Ordena por maior redução vs média (mais positivo primeiro)
    df_out = df_out.sort_values("reducao_vs_media", ascending=False)

    print("\n" + "=" * 88)
    print("ANÁLISE DE REDUÇÃO DE CUSTOS RECORRENTES (Média anual vs Novembro)")
    print("=" * 88)
    print(f"- Base (média anual): {MESES_MEDIA_ANUAL} ({ROTULO_MEDIA_ANUAL}) | Gap: Out/2025")
    print("- Obs.: este consolidado por 'categoria' segue o mapeamento antigo; o relatório final segue o plano de contas.\n")

    cols_show = [
        "categoria",
        "base_julho",
        "base_media_fev_jul",
        "novembro",
        "reducao_vs_julho",
        "pct_vs_julho",
        "reducao_vs_media",
        "pct_vs_media",
    ]
    df_print = df_out[cols_show].copy()

    for c in ["base_julho", "base_media_fev_jul", "novembro", "reducao_vs_julho", "reducao_vs_media"]:
        df_print[c] = df_print[c].map(fmt_brl)
    df_print["pct_vs_julho"] = df_print["pct_vs_julho"].map(fmt_pct)
    df_print["pct_vs_media"] = df_print["pct_vs_media"].map(fmt_pct)

    print(df_print.to_string(index=False))

    # Totais (somente recorrentes + mapeadas)
    # Aqui, por simplicidade, excluímos explicitamente a linha "Pessoal (não recorrente...)"
    df_total = df_out[df_out["categoria"] != "Pessoal (não recorrente: 13º + rescisões + ações)"]
    total_base_jul = float(df_total["base_julho"].sum())
    total_base_avg = float(df_total["base_media_fev_jul"].sum())
    total_nov = float(df_total["novembro"].sum())
    total_red_jul = total_base_jul - total_nov
    total_red_avg = total_base_avg - total_nov

    print("\n" + "-" * 88)
    print("TOTAL (categorias mapeadas; exclui 'Pessoal não recorrente'):")
    print(f"- Julho:        {fmt_brl(total_base_jul)}")
    print(f"- Média (categorias): {fmt_brl(total_base_avg)}")
    print(f"- Novembro:     {fmt_brl(total_nov)}")
    print(f"- Redução vs Jul:{fmt_brl(total_red_jul)}")
    print(f"- Redução vs Avg:{fmt_brl(total_red_avg)}")

    # Relatório em Markdown (para apresentação)
    out_md = BASE_DIR / "RELATORIO_REDUCAO_CUSTOS_RECORRENTES_NOV2025.md"

    pct_total_vs_jul = None if abs(total_base_jul) < 1e-9 else total_red_jul / total_base_jul
    pct_total_vs_avg = None if abs(total_base_avg) < 1e-9 else total_red_avg / total_base_avg

    # ---------------------------------------------------------------------
    # NOVO FORMATO: seguir o plano de contas (Nov/Dez) com categorias no final
    # ---------------------------------------------------------------------

    # Códigos de interesse para custos recorrentes + contexto (não recorrente)
    prefixos_interesse = ("1.3.", "1.4.", "1.5.", "2.2.")
    df_plano_focus = df_plano_leaf[
        df_plano_leaf["codigo"].astype(str).str.startswith(prefixos_interesse)
    ].copy()

    # Mapeamento DRE antigo -> CÓDIGOS do plano novo (por regra)
    # OBS: quando não houver histórico equivalente no DRE antigo, a base será assumida 0 (conservador) e marcada na observação.
    base_por_codigo: dict[str, tuple[float | None, float | None, str]] = {}

    # FUNCIONÁRIOS (itens que conseguimos mapear no DRE antigo por descrição)
    base_por_codigo["1.3.01"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("fgts",)), "DRE antigo: PESSOAL / FGTS")
    # Salários no DRE antigo também carrega adicionais que o plano novo não separa em linha própria (insalubridade etc).
    base_por_codigo["1.3.03"] = (
        *calcular_base_old(
            df_old_long,
            old_group_contains=("pessoal",),
            old_conta_contains=("salarios", "horas extras", "adicional noturno", "adicional insalubridade"),
        ),
        "DRE antigo: PESSOAL / Salários + adicionais",
    )
    base_por_codigo["1.3.09"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("13",)), "DRE antigo: PESSOAL / 13º Salário")
    base_por_codigo["1.3.02"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("inss",)), "DRE antigo: PESSOAL / INSS (inclui Lei 12.546/2011)")
    base_por_codigo["1.3.15"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("ferias",)), "DRE antigo: PESSOAL / Férias")
    base_por_codigo["1.3.17"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("pro-labore", "pro labore")), "DRE antigo: PESSOAL / Pró-Labore")
    base_por_codigo["1.3.10"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("vale transporte",)), "DRE antigo: PESSOAL / Vale Transporte")
    base_por_codigo["1.3.13"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("pat",)), "DRE antigo: PESSOAL / PAT (alimentação)")
    base_por_codigo["1.3.19"] = (*calcular_base_old(df_old_long, old_group_contains=("pessoal",), old_conta_contains=("assistencia medica",)), "DRE antigo: PESSOAL / Assistência Médica e Social")
    base_por_codigo["1.3.14"] = (*calcular_base_old(df_old_long, old_group_contains=("comiss",), old_conta_contains=("comiss",)), "DRE antigo: COMISSÕES")

    # DESPESAS / UTILIDADES
    base_por_codigo["1.4.10"] = (*calcular_base_old(df_old_long, old_conta_contains=("alugu",)), "DRE antigo: Aluguéis e Condomínios")
    base_por_codigo["1.4.12"] = (*calcular_base_old(df_old_long, old_conta_contains=("telefone",)), "DRE antigo: Telefone")
    base_por_codigo["1.4.13"] = (*calcular_base_old(df_old_long, old_conta_contains=("agua",)), "DRE antigo: Água")
    base_por_codigo["1.4.14"] = (*calcular_base_old(df_old_long, old_conta_contains=("energia eletrica",)), "DRE antigo: Energia Elétrica")
    base_por_codigo["1.4.06"] = (*calcular_base_old(df_old_long, old_conta_contains=("seguranca",)), "DRE antigo: Segurança")

    # Despesas administrativas (bucket aproximado)
    base_por_codigo["1.4.11"] = (
        *calcular_base_old(
            df_old_long,
            old_group_contains=("utilizadades e servicos", "material de consumo", "despesas indedutiveis"),
            old_conta_exclude_contains=("manuten", "repar", "segur", "indeniza"),
        ),
        "DRE antigo: Utilidades/Material de consumo/Indedutíveis (sem indenizações)",
    )

    # Viagens e fretes (DRE antigo tem conta 'Fretes e Combustíveis' e 'Viagens e Estadias')
    base_por_codigo["1.4.03"] = (*calcular_base_old(df_old_long, old_conta_contains=("fretes e combustiveis",)), "DRE antigo: Fretes e Combustíveis")
    base_por_codigo["1.4.18"] = (*calcular_base_old(df_old_long, old_conta_contains=("viagens e estadias",)), "DRE antigo: Viagens e Estadias")

    # Consultoria/Jurídico/Contabilidade (no DRE antigo está no grupo CONSULTORIAS...)
    base_por_codigo["1.4.22"] = (*calcular_base_old(df_old_long, old_group_contains=("consultorias",)), "DRE antigo: Consultorias/Auditorias/Honorários")

    # Pool: seguros (no novo plano aparece em 1.3.05 e 1.4.15; no DRE antigo está consolidado em SEGUROS OPERACIONAL)
    seguros_codes = ["1.3.05", "1.4.15"]
    seg_jul, seg_avg = calcular_base_old(df_old_long, old_group_contains=("seguros",))
    seg_nov_total = float(df_plano_focus[df_plano_focus["codigo"].isin(seguros_codes)]["gasto_nov"].sum())
    if seg_nov_total <= 0:
        pesos = {c: 1 / len(seguros_codes) for c in seguros_codes}
    else:
        pesos = {
            c: float(df_plano_focus.loc[df_plano_focus["codigo"] == c, "gasto_nov"].sum()) / seg_nov_total
            for c in seguros_codes
        }
    for c in seguros_codes:
        base_por_codigo[c] = (seg_jul * pesos[c], seg_avg * pesos[c], "DRE antigo: Seguros (rateio por peso em Nov/2025)")

    # Pool: financeiro (1.4.02 + (opcional) 2.2.02/2.2.03)
    fin_codes = ["1.4.02", "2.2.02", "2.2.03"]
    fin_jul, fin_avg = calcular_base_old(df_old_long, old_group_contains=("juros s/financiamentos", "gestao financeira passiva"))
    fin_nov_total = float(df_plano_focus[df_plano_focus["codigo"].isin(fin_codes)]["gasto_nov"].sum())
    if fin_nov_total <= 0:
        pesos = {c: 1 / len(fin_codes) for c in fin_codes}
    else:
        pesos = {
            c: float(df_plano_focus.loc[df_plano_focus["codigo"] == c, "gasto_nov"].sum()) / fin_nov_total
            for c in fin_codes
        }
    for c in fin_codes:
        base_por_codigo[c] = (fin_jul * pesos[c], fin_avg * pesos[c], "DRE antigo: Financeiro (rateio por peso em Nov/2025)")

    # Pool: manutenções (novo plano 1.5.01/1.5.02/1.5.03; DRE antigo tem 'Manutenção e Reparos' em mais de um grupo)
    man_codes = ["1.5.01", "1.5.02", "1.5.03"]
    man_jul, man_avg = calcular_base_old(df_old_long, old_conta_contains=("manuten", "repar"))
    man_nov_total = float(df_plano_focus[df_plano_focus["codigo"].isin(man_codes)]["gasto_nov"].sum())
    if man_nov_total <= 0:
        pesos = {c: 1 / len(man_codes) for c in man_codes}
    else:
        pesos = {
            c: float(df_plano_focus.loc[df_plano_focus["codigo"] == c, "gasto_nov"].sum()) / man_nov_total
            for c in man_codes
        }
    for c in man_codes:
        base_por_codigo[c] = (man_jul * pesos[c], man_avg * pesos[c], "DRE antigo: Manutenções (rateio por peso em Nov/2025)")

    # Tipos (recorrente vs não recorrente) — usado para totais e para leitura
    tipo_nao_rec = {
        "1.3.01.1",  # FGTS Rescisão
        "1.3.03.1",  # Salários Rescisão
        "1.3.09",    # 13º
        "1.3.18",    # Ações trabalhistas
    }
    tipo_fora_escopo = {
        "2.2.01",  # Empréstimos/Parcelas (amortização de principal) — não é despesa recorrente
    }

    # Mantém no detalhamento: linhas com valor em Novembro OU com base mapeada (para mostrar redução)
    codigos_mapeados = set(base_por_codigo.keys())
    df_plano_focus["_tem_base"] = df_plano_focus["codigo"].isin(codigos_mapeados)
    df_plano_focus = df_plano_focus[(df_plano_focus["gasto_nov"].abs() > 0) | (df_plano_focus["_tem_base"])].copy()
    df_plano_focus = df_plano_focus.drop(columns=["_tem_base"])

    # Calcula colunas de comparação
    def _get_base(cod: str) -> tuple[float | None, float | None, str]:
        return base_por_codigo.get(str(cod).strip(), (None, None, "Sem mapeamento no DRE antigo"))

    bases = df_plano_focus["codigo"].map(_get_base)
    df_plano_focus["base_julho"] = [b[0] for b in bases]
    df_plano_focus["base_media_fev_jul"] = [b[1] for b in bases]
    df_plano_focus["base_obs"] = [b[2] for b in bases]
    def _tipo_item(c: object) -> str:
        c = str(c).strip()
        if c in tipo_fora_escopo:
            return "Fora do escopo"
        if c in tipo_nao_rec:
            return "Não recorrente"
        return "Recorrente"

    df_plano_focus["tipo"] = df_plano_focus["codigo"].apply(_tipo_item)

    # Normaliza bases para float (None -> NaN)
    df_plano_focus["base_julho"] = pd.to_numeric(df_plano_focus["base_julho"], errors="coerce")
    df_plano_focus["base_media_fev_jul"] = pd.to_numeric(df_plano_focus["base_media_fev_jul"], errors="coerce")

    df_plano_focus["reducao_vs_julho"] = df_plano_focus["base_julho"] - df_plano_focus["gasto_nov"]
    df_plano_focus["reducao_vs_media"] = df_plano_focus["base_media_fev_jul"] - df_plano_focus["gasto_nov"]
    df_plano_focus["pct_vs_media"] = df_plano_focus.apply(
        lambda r: (r["reducao_vs_media"] / r["base_media_fev_jul"])
        if (r["base_media_fev_jul"] is not None and abs(r["base_media_fev_jul"]) > 1e-9 and r["reducao_vs_media"] is not None)
        else None,
        axis=1,
    )

    # Ordenação por código (string mesmo já fica bem legível nesse plano)
    df_plano_focus = df_plano_focus.sort_values("codigo")

    # Resumo por categoria (2 níveis) — NO FINAL do relatório
    # Importante: compara apenas itens com base mapeada, para manter "média anual vs novembro" consistente.
    df_rec = df_plano_focus[
        (df_plano_focus["tipo"] == "Recorrente") & (df_plano_focus["base_media_fev_jul"].notna())
    ].copy()
    df_rec["cat2"] = df_rec["codigo"].map(_codigo_nivel2)
    resumo = df_rec.groupby("cat2", as_index=False).agg(
        base_julho=("base_julho", "sum"),
        base_media_fev_jul=("base_media_fev_jul", "sum"),
        novembro=("gasto_nov", "sum"),
    )
    resumo["reducao_vs_media"] = resumo["base_media_fev_jul"] - resumo["novembro"]
    resumo["pct_vs_media"] = resumo.apply(
        lambda r: (r["reducao_vs_media"] / r["base_media_fev_jul"]) if abs(r["base_media_fev_jul"]) > 1e-9 else None,
        axis=1,
    )
    resumo["categoria"] = resumo["cat2"].apply(lambda c: desc_categorias.get(c, c))
    resumo = resumo.sort_values("cat2")

    # ---------------------------------------------------------------------
    # Exporta Excel final (inclui o comparativo no formato do plano de contas)
    # ---------------------------------------------------------------------
    out_xlsx = BASE_DIR / "SAIDA_ANALISE_REDUCAO_CUSTOS_RECORRENTES.xlsx"
    df_map = pd.DataFrame([r.__dict__ for r in regras])

    def _exportar_excel(path: Path) -> None:
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df_antigo.to_excel(writer, sheet_name="dre_antigo_base", index=False)
            df_old_long.to_excel(writer, sheet_name="dre_antigo_long", index=False)

            df_plano_full.to_excel(writer, sheet_name="plano_novo_full", index=False)
            df_novo.to_excel(writer, sheet_name="plano_novo_nov", index=False)

            df_out.to_excel(writer, sheet_name="comparativo", index=False)
            df_plano_focus.to_excel(writer, sheet_name="comparativo_plano", index=False)
            resumo.to_excel(writer, sheet_name="resumo_plano", index=False)

            df_map.to_excel(writer, sheet_name="mapeamento_regras", index=False)

    try:
        _exportar_excel(out_xlsx)
        print(f"\nArquivo gerado: {out_xlsx}")
    except PermissionError:
        # Geralmente acontece quando o arquivo está aberto no Excel.
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_xlsx_alt = BASE_DIR / f"SAIDA_ANALISE_REDUCAO_CUSTOS_RECORRENTES_{ts}.xlsx"
        _exportar_excel(out_xlsx_alt)
        print(f"\nArquivo gerado (alternativo, arquivo original estava aberto): {out_xlsx_alt}")

    md_lines: list[str] = []
    md_lines.append("### Análise de redução de custos recorrentes — Novembro/2025")
    md_lines.append("")
    md_lines.append("#### Objetivo")
    md_lines.append(
        "Comparar os **planos de contas** em **Novembro/2025** contra a **média anual** (base histórica do DRE antigo)."
    )
    md_lines.append(f"- **{ROTULO_MEDIA_ANUAL}** vs **Novembro/2025**")
    md_lines.append("")
    md_lines.append("#### Dados utilizados")
    md_lines.append(f"- **DRE antigo**: `{ARQ_ANTIGO.name}` (aba `{ABA_ANTIGO}`)")
    md_lines.append(f"- **Novo plano**: `{ARQ_NOVO.name}` (aba `{ABA_NOVO}`)")
    md_lines.append(f"- **Média anual**: média mensal calculada com base em {MESES_MEDIA_ANUAL} (meses disponíveis no DRE antigo).")
    md_lines.append("- **Gap**: não há dados de **Outubro/2025** no conjunto recebido.")
    md_lines.append("")
    md_lines.append("#### Metodologia (Python)")
    md_lines.append(
        "- **Sinal**: despesas vêm negativas nas planilhas; convertemos para **gasto positivo** (gasto = -valor)."
    )
    md_lines.append(
        "- **Mapeamento**: categorias do DRE antigo foram alinhadas ao novo plano via regras por **grupo/conta** e **código**."
    )
    md_lines.append(
        "- **Recorrência (pessoal)**: separamos **não recorrentes** (13º, rescisões/indenizações, ações trabalhistas) para não distorcer o indicador."
    )
    md_lines.append("")
    # Consolidado do plano (somente recorrente; apenas itens com base mapeada)
    total_media_anual = float(df_rec["base_media_fev_jul"].sum())
    total_nov_mapeado = float(df_rec["gasto_nov"].sum())
    total_diff = total_media_anual - total_nov_mapeado
    pct_total = None if abs(total_media_anual) < 1e-9 else total_diff / total_media_anual

    md_lines.append("#### Resultado consolidado (plano de contas; recorrente; itens com base mapeada)")
    md_lines.append(f"- **{ROTULO_MEDIA_ANUAL}**: {fmt_brl(total_media_anual)}")
    md_lines.append(f"- **Novembro/2025**: {fmt_brl(total_nov_mapeado)}")
    md_lines.append(f"- **Diferença (Média − Novembro)**: {fmt_brl(total_diff)} ({fmt_pct(pct_total)})")
    md_lines.append("")
    md_lines.append("#### Detalhamento no formato do plano de contas (Nov/Dez) — contas analisadas")
    md_lines.append(
        "Tabela organizada pelos **códigos/descrições** do plano de contas (Nov/Dez), com base histórica do DRE antigo quando há mapeamento."
    )
    md_lines.append("")

    df_det = df_plano_focus.copy()
    df_det[ROTULO_MEDIA_ANUAL] = df_det["base_media_fev_jul"].map(fmt_brl_opt)
    df_det["Novembro"] = df_det["gasto_nov"].map(fmt_brl)
    df_det["Diferença (Média − Novembro)"] = df_det["reducao_vs_media"].map(fmt_brl_opt)
    df_det["% vs Média"] = df_det["pct_vs_media"].map(fmt_pct)

    cols_det = ["codigo", "desc", "tipo", ROTULO_MEDIA_ANUAL, "Novembro", "Diferença (Média − Novembro)", "% vs Média"]
    md_lines.append(_md_table(df_det[cols_det], cols_det))
    md_lines.append("")

    # Contexto não recorrente (filtrado do detalhamento)
    df_det_nao = df_det[df_det["tipo"] == "Não recorrente"].copy()
    if not df_det_nao.empty:
        md_lines.append("#### Itens não recorrentes (contexto)")
        md_lines.append(
            "Esses valores aparecem no plano em Novembro e **não devem** ser usados como indicador de custo recorrente."
        )
        md_lines.append(_md_table(df_det_nao[cols_det], cols_det))
        md_lines.append("")

    # Fora do escopo (ex.: amortização de principal)
    df_det_fora = df_det[df_det["tipo"] == "Fora do escopo"].copy()
    if not df_det_fora.empty:
        md_lines.append("#### Itens fora do escopo (não são custo recorrente)")
        md_lines.append(
            "Itens como **amortização de principal** (empréstimos/parcelas) não representam despesa recorrente e foram excluídos do consolidado."
        )
        md_lines.append(_md_table(df_det_fora[cols_det], cols_det))
        md_lines.append("")

    md_lines.append("#### Observações")
    md_lines.append(
        "- Algumas linhas podem estar **zeradas** em Novembro por **competência/lançamento** (ex.: consultorias). Recomenda-se validar com o financeiro."
    )
    md_lines.append(
        "- O mapeamento completo e as regras estão no Excel de saída (aba `mapeamento_regras`)."
    )
    md_lines.append(
        "- **Empréstimos/Parcelas (2.2.01)** foi tratado como **fora do escopo** (amortização de principal), não entra como custo recorrente."
    )

    # Categorias NO FINAL (pedido)
    md_lines.append("")
    md_lines.append("#### Resumo por categoria do plano de contas (no final)")
    df_res = resumo.copy()
    df_res[ROTULO_MEDIA_ANUAL] = df_res["base_media_fev_jul"].map(fmt_brl_opt)
    df_res["Novembro"] = df_res["novembro"].map(fmt_brl_opt)
    df_res["Diferença (Média − Novembro)"] = df_res["reducao_vs_media"].map(fmt_brl_opt)
    df_res["% vs Média"] = df_res["pct_vs_media"].map(fmt_pct)
    cols_res = ["cat2", "categoria", ROTULO_MEDIA_ANUAL, "Novembro", "Diferença (Média − Novembro)", "% vs Média"]
    md_lines.append(_md_table(df_res[cols_res], cols_res))

    out_md.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"Relatório gerado: {out_md}")


if __name__ == "__main__":
    main()


