"""
Análise de recorrência (recorrente vs não recorrente) a partir de:
- Movimentos financeiros (extrato consolidado)
- Base complementar de contas a pagar (para sinalizar recorrência e projeção)

Gera um relatório Markdown com:
- Visão geral (entradas/saídas)
- Recorrentes (fixos e variáveis) + projeção mensal
- Não recorrentes / extraordinários
- Alertas de valores fora do padrão e dados faltantes
"""

from __future__ import annotations

import csv
import math
import io
import difflib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
MOVIMENTOS_CSV = ROOT / "public" / "dados" / "movimentos.csv"
CONTAS_PAGAR_CSV = ROOT / "public" / "dados" / "contasPagar_cons.csv"
OUT_MD = ROOT / "ANALISE_RECORRENCIA.md"
OUT_CLASSIFICACAO_CSV = ROOT / "public" / "dados" / "movimentos_classificados.csv"
OUT_PESSOAS_MD = ROOT / "ANALISE_PESSOAS_RESCISOES.md"
OUT_PESSOAS_CSV = ROOT / "public" / "dados" / "pessoas_rescisao_fgts.csv"

# Categorias especiais (IDs) para separar fluxo de caixa de custo operacional
CAT_TRANSFERENCIA_INTERNA = 6
CAT_IMPLANTACAO_SALDO = 5
EXCLUIR_CATEGORIAS_CUSTO = {CAT_TRANSFERENCIA_INTERNA, CAT_IMPLANTACAO_SALDO}

# Heurística de extraordinário (tende a não se repetir em regime normal)
EXTRA_KEYWORDS = [
    "rescis",
    "acao",
    "aç",
    "rj",
    "implant",
    "encontro contas",
    "quit",
    "acordo",
]

# Tokens que tendem a indicar pessoa jurídica (não pessoa física)
PJ_TOKENS = {
    "LTDA",
    "EIRELI",
    "S/A",
    "SA",
    "ME",
    "EPP",
    "INDUSTRIA",
    "COMERCIO",
    "DISTRIBUIDORA",
    "SERVICOS",
    "SERVIÇOS",
    "AUTOMACAO",
    "AUTOMAÇÃO",
    "METALURGICA",
    "METALÚRGICA",
    "TRANSPORTES",
    "COOPERATIVA",
    "SEGUROS",
    "CONSULTORIA",
    "ADVOGADOS",
    "ASSOCIADOS",
    "CLINICAS",
    "CLÍNICAS",
}

# Palavras genéricas que não devem ser confundidas com nome de pessoa
GENERIC_TOKENS = {
    "RESCISOES",
    "RESCISÕES",
    "RESCISAO",
    "RESCISÃO",
    "ACORDO",
    "TRABALHISTA",
    "COBRANCA",
    "COBRANÇA",
    "DEVOLUCAO",
    "DEVOLUÇÃO",
    "TESTE",
    "CONTA",
    "COLETIVO",
}


def _try_read_text(path: Path, encodings: List[str]) -> str:
    data = path.read_bytes()
    last_err: Optional[Exception] = None
    for enc in encodings:
        try:
            return data.decode(enc)
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Falha ao ler {path} com encodings {encodings}: {last_err}")


def br_to_float(s: str) -> float:
    """Converte número pt-BR '1.234,56' -> 1234.56; vazios -> 0"""
    if s is None:
        return 0.0
    s = str(s).strip()
    if not s:
        return 0.0
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_date_ddmmyyyy(s: str) -> Optional[datetime]:
    s = (s or "").strip()
    if not s:
        return None
    # Alguns campos podem vir "01//01/01" etc; ignore inválidos
    try:
        return datetime.strptime(s, "%d/%m/%Y")
    except Exception:
        return None


def month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def normalize_text(s: str) -> str:
    if s is None:
        return ""
    s = str(s).strip()
    # Remove duplicidades de espaços e padroniza
    s = " ".join(s.split())
    return s


def strip_codigo_prefixo(s: str) -> str:
    """
    Remove prefixos tipo '9090 - FORNECEDOR' -> 'FORNECEDOR'
    Mantém o texto se não houver padrão.
    """
    s = normalize_text(s)
    if not s:
        return ""
    # Split por " - " no primeiro
    parts = s.split(" - ", 1)
    if len(parts) == 2 and parts[0].replace(".", "").isdigit():
        return normalize_text(parts[1])
    return s


@dataclass(frozen=True)
class Movimento:
    id: str
    data: datetime
    tipo: str
    credito: float
    debito: float
    banco: str
    documento: str
    parcela: str
    categoria_raw: str
    historico: str
    fornecedor_raw: str

    @property
    def categoria_id(self) -> int:
        raw = normalize_text(self.categoria_raw)
        if not raw:
            return 0
        # "87 - FGTS Rescisao"
        try:
            return int(raw.split(" ", 1)[0])
        except Exception:
            return 0

    @property
    def categoria_nome(self) -> str:
        raw = normalize_text(self.categoria_raw)
        if not raw:
            return "Sem Categoria"
        if " - " in raw:
            return raw.split(" - ", 1)[1].strip()
        return raw

    @property
    def fornecedor(self) -> str:
        return strip_codigo_prefixo(self.fornecedor_raw)

    @property
    def mes(self) -> str:
        return month_key(self.data)

    @property
    def is_saida(self) -> bool:
        return self.debito > 0

    @property
    def is_entrada(self) -> bool:
        return self.credito > 0


@dataclass(frozen=True)
class ContaPagar:
    codigo: str
    titulo: str
    emissao: Optional[datetime]
    vencimento: Optional[datetime]
    fornecedor_raw: str
    valor: float
    saldo_aberto: float
    data_baixa: Optional[datetime]
    status: str
    banco: str
    flag: str
    categoria_raw: str
    observacao: str
    origem: str

    @property
    def fornecedor(self) -> str:
        return strip_codigo_prefixo(self.fornecedor_raw)

    @property
    def categoria_id(self) -> int:
        raw = normalize_text(self.categoria_raw)
        if not raw:
            return 0
        try:
            return int(raw.split(" ", 1)[0])
        except Exception:
            return 0

    @property
    def categoria_nome(self) -> str:
        raw = normalize_text(self.categoria_raw)
        if not raw:
            return "Sem Categoria"
        if " - " in raw:
            return raw.split(" - ", 1)[1].strip()
        return raw

    @property
    def mes_vencimento(self) -> str:
        if not self.vencimento:
            return "sem-data"
        return month_key(self.vencimento)


def ler_movimentos(path: Path) -> List[Movimento]:
    text = _try_read_text(path, ["utf-8-sig", "cp1252", "latin-1"])
    # csv.reader lida melhor com campos vazios
    rows: List[List[str]] = []
    for line in text.splitlines():
        if not line.strip():
            continue
        rows.append(line.split(";"))

    movimentos: List[Movimento] = []
    for parts in rows:
        # Esperado: 11 ou 12 colunas
        if len(parts) < 11:
            continue
        _id = normalize_text(parts[0])
        dt = parse_date_ddmmyyyy(parts[1])
        if not _id or dt is None:
            continue
        tipo = normalize_text(parts[3])
        credito = br_to_float(parts[4])
        debito = br_to_float(parts[5])
        banco = normalize_text(parts[6])
        documento = normalize_text(parts[7])
        parcela = normalize_text(parts[8])
        categoria = normalize_text(parts[9])
        historico = normalize_text(parts[10])
        fornecedor = normalize_text(parts[11]) if len(parts) >= 12 else ""

        movimentos.append(
            Movimento(
                id=_id,
                data=dt,
                tipo=tipo,
                credito=credito,
                debito=debito,
                banco=banco,
                documento=documento,
                parcela=parcela,
                categoria_raw=categoria,
                historico=historico,
                fornecedor_raw=fornecedor,
            )
        )

    movimentos.sort(key=lambda m: m.data)
    return movimentos


def ler_contas_pagar(path: Path) -> List[ContaPagar]:
    text = _try_read_text(path, ["utf-8-sig", "cp1252", "latin-1"])
    # Usar csv.reader para respeitar aspas e quebras de linha em campos
    contas: List[ContaPagar] = []
    reader = csv.reader(io.StringIO(text), delimiter=";", quotechar='"')
    for parts in reader:
        if not parts:
            continue
        # Heurística de colunas: em geral >= 15
        if len(parts) < 12:
            continue

        # Alguns arquivos podem ter colunas extras; tentamos mapear pelos índices mais estáveis
        codigo = normalize_text(parts[0])
        titulo = normalize_text(parts[1]) if len(parts) > 1 else ""
        emissao = parse_date_ddmmyyyy(parts[3]) if len(parts) > 3 else None
        venc = parse_date_ddmmyyyy(parts[4]) if len(parts) > 4 else None
        fornecedor = normalize_text(parts[5]) if len(parts) > 5 else ""
        valor = br_to_float(parts[6]) if len(parts) > 6 else 0.0
        saldo_aberto = br_to_float(parts[7]) if len(parts) > 7 else 0.0
        data_baixa = parse_date_ddmmyyyy(parts[8]) if len(parts) > 8 else None
        status = normalize_text(parts[9]) if len(parts) > 9 else ""
        banco = normalize_text(parts[10]) if len(parts) > 10 else ""
        flag = normalize_text(parts[11]) if len(parts) > 11 else ""
        categoria = normalize_text(parts[12]) if len(parts) > 12 else ""
        # Observação e origem (quando existirem)
        observacao = normalize_text(parts[14]) if len(parts) > 14 else ""
        origem = normalize_text(parts[15]) if len(parts) > 15 else ""

        contas.append(
            ContaPagar(
                codigo=codigo,
                titulo=titulo,
                emissao=emissao,
                vencimento=venc,
                fornecedor_raw=fornecedor,
                valor=valor,
                saldo_aberto=saldo_aberto,
                data_baixa=data_baixa,
                status=status,
                banco=banco,
                flag=flag,
                categoria_raw=categoria,
                observacao=observacao,
                origem=origem,
            )
        )
    return contas


def quantile(sorted_vals: List[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if q <= 0:
        return sorted_vals[0]
    if q >= 1:
        return sorted_vals[-1]
    pos = (len(sorted_vals) - 1) * q
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return sorted_vals[lo]
    frac = pos - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def money(v: float) -> str:
    # Formato BRL simples
    s = f"{v:,.2f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def mov_to_dict(m: Movimento, kind: str) -> Dict[str, Any]:
    """Converte movimento para dict (para report). kind: 'debito'|'credito'."""
    ent = m.fornecedor or (m.historico or "Sem descrição")
    return {
        "id": m.id,
        "data": m.data.strftime("%d/%m/%Y"),
        "mes": m.mes,
        "tipo": m.tipo,
        "banco": m.banco,
        "categoria_id": m.categoria_id,
        "categoria": m.categoria_nome,
        "entidade": normalize_text(ent),
        "descricao": m.historico,
        "valor": m.debito if kind == "debito" else m.credito,
    }


def entidade_chave_recorrencia(m: Movimento) -> str:
    """
    Normaliza a entidade usada para recorrência.
    Objetivo: reduzir ruído (ex.: salários por pessoa) e focar em custo recorrente.
    """
    if m.fornecedor:
        return m.fornecedor
    h = normalize_text(m.historico)
    # Folha/salários: tratar como bloco
    if m.categoria_id == 24:
        return "Folha (Salários)"
    return h or "Sem descrição"


def categoria_breakdown_por_mes(itens: Iterable[Movimento]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for m in itens:
        out[m.mes] = out.get(m.mes, 0.0) + m.debito
    return dict(sorted(out.items()))


def is_extraordinario(cat: str, ent: str, desc: str = "") -> bool:
    c = (cat or "").lower()
    e = (ent or "").lower()
    d = (desc or "").lower()
    return any(k in c for k in EXTRA_KEYWORDS) or any(k in e for k in EXTRA_KEYWORDS) or any(k in d for k in EXTRA_KEYWORDS)


def _norm_ascii_upper(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return ""
    # remove acentos via NFD
    try:
        import unicodedata

        s = unicodedata.normalize("NFD", s)
        s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    except Exception:
        pass
    s = " ".join(s.split())
    return s.upper()


def is_nome_pessoa(nome: str) -> bool:
    """
    Heurística simples para diferenciar pessoa física de pessoa jurídica.
    Não é perfeita, mas ajuda a filtrar fornecedores/empresas em análises de rescisões.
    """
    n = _norm_ascii_upper(nome)
    if not n:
        return False
    # não pode ter dígitos (evita "27 Rescisões", "4168", etc.)
    if any(ch.isdigit() for ch in n):
        return False
    # precisa ter pelo menos 2 palavras (nome + sobrenome)
    if len(n.split()) < 2:
        return False
    # se tem tokens típicos de PJ, tratamos como não-pessoa
    tokens = set(n.replace(".", " ").replace("/", " ").split())
    if tokens.intersection(GENERIC_TOKENS):
        return False
    if tokens.intersection(PJ_TOKENS):
        return False
    # evita genéricos
    if n in {"MACLINEA MAQUINAS E EQUIPAMENTOS LTDA", "MACLINEA"}:
        return False
    return True


def canonicalizar_pessoa(nome: str) -> str:
    """
    Normaliza para chave de agrupamento (mantém maiúsculas e remove excesso de espaços).
    """
    n = normalize_text(nome)
    # remove sufixos e ruídos comuns no próprio campo
    for pref in ["PAGTO ", "PAGAMENTO ", "SALARIO ", "SALÁRIO ", "FGTS "]:
        if n.upper().startswith(pref):
            n = n[len(pref) :].strip()
            break
    # remove prefixos de rótulos que podem ter sido gerados/introduzidos
    for pref in ["RESCISAO ", "RESCISÃO "]:
        if n.upper().startswith(pref):
            n = n[len(pref) :].strip()
            break
    # remove a palavra RESCISAO/RESCISÃO no final (se houver)
    up = _norm_ascii_upper(n)
    if up.endswith(" RESCISAO"):
        n = n[: -len(" RESCISAO")].strip()
    if up.endswith(" RESCISÃO"):
        n = n[: -len(" RESCISÃO")].strip()
    return " ".join(n.split())


def extrair_pessoa_do_movimento(m: Movimento) -> Optional[str]:
    """
    Extrai um nome de pessoa (se houver) a partir de:
    - Fornecedor (quando é pessoa física)
    - Histórico padronizado (Pagto/Salário/FGTS Nome)
    """
    # 1) fornecedor
    forn = strip_codigo_prefixo(m.fornecedor_raw)
    if forn and is_nome_pessoa(forn):
        return canonicalizar_pessoa(forn)

    h = normalize_text(m.historico)
    if not h:
        return None

    hup = _norm_ascii_upper(h)

    # 2) padrões no histórico
    if hup.startswith("PAGTO "):
        cand = h[6:].strip()
        cand = canonicalizar_pessoa(cand)
        return cand if is_nome_pessoa(cand) else None
    if hup.startswith("SALARIO ") or hup.startswith("SALÁRIO "):
        cand = h.split(" ", 1)[1].strip() if " " in h else ""
        cand = canonicalizar_pessoa(cand)
        return cand if is_nome_pessoa(cand) else None
    if hup.startswith("FGTS "):
        # ignora casos coletivos/sem pessoa
        if "RESCISO" in hup and ("FGTS RESCISAO" == hup or "FGTS RESCISÃO" == hup):
            return None
        # ex: "FGTS Ricardo Fernandes"
        cand = h[5:].strip()
        cand = canonicalizar_pessoa(cand)
        return cand if is_nome_pessoa(cand) else None

    # 2b) padrões com "Rescisão X" (vimos no relatório)
    if hup.startswith("RESCISAO ") or hup.startswith("RESCISÃO "):
        cand = canonicalizar_pessoa(h)
        return cand if is_nome_pessoa(cand) else None

    # 3) fallback: se categoria é rescisão e o texto parece pessoa
    if m.categoria_id in (87, 88, 94):
        cand = canonicalizar_pessoa(h)
        return cand if is_nome_pessoa(cand) else None

    return None


def analisar_pessoas_rescisoes(movs: List[Movimento]) -> Dict[str, Any]:
    """
    Junta por pessoa os pagamentos ligados a:
    - Salários Rescisão (88)
    - FGTS Rescisão (87)
    - Ações Trabalhistas (94) (opcional, mas ajuda a enxergar o total do caso)

    Também calcula quanto de FGTS Rescisão ficou sem identificação de pessoa (ex.: pagamentos coletivos).
    """
    SAL_RES = 88
    FGTS_RES = 87
    ACOES = 94

    fgts_sem_pessoa = 0.0

    # Estrutura por pessoa
    people: Dict[str, Dict[str, Any]] = {}

    # Base de pessoas detectadas em Salários Rescisão (para reconciliar nomes incompletos em FGTS)
    base_salarios: List[str] = []
    for m in movs:
        if not m.is_saida or m.categoria_id != SAL_RES:
            continue
        p = extrair_pessoa_do_movimento(m)
        if p and is_nome_pessoa(p):
            base_salarios.append(p)
    base_salarios = sorted(set(base_salarios))

    def match_por_token(token: str) -> Optional[str]:
        """
        Quando o FGTS vem apenas com um primeiro nome/apelido,
        tentamos casar com algum token de pessoas já vistas em rescisões.
        """
        t = _norm_ascii_upper(token)
        if not t or any(ch.isdigit() for ch in t):
            return None
        best = None
        best_score = 0.0
        second = 0.0
        for nome in base_salarios:
            tokens = [_norm_ascii_upper(x) for x in nome.split() if x]
            score_nome = max((difflib.SequenceMatcher(None, t, tk).ratio() for tk in tokens), default=0.0)
            if score_nome > best_score:
                second = best_score
                best_score = score_nome
                best = nome
            elif score_nome > second:
                second = score_nome
        # thresholds: precisa ser bem próximo e não ambíguo
        if best and best_score >= 0.86 and (best_score - second) >= 0.05:
            return best
        return None

    def ensure(p: str) -> Dict[str, Any]:
        if p not in people:
            people[p] = {
                "pessoa": p,
                "salarios_rescisao_total": 0.0,
                "salarios_rescisao_count": 0,
                "salarios_rescisao_datas": [],
                "salarios_rescisao_ids": [],
                "fgts_rescisao_total": 0.0,
                "fgts_rescisao_count": 0,
                "fgts_rescisao_datas": [],
                "fgts_rescisao_ids": [],
                "acoes_trabalhistas_total": 0.0,
                "acoes_trabalhistas_count": 0,
                "acoes_trabalhistas_datas": [],
                "acoes_trabalhistas_ids": [],
            }
        return people[p]

    for m in movs:
        if not m.is_saida:
            continue
        if m.categoria_id not in (SAL_RES, FGTS_RES, ACOES):
            continue

        pessoa = extrair_pessoa_do_movimento(m)

        if m.categoria_id == FGTS_RES and pessoa is None:
            # tenta um último fallback: "FGTS Rescisão Valdonir" (sem prefixo FGTS)
            # ou textos como "FGTS Rescisão Valdonir" que passaram por normalização.
            h = normalize_text(m.historico)
            hup = _norm_ascii_upper(h)
            if hup.startswith("FGTS RESCISAO ") or hup.startswith("FGTS RESCISÃO "):
                cand = h.split(" ", 2)[2] if len(h.split()) >= 3 else ""
                cand = canonicalizar_pessoa(cand)
                if cand and is_nome_pessoa(cand):
                    pessoa = cand
                elif cand and len(cand.split()) == 1:
                    # tenta casar pelo token com base de rescisões
                    m2 = match_por_token(cand)
                    if m2:
                        pessoa = m2
                    else:
                        fgts_sem_pessoa += m.debito
                        continue
                else:
                    fgts_sem_pessoa += m.debito
                    continue
            else:
                fgts_sem_pessoa += m.debito
                continue

        if pessoa is None:
            # Sem pessoa: ignoramos para a correlação pessoa-a-pessoa
            continue

        rec = ensure(pessoa)
        if m.categoria_id == SAL_RES:
            rec["salarios_rescisao_total"] += m.debito
            rec["salarios_rescisao_count"] += 1
            rec["salarios_rescisao_datas"].append(m.data.strftime("%d/%m/%Y"))
            rec["salarios_rescisao_ids"].append(m.id)
        elif m.categoria_id == FGTS_RES:
            rec["fgts_rescisao_total"] += m.debito
            rec["fgts_rescisao_count"] += 1
            rec["fgts_rescisao_datas"].append(m.data.strftime("%d/%m/%Y"))
            rec["fgts_rescisao_ids"].append(m.id)
        elif m.categoria_id == ACOES:
            rec["acoes_trabalhistas_total"] += m.debito
            rec["acoes_trabalhistas_count"] += 1
            rec["acoes_trabalhistas_datas"].append(m.data.strftime("%d/%m/%Y"))
            rec["acoes_trabalhistas_ids"].append(m.id)

    # Lista final
    pessoas = list(people.values())
    for r in pessoas:
        r["total_geral"] = r["salarios_rescisao_total"] + r["fgts_rescisao_total"] + r["acoes_trabalhistas_total"]
        # Ordena datas para legibilidade
        r["salarios_rescisao_datas"] = sorted(set(r["salarios_rescisao_datas"]))
        r["fgts_rescisao_datas"] = sorted(set(r["fgts_rescisao_datas"]))
        r["acoes_trabalhistas_datas"] = sorted(set(r["acoes_trabalhistas_datas"]))

    pessoas.sort(key=lambda x: x["total_geral"], reverse=True)

    # Pessoas em comum: tem salário rescisão e FGTS rescisão (ambos > 0)
    em_comum = [r for r in pessoas if r["salarios_rescisao_total"] > 0 and r["fgts_rescisao_total"] > 0]
    em_comum.sort(key=lambda x: (x["salarios_rescisao_total"] + x["fgts_rescisao_total"]), reverse=True)

    return {
        "pessoas": pessoas,
        "pessoas_em_comum": em_comum,
        "fgts_rescisao_sem_pessoa_total": fgts_sem_pessoa,
    }


def escrever_classificacao_movimentos(movs: List[Movimento], mov_ins: Dict[str, Any], out_path: Path) -> None:
    """
    Gera um CSV auxiliar (sem alterar o original) com classificação por movimento:
    - classe_fluxo: entrada | custo_operacional | transferencia_interna | implantacao_saldo
    - classe_recorrencia: recorrente_forte | recorrente_frequente | nao_recorrente (apenas para custo_operacional)
    - extraordinario: sim/não (heurística)
    """
    rf = {(s["categoria"], s["entidade"]) for s in mov_ins.get("recorrentes_fortes", [])}
    rfreq = {(s["categoria"], s["entidade"]) for s in mov_ins.get("recorrentes_frequentes", [])}

    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(
            [
                "id",
                "data",
                "mes",
                "tipo",
                "banco",
                "categoria_id",
                "categoria",
                "entidade",
                "descricao",
                "credito",
                "debito",
                "classe_fluxo",
                "classe_recorrencia",
                "extraordinario",
            ]
        )

        for m in movs:
            cat = m.categoria_nome
            ent = entidade_chave_recorrencia(m)
            key = (cat, ent)

            if m.is_entrada:
                classe_fluxo = "entrada"
                classe_rec = ""
            elif m.is_saida and m.categoria_id == CAT_TRANSFERENCIA_INTERNA:
                classe_fluxo = "transferencia_interna"
                classe_rec = ""
            elif m.is_saida and m.categoria_id == CAT_IMPLANTACAO_SALDO:
                classe_fluxo = "implantacao_saldo"
                classe_rec = ""
            elif m.is_saida:
                classe_fluxo = "custo_operacional"
                if key in rf:
                    classe_rec = "recorrente_forte"
                elif key in rfreq:
                    classe_rec = "recorrente_frequente"
                else:
                    classe_rec = "nao_recorrente"
            else:
                classe_fluxo = "outro"
                classe_rec = ""

            extra = "sim" if is_extraordinario(cat, ent, m.historico) else "nao"

            w.writerow(
                [
                    m.id,
                    m.data.strftime("%d/%m/%Y"),
                    m.mes,
                    m.tipo,
                    m.banco,
                    m.categoria_id,
                    cat,
                    ent,
                    m.historico,
                    f"{m.credito:.2f}",
                    f"{m.debito:.2f}",
                    classe_fluxo,
                    classe_rec,
                    extra,
                ]
            )


def classify_recorrencia_movimentos(movs: List[Movimento]) -> Dict[str, Any]:
    """
    Classifica recorrência em movimentos (saídas), por fornecedor+categoria,
    e separa claramente itens extraordinários típicos (rescisões, ações, implantação, etc.).
    """
    entradas = [m for m in movs if m.is_entrada]
    saidas = [m for m in movs if m.is_saida]
    # Separações importantes:
    # - transferências internas e implantação de saldo não são "custo operacional"
    saidas_transfer = [m for m in saidas if m.categoria_id == CAT_TRANSFERENCIA_INTERNA]
    entradas_transfer = [m for m in entradas if m.categoria_id == CAT_TRANSFERENCIA_INTERNA]
    saidas_implant = [m for m in saidas if m.categoria_id == CAT_IMPLANTACAO_SALDO]
    # Custos operacionais (o que de fato "consome" caixa)
    saidas_operacionais = [m for m in saidas if m.categoria_id not in EXCLUIR_CATEGORIAS_CUSTO]
    meses = sorted({m.mes for m in movs})
    periodo = {"inicio": movs[0].data, "fim": movs[-1].data, "meses": meses}

    # Agrupamento por chave (fornecedor ou histórico quando não há fornecedor)
    groups: Dict[Tuple[str, str], List[Movimento]] = {}
    for m in saidas_operacionais:
        entidade = entidade_chave_recorrencia(m)
        chave = (m.categoria_nome, entidade)
        groups.setdefault(chave, []).append(m)

    # Estatísticas por grupo
    stats = []
    for (cat, ent), itens in groups.items():
        total = sum(x.debito for x in itens)
        cnt = len(itens)
        meses_g = sorted({x.mes for x in itens})
        dias = sorted({x.data.strftime("%Y-%m-%d") for x in itens})
        valores = sorted([x.debito for x in itens])
        med = quantile(valores, 0.5)
        p90 = quantile(valores, 0.9)
        stats.append(
            {
                "categoria": cat,
                "entidade": ent,
                "total": total,
                "count": cnt,
                "meses": meses_g,
                "dias_distintos": len(dias),
                "mediana": med,
                "p90": p90,
                "top": sorted(itens, key=lambda x: x.debito, reverse=True)[:3],
            }
        )

    # Heurística de recorrência:
    # - Recorrente forte: aparece em >=2 meses e >=2 ocorrências
    # - Recorrente frequente: >=4 ocorrências no período
    # - Variável: recorrente, mas valores com alta dispersão (p90/mediana >= 2.5)
    recorrentes_fortes = []
    recorrentes_frequentes = []
    nao_recorrentes = []

    def is_extraordinario(cat: str, ent: str) -> bool:
        c = cat.lower()
        e = ent.lower()
        # Itens tipicamente extraordinários no contexto de reorganização
        keywords = [
            "rescis",
            "aç",
            "acao",
            "rj",
            "implant",
            "encontro contas",
            "quit",
            "acordo",
        ]
        return any(k in c for k in keywords) or any(k in e for k in keywords)

    for s in stats:
        meses_cnt = len(s["meses"])
        cnt = s["count"]
        if is_extraordinario(s["categoria"], s["entidade"]):
            nao_recorrentes.append(s)
            continue
        if meses_cnt >= 2 and cnt >= 2:
            recorrentes_fortes.append(s)
        elif cnt >= 4:
            recorrentes_frequentes.append(s)
        else:
            nao_recorrentes.append(s)

    # Ordena por impacto
    recorrentes_fortes.sort(key=lambda x: x["total"], reverse=True)
    recorrentes_frequentes.sort(key=lambda x: x["total"], reverse=True)
    nao_recorrentes.sort(key=lambda x: x["total"], reverse=True)

    # Outliers (valores absurdos) por grupo: acima de 3x mediana e acima de R$ 20k
    outliers = []
    for s in stats:
        med = s["mediana"] or 0.0
        if med <= 0:
            continue
        for m in s["top"]:
            if m.debito >= 20000 and m.debito >= 3 * med:
                outliers.append(
                    {
                        "categoria": s["categoria"],
                        "entidade": s["entidade"],
                        "valor": m.debito,
                        "data": m.data.strftime("%d/%m/%Y"),
                        "descricao": m.historico,
                    }
                )
    outliers.sort(key=lambda x: x["valor"], reverse=True)

    # Resumo por categoria (custos operacionais)
    cat_map: Dict[str, List[Movimento]] = {}
    for m in saidas_operacionais:
        cat_map.setdefault(m.categoria_nome, []).append(m)
    categorias_operacionais = []
    for cat, itens in cat_map.items():
        total = sum(x.debito for x in itens)
        meses_cat = sorted({x.mes for x in itens})
        categorias_operacionais.append(
            {
                "categoria": cat,
                "total": total,
                "count": len(itens),
                "meses": meses_cat,
                "por_mes": categoria_breakdown_por_mes(itens),
                "top": sorted(itens, key=lambda x: x.debito, reverse=True)[:5],
            }
        )
    categorias_operacionais.sort(key=lambda x: x["total"], reverse=True)

    # Top movimentos (para inspeção manual)
    top_saidas_oper = [mov_to_dict(m, "debito") for m in sorted(saidas_operacionais, key=lambda x: x.debito, reverse=True)[:40]]
    top_entradas = [mov_to_dict(m, "credito") for m in sorted(entradas, key=lambda x: x.credito, reverse=True)[:20]]
    top_transfer = [mov_to_dict(m, "debito") for m in sorted(saidas_transfer, key=lambda x: x.debito, reverse=True)[:15]]

    # Possíveis duplicidades (mesma data + categoria + entidade + valor)
    dup_map: Dict[Tuple[str, str, str, float], List[Movimento]] = {}
    for m in saidas_operacionais:
        ent = entidade_chave_recorrencia(m)
        k = (m.data.strftime("%Y-%m-%d"), m.categoria_nome, ent, round(m.debito, 2))
        dup_map.setdefault(k, []).append(m)
    duplicidades = []
    for (dia, cat, ent, val), itens in dup_map.items():
        if len(itens) < 2:
            continue
        # só sinaliza se valor relevante (evitar ruído de tarifas pequenas)
        if val < 1000:
            continue
        duplicidades.append(
            {
                "dia": dia,
                "categoria": cat,
                "entidade": ent,
                "valor": val,
                "qtd": len(itens),
                "ids": [x.id for x in itens],
            }
        )
    duplicidades.sort(key=lambda x: x["valor"] * x["qtd"], reverse=True)

    return {
        "periodo": periodo,
        "saidas_total": sum(m.debito for m in saidas),
        "entradas_total": sum(m.credito for m in entradas),
        "saidas_operacionais_total": sum(m.debito for m in saidas_operacionais),
        "transferencias_debito_total": sum(m.debito for m in saidas_transfer),
        "transferencias_credito_total": sum(m.credito for m in entradas_transfer),
        "implantacao_total": sum(m.debito for m in saidas_implant),
        "recorrentes_fortes": recorrentes_fortes,
        "recorrentes_frequentes": recorrentes_frequentes,
        "nao_recorrentes": nao_recorrentes,
        "outliers": outliers,
        "categorias_operacionais": categorias_operacionais,
        "top_saidas_operacionais": top_saidas_oper,
        "top_entradas": top_entradas,
        "top_transferencias": top_transfer,
        "duplicidades": duplicidades,
    }


def classify_recorrencia_contas(contas: List[ContaPagar]) -> Dict[str, Any]:
    """
    Sinaliza recorrência a partir da base complementar:
    - fornecedores/categorias que aparecem em múltiplos meses de vencimento
    - projeção de compromissos (saldo aberto) por mês de vencimento
    """
    # Considera apenas títulos não cancelados (e com valor relevante)
    valid = [c for c in contas if c.status.lower() != "cancelada" and (c.valor or c.saldo_aberto)]

    # Projeção por mês (saldo aberto)
    proj: Dict[str, float] = {}
    aberto_por_mes_categoria: Dict[str, Dict[str, float]] = {}
    aberto_por_mes_entidade: Dict[str, Dict[str, float]] = {}
    aberto_categoria_total: Dict[str, float] = {}
    aberto_entidade_total: Dict[str, float] = {}
    for c in valid:
        if c.saldo_aberto <= 0:
            continue
        mk = c.mes_vencimento
        proj[mk] = proj.get(mk, 0.0) + c.saldo_aberto
        cat = c.categoria_nome
        ent = c.fornecedor or c.titulo or "Sem identificação"
        aberto_por_mes_categoria.setdefault(mk, {})
        aberto_por_mes_categoria[mk][cat] = aberto_por_mes_categoria[mk].get(cat, 0.0) + c.saldo_aberto
        aberto_por_mes_entidade.setdefault(mk, {})
        aberto_por_mes_entidade[mk][ent] = aberto_por_mes_entidade[mk].get(ent, 0.0) + c.saldo_aberto
        aberto_categoria_total[cat] = aberto_categoria_total.get(cat, 0.0) + c.saldo_aberto
        aberto_entidade_total[ent] = aberto_entidade_total.get(ent, 0.0) + c.saldo_aberto

    # Recorrência por fornecedor+categoria (baseado em meses de vencimento)
    groups: Dict[Tuple[str, str], List[ContaPagar]] = {}
    for c in valid:
        ent = c.fornecedor or c.titulo or "Sem identificação"
        chave = (c.categoria_nome, ent)
        groups.setdefault(chave, []).append(c)

    stats = []
    for (cat, ent), itens in groups.items():
        meses = sorted({x.mes_vencimento for x in itens if x.vencimento})
        cnt = len(itens)
        total_aberto = sum(x.saldo_aberto for x in itens if x.saldo_aberto > 0)
        total_valor = sum(x.valor for x in itens)
        stats.append(
            {
                "categoria": cat,
                "entidade": ent,
                "count": cnt,
                "meses": meses,
                "meses_count": len(meses),
                "aberto": total_aberto,
                "total": total_valor,
                "top_aberto": sorted([x for x in itens if x.saldo_aberto > 0], key=lambda x: x.saldo_aberto, reverse=True)[:3],
            }
        )

    recorrentes = [s for s in stats if s["meses_count"] >= 2 and s["count"] >= 2]
    recorrentes.sort(key=lambda x: x["aberto"], reverse=True)

    # Alertas: sem categoria, saldo aberto negativo, valores muito altos
    alertas = []
    for c in valid:
        if c.categoria_id == 0:
            alertas.append(
                {
                    "tipo": "Sem categoria",
                    "entidade": c.fornecedor or c.titulo,
                    "valor": c.saldo_aberto if c.saldo_aberto > 0 else c.valor,
                    "venc": c.vencimento.strftime("%d/%m/%Y") if c.vencimento else "sem-data",
                    "status": c.status,
                }
            )
        if c.saldo_aberto < 0:
            alertas.append(
                {
                    "tipo": "Saldo aberto negativo (ajuste/estorno?)",
                    "entidade": c.fornecedor or c.titulo,
                    "valor": c.saldo_aberto,
                    "venc": c.vencimento.strftime("%d/%m/%Y") if c.vencimento else "sem-data",
                    "status": c.status,
                }
            )
        if c.saldo_aberto > 50000:
            alertas.append(
                {
                    "tipo": "Compromisso alto em aberto",
                    "entidade": c.fornecedor or c.titulo,
                    "valor": c.saldo_aberto,
                    "venc": c.vencimento.strftime("%d/%m/%Y") if c.vencimento else "sem-data",
                    "status": c.status,
                }
            )

    alertas.sort(key=lambda x: abs(x["valor"]), reverse=True)

    return {
        "projecao_aberto_por_mes": dict(sorted(proj.items())),
        "aberto_por_mes_categoria": {k: dict(sorted(v.items(), key=lambda x: x[1], reverse=True)) for k, v in sorted(aberto_por_mes_categoria.items())},
        "aberto_por_mes_entidade": {k: dict(sorted(v.items(), key=lambda x: x[1], reverse=True)) for k, v in sorted(aberto_por_mes_entidade.items())},
        "aberto_categoria_total": dict(sorted(aberto_categoria_total.items(), key=lambda x: x[1], reverse=True)),
        "aberto_entidade_total": dict(sorted(aberto_entidade_total.items(), key=lambda x: x[1], reverse=True)),
        "recorrentes": recorrentes,
        "alertas": alertas,
        "total_aberto": sum(c.saldo_aberto for c in valid if c.saldo_aberto > 0),
    }


def merge_insights(mov_ins: Dict[str, Any], contas_ins: Dict[str, Any]) -> str:
    inicio = mov_ins["periodo"]["inicio"].strftime("%d/%m/%Y")
    fim = mov_ins["periodo"]["fim"].strftime("%d/%m/%Y")
    meses = ", ".join(mov_ins["periodo"]["meses"])

    entradas_total = mov_ins["entradas_total"]
    saidas_total = mov_ins["saidas_total"]
    saidas_operacionais = mov_ins.get("saidas_operacionais_total", saidas_total)
    transf_debito = mov_ins.get("transferencias_debito_total", 0.0)
    transf_credito = mov_ins.get("transferencias_credito_total", 0.0)
    implantacao = mov_ins.get("implantacao_total", 0.0)

    saldo_periodo = entradas_total - saidas_total
    saldo_operacional_aprox = entradas_total - saidas_operacionais

    # Projeção: escolhe o próximo mês de vencimento mais próximo (>= fim)
    # Se não houver, usa o maior mês disponível.
    proj = contas_ins.get("projecao_aberto_por_mes", {})
    proj_mes = None
    fim_mk = mov_ins["periodo"]["fim"].strftime("%Y-%m")
    for mk in proj.keys():
        if mk >= fim_mk:
            proj_mes = mk
            break
    if proj_mes is None and proj:
        proj_mes = list(proj.keys())[-1]
    proj_val = proj.get(proj_mes, 0.0) if proj_mes else 0.0

    def fmt_por_mes(por_mes: Dict[str, float]) -> str:
        if not por_mes:
            return "—"
        return ", ".join([f"{mk}: {money(v)}" for mk, v in por_mes.items()])

    def top_lines(stats: List[Dict[str, Any]], limit: int = 10) -> str:
        lines = []
        for s in stats[:limit]:
            cat = s["categoria"]
            ent = s["entidade"]
            total = s["total"]
            cnt = s["count"]
            meses_g = ",".join(s["meses"])
            variavel = ""
            med = s.get("mediana", 0.0) or 0.0
            p90 = s.get("p90", 0.0) or 0.0
            if med > 0 and p90 / med >= 2.5:
                variavel = " (variável)"
            lines.append(f"- **{cat}** — {ent}{variavel}: {money(total)} ({cnt}x; meses: {meses_g})")
        return "\n".join(lines) if lines else "- (sem itens)"

    def top_outliers(lines_in: List[Dict[str, Any]], limit: int = 10) -> str:
        out = []
        for o in lines_in[:limit]:
            out.append(
                f"- **{o['categoria']}** — {o['entidade']}: {money(o['valor'])} em {o['data']} (\"{o['descricao']}\")"
            )
        return "\n".join(out) if out else "- (sem outliers relevantes com a heurística atual)"

    def top_categorias_operacionais(cats: List[Dict[str, Any]], limit: int = 18) -> str:
        lines = []
        for c in cats[:limit]:
            lines.append(
                f"- **{c['categoria']}**: {money(c['total'])} ({c['count']} lanç.; por mês: {fmt_por_mes(c['por_mes'])})"
            )
        return "\n".join(lines) if lines else "- (sem categorias)"

    def top_movs(movs_list: List[Dict[str, Any]], limit: int = 20) -> str:
        lines = []
        for m in movs_list[:limit]:
            lines.append(
                f"- {m['data']} — **{m['categoria']}** — {m['entidade']}: {money(m['valor'])} (\"{m['descricao']}\")"
            )
        return "\n".join(lines) if lines else "- (sem itens)"

    def top_duplicidades(dups: List[Dict[str, Any]], limit: int = 15) -> str:
        lines = []
        for d in dups[:limit]:
            try:
                dd = datetime.strptime(d["dia"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except Exception:
                dd = d["dia"]
            ids = ", ".join(d["ids"][:6]) + ("..." if len(d["ids"]) > 6 else "")
            lines.append(
                f"- {dd} — **{d['categoria']}** — {d['entidade']}: {money(d['valor'])} × {d['qtd']} (ids: {ids})"
            )
        return "\n".join(lines) if lines else "- (nenhuma duplicidade relevante detectada com a heurística atual)"

    def top_dict(d: Dict[str, float], limit: int = 12) -> str:
        if not d:
            return "- (sem dados)"
        items = sorted(d.items(), key=lambda x: x[1], reverse=True)
        return "\n".join([f"- **{k}**: {money(v)}" for k, v in items[:limit]])

    # Recorrência "confirmada" pela base complementar (sem citar o arquivo)
    def top_contas_recorrentes(stats: List[Dict[str, Any]], limit: int = 12) -> str:
        out = []
        for s in stats[:limit]:
            meses_count = s["meses_count"]
            aberto = s["aberto"]
            cat = s["categoria"]
            ent = s["entidade"]
            meses_g = ",".join(s["meses"])
            out.append(f"- **{cat}** — {ent}: aberto {money(aberto)} (meses: {meses_g}; {meses_count} meses)")
        return "\n".join(out) if out else "- (sem recorrentes detectados na base complementar)"

    def top_alertas_contas(alertas: List[Dict[str, Any]], limit: int = 12) -> str:
        out = []
        for a in alertas[:limit]:
            out.append(
                f"- **{a['tipo']}** — {a['entidade']}: {money(a['valor'])} (venc: {a['venc']}; status: {a['status']})"
            )
        return "\n".join(out) if out else "- (sem alertas)"

    md: List[str] = []
    md.append("# Análise de Recorrência e Insights Financeiros (Maclinea)\n")
    md.append(f"**Período analisado (movimentos):** {inicio} → {fim}  \n")
    md.append(f"**Meses no período:** {meses}\n")
    md.append("\n---\n")

    md.append("## Visão geral (movimentos)\n")
    md.append(f"- **Entradas totais:** {money(entradas_total)}\n")
    md.append(f"- **Saídas totais (inclui transferências e ajustes):** {money(saidas_total)}\n")
    md.append(f"- **Saídas operacionais (exclui transferências internas e implantação):** {money(saidas_operacionais)}\n")
    if transf_debito or transf_credito:
        md.append(f"- **Transferências internas (débitos):** {money(transf_debito)}\n")
        md.append(f"- **Transferências internas (créditos):** {money(transf_credito)}\n")
    if implantacao:
        md.append(f"- **Implantação de saldo (ajuste):** {money(implantacao)}\n")
    md.append(f"- **Saldo do período (entradas - saídas):** {money(saldo_periodo)}\n")
    md.append(f"- **Saldo operacional aproximado (entradas - saídas operacionais):** {money(saldo_operacional_aprox)}\n")
    md.append(
        "\n> Nota: transferências internas movimentam caixa, mas **não são custo**. Elas podem inflar entradas/saídas totais se misturadas com despesas.\n"
    )

    md.append("\n---\n")
    md.append("## Onde o dinheiro saiu (top categorias operacionais)\n")
    md.append(top_categorias_operacionais(mov_ins.get("categorias_operacionais", []), limit=18))

    md.append("\n---\n")
    md.append("## Principais saídas (maiores pagamentos) — inspeção\n")
    md.append(top_movs(mov_ins.get("top_saidas_operacionais", []), limit=25))

    md.append("\n---\n")
    md.append("## Principais entradas — inspeção\n")
    md.append(top_movs(mov_ins.get("top_entradas", []), limit=12))

    if mov_ins.get("top_transferencias"):
        md.append("\n---\n")
        md.append("## Transferências internas — maiores movimentações\n")
        md.append(top_movs(mov_ins.get("top_transferencias", []), limit=12))

    md.append("\n---\n")
    md.append("## Possíveis duplicidades (mesmo dia/valor/categoria)\n")
    md.append(top_duplicidades(mov_ins.get("duplicidades", []), limit=15))

    md.append("\n---\n")
    md.append("## O que é recorrente (com base no comportamento observado)\n")
    md.append("### Recorrentes fortes (aparecem em mais de um mês)\n")
    md.append(top_lines(mov_ins.get("recorrentes_fortes", []), limit=12))
    md.append("\n\n### Recorrentes frequentes (muitas ocorrências no período)\n")
    md.append(top_lines(mov_ins.get("recorrentes_frequentes", []), limit=12))
    md.append(
        "\n\n> Itens marcados como **(variável)** indicam grande dispersão de valores — normalmente compras/serviços sob demanda.\n"
    )

    md.append("\n---\n")
    md.append("## O que é não recorrente / extraordinário (tende a distorcer o mês)\n")
    md.append("### Principais blocos (por impacto total)\n")
    md.append(top_lines(mov_ins.get("nao_recorrentes", []), limit=12))
    md.append(
        "\n\n**Leitura analítica:** no contexto atual, despesas trabalhistas (rescisões/acordos) e itens ligados a RJ tendem a ser **temporários**. Ao final dessa fase, a “linha de base” mensal deve reduzir.\n"
    )

    md.append("\n---\n")
    md.append("## Alertas de valores fora do padrão (movimentos)\n")
    md.append(top_outliers(mov_ins.get("outliers", []), limit=12))

    md.append("\n---\n")
    md.append("## Projeção e recorrência baseada em compromissos (base complementar)\n")
    md.append(f"- **Total em aberto (compromissos não cancelados):** {money(contas_ins.get('total_aberto', 0.0))}\n")
    if proj_mes:
        md.append(f"- **Projeção de aberto no mês {proj_mes}:** {money(proj_val)}\n")
        aberto_mes_cat = contas_ins.get("aberto_por_mes_categoria", {}).get(proj_mes, {})
        md.append("\n### Top categorias do mês projetado (em aberto)\n")
        md.append(top_dict(aberto_mes_cat, limit=12))
    md.append("\n### Itens recorrentes detectados na base complementar (múltiplos meses)\n")
    md.append(top_contas_recorrentes(contas_ins.get("recorrentes", []), limit=12))
    md.append("\n\n### Alertas na base complementar (dados faltantes / ajustes / valores altos)\n")
    md.append(top_alertas_contas(contas_ins.get("alertas", []), limit=12))

    md.append("\n---\n")
    md.append("## Recomendações práticas (para reduzir ruído e melhorar previsões)\n")
    md.append("- **Padronizar categorias vazias**: itens sem categoria escondem custos e dificultam auditoria.\n")
    md.append("- **Separar recorrente fixo vs variável**: aluguel/serviços fixos vs compras/serviços sob demanda.\n")
    md.append("- **Criar um baseline mensal**: após a fase extraordinária (trabalhista/RJ), recalcular média mensal por categoria.\n")
    md.append("- **Monitorar outliers**: pagamentos muito acima da mediana do fornecedor/categoria.\n")
    md.append("- **Atacar custo financeiro**: juros/IOF/tarifas viram custo fixo invisível se não forem controlados.\n")

    md.append("\n---\n")
    md.append("## Nota de confiança\n")
    md.append(
        "O período disponível cobre ~6 semanas; portanto, a recorrência foi inferida por heurísticas e sinais da base complementar. Para precisão máxima, ideal ter 3–6 meses de histórico.\n"
    )

    return "\n".join(md) + "\n"


def gerar_md_pessoas_rescisoes(pes_ins: Dict[str, Any]) -> str:
    em_comum = pes_ins.get("pessoas_em_comum", [])
    pessoas = pes_ins.get("pessoas", [])
    fgts_sem_pessoa = pes_ins.get("fgts_rescisao_sem_pessoa_total", 0.0)

    def linha_pessoa(r: Dict[str, Any]) -> str:
        sal = r["salarios_rescisao_total"]
        fgts = r["fgts_rescisao_total"]
        aco = r["acoes_trabalhistas_total"]
        sal_n = r["salarios_rescisao_count"]
        fgts_n = r["fgts_rescisao_count"]
        aco_n = r["acoes_trabalhistas_count"]
        return (
            f"- **{r['pessoa']}**: "
            f"Rescisão {money(sal)} ({sal_n}x) | "
            f"FGTS {money(fgts)} ({fgts_n}x) | "
            f"Ações {money(aco)} ({aco_n}x)"
        )

    md: List[str] = []
    md.append("# Pessoas em comum: Salários Rescisão x FGTS Rescisão\n")
    md.append("Esta seção cruza pagamentos por pessoa para identificar casos em que o mesmo colaborador recebeu **rescisão** e também houve **FGTS de rescisão** associado.\n")
    md.append("\n---\n")

    md.append("## Pessoas com Rescisão **e** FGTS (em comum)\n")
    if em_comum:
        md.extend([linha_pessoa(r) for r in em_comum[:60]])
    else:
        md.append("- (nenhuma pessoa encontrada com ambos os tipos, pela heurística atual)\n")

    md.append("\n---\n")
    md.append("## Observação importante (FGTS sem pessoa identificável)\n")
    md.append(
        f"- **FGTS Rescisão sem identificação de pessoa (coletivo/sem nome):** {money(float(fgts_sem_pessoa))}\n"
    )
    md.append(
        "> Isso normalmente acontece quando o histórico vem como \"FGTS Rescisão\" (genérico) ou pagamento coletivo. Para atribuir por pessoa, precisa aparecer o nome no histórico/fornecedor.\n"
    )

    md.append("\n---\n")
    md.append("## Top 60 pessoas por valor total (Rescisão + FGTS + Ações)\n")
    md.extend([linha_pessoa(r) for r in pessoas[:60]])

    md.append("\n")
    return "\n".join(md)


def escrever_csv_pessoas(pes_ins: Dict[str, Any], out_path: Path) -> None:
    pessoas = pes_ins.get("pessoas", [])
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(
            [
                "pessoa",
                "salarios_rescisao_total",
                "salarios_rescisao_count",
                "salarios_rescisao_datas",
                "fgts_rescisao_total",
                "fgts_rescisao_count",
                "fgts_rescisao_datas",
                "acoes_trabalhistas_total",
                "acoes_trabalhistas_count",
                "acoes_trabalhistas_datas",
                "total_geral",
            ]
        )
        for r in pessoas:
            w.writerow(
                [
                    r["pessoa"],
                    f"{r['salarios_rescisao_total']:.2f}",
                    r["salarios_rescisao_count"],
                    ",".join(r["salarios_rescisao_datas"]),
                    f"{r['fgts_rescisao_total']:.2f}",
                    r["fgts_rescisao_count"],
                    ",".join(r["fgts_rescisao_datas"]),
                    f"{r['acoes_trabalhistas_total']:.2f}",
                    r["acoes_trabalhistas_count"],
                    ",".join(r["acoes_trabalhistas_datas"]),
                    f"{r['total_geral']:.2f}",
                ]
            )


def main() -> None:
    if not MOVIMENTOS_CSV.exists():
        raise SystemExit(f"Arquivo não encontrado: {MOVIMENTOS_CSV}")
    if not CONTAS_PAGAR_CSV.exists():
        raise SystemExit(f"Arquivo não encontrado: {CONTAS_PAGAR_CSV}")

    movs = ler_movimentos(MOVIMENTOS_CSV)
    contas = ler_contas_pagar(CONTAS_PAGAR_CSV)

    mov_ins = classify_recorrencia_movimentos(movs)
    contas_ins = classify_recorrencia_contas(contas)
    pes_ins = analisar_pessoas_rescisoes(movs)

    md = merge_insights(mov_ins, contas_ins)
    OUT_MD.write_text(md, encoding="utf-8")
    escrever_classificacao_movimentos(movs, mov_ins, OUT_CLASSIFICACAO_CSV)
    OUT_PESSOAS_MD.write_text(gerar_md_pessoas_rescisoes(pes_ins), encoding="utf-8")
    escrever_csv_pessoas(pes_ins, OUT_PESSOAS_CSV)

    # Evita caracteres fora do codepage do console Windows
    print("OK: Relatorio gerado:", OUT_MD)
    print("   - Classificacao CSV:", OUT_CLASSIFICACAO_CSV)
    print("   - Pessoas (MD):", OUT_PESSOAS_MD)
    print("   - Pessoas (CSV):", OUT_PESSOAS_CSV)
    print("   - Movimentos:", len(movs))
    print("   - Base complementar (contas):", len(contas))
    print("   - Saidas (movimentos):", money(mov_ins["saidas_total"]))
    print("   - Total em aberto:", money(contas_ins["total_aberto"]))


if __name__ == "__main__":
    main()


