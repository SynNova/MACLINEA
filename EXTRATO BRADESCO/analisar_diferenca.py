"""
Analisa diferença entre CSV esperado e lançado
Encontra valores duplicados ou errados
"""
import csv
import json

print("="*70)
print("ANÁLISE DE DIFERENÇA - ENTRADAS VS SAÍDAS")
print("="*70)

# 1. Lê o CSV original
with open('extrato_bradesco_importacao.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    registros = list(reader)

# 2. Lê progresso
with open('progresso_lancamento.json', 'r') as f:
    dados = json.load(f)
    docs_lancados = dados['docs_lancados']

# 3. Separa entradas e saídas do CSV
entradas_csv = []
saidas_csv = []

for reg in registros:
    data = reg.get('Data Lançamento', '').strip()
    if not data:
        continue
        
    valor_str = reg.get('Valor Lançamento', '').replace('.', '').replace(',', '.')
    try:
        valor = float(valor_str)
    except:
        continue
    
    operacao = reg.get('Operação', '').upper()
    documento = reg.get('Documento', '').strip()
    
    item = {
        'data': data,
        'doc': documento,
        'valor': valor,
        'valor_fmt': reg.get('Valor Lançamento'),
        'complemento': reg.get('Complemento Descrição', '')[:50]
    }
    
    if operacao == 'ENTRADA':
        entradas_csv.append(item)
    else:
        saidas_csv.append(item)

# 4. Verifica quais foram lançados
entradas_lancadas = [e for e in entradas_csv if e['doc'] in docs_lancados or e['doc'] == '']
saidas_lancadas = [s for s in saidas_csv if s['doc'] in docs_lancados or s['doc'] == '']

entradas_pendentes = [e for e in entradas_csv if e['doc'] not in docs_lancados and e['doc'] != '']
saidas_pendentes = [s for s in saidas_csv if s['doc'] not in docs_lancados and s['doc'] != '']

# 5. Calcula totais
total_entradas_csv = sum([e['valor'] for e in entradas_csv])
total_saidas_csv = sum([s['valor'] for s in saidas_csv])

total_entradas_lancadas = sum([e['valor'] for e in entradas_lancadas])
total_saidas_lancadas = sum([s['valor'] for s in saidas_lancadas])

print("\n" + "="*70)
print("ANÁLISE DO CSV ORIGINAL")
print("="*70)
print(f"Total de entradas no CSV: {len(entradas_csv)} registros")
print(f"Valor total ENTRADAS: R$ {total_entradas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print()
print(f"Total de saídas no CSV: {len(saidas_csv)} registros")
print(f"Valor total SAÍDAS: R$ {total_saidas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\n" + "="*70)
print("ANÁLISE DO QUE FOI LANÇADO")
print("="*70)
print(f"Entradas lançadas: {len(entradas_lancadas)} registros")
print(f"Valor ENTRADAS lançadas: R$ {total_entradas_lancadas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print()
print(f"Saídas lançadas: {len(saidas_lancadas)} registros")
print(f"Valor SAÍDAS lançadas: R$ {total_saidas_lancadas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\n" + "="*70)
print("DIFERENÇAS ENCONTRADAS")
print("="*70)

# Valor esperado do PDF
saidas_esperadas_pdf = 4072687.81

dif_saidas = total_saidas_lancadas - saidas_esperadas_pdf

print(f"\nSaídas esperadas (PDF): R$ {saidas_esperadas_pdf:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"Saídas lançadas (CSV): R$ {total_saidas_lancadas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"DIFERENÇA: R$ {dif_saidas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

if abs(dif_saidas - 353732.77) < 1:
    print("\n✓ DIFERENÇA BATE COM O VALOR INFORMADO: R$ 353.732,77")

print("\n" + "="*70)
print("PROCURANDO DUPLICADOS OU ERROS")
print("="*70)

# Procura duplicados
docs_vistos = {}
duplicados = []

for s in saidas_lancadas:
    doc = s['doc']
    if doc and doc != '':
        if doc in docs_vistos:
            duplicados.append({
                'doc': doc,
                'valor': s['valor'],
                'primeira_vez': docs_vistos[doc],
                'segunda_vez': s
            })
        else:
            docs_vistos[doc] = s

if duplicados:
    print(f"\nAVISO: ENCONTRADOS {len(duplicados)} DOCUMENTOS DUPLICADOS:")
    total_duplicado = 0
    for dup in duplicados:
        val_fmt = f"R$ {dup['valor']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        print(f"\nDoc: {dup['doc']} - {val_fmt}")
        print(f"  1: {dup['primeira_vez']['complemento']}")
        print(f"  2: {dup['segunda_vez']['complemento']}")
        total_duplicado += dup['valor']
    print(f"\n>>> TOTAL DUPLICADO: R$ {total_duplicado:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
else:
    print("\nOK: Nenhum documento duplicado encontrado")

# Verifica se há registros sem documento que foram lançados múltiplas vezes
sem_doc_lancados = [s for s in saidas_lancadas if not s['doc']]
if len(sem_doc_lancados) > 0:
    total_sem_doc = sum([s['valor'] for s in sem_doc_lancados])
    print(f"\nAVISO: REGISTROS SEM DOCUMENTO LANCADOS: {len(sem_doc_lancados)}")
    print(f"  Valor total: R$ {total_sem_doc:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    print("\nPrimeiros 10:")
    for i, s in enumerate(sem_doc_lancados[:10], 1):
        val_fmt = f"R$ {s['valor']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        print(f"  {i}. {s['data']} - {val_fmt} - {s['complemento']}")

print("\n" + "="*70)
print("REGISTROS PENDENTES")
print("="*70)
print(f"Entradas pendentes: {len(entradas_pendentes)}")
print(f"Saídas pendentes: {len(saidas_pendentes)}")
print(f"Total pendente: {len(entradas_pendentes) + len(saidas_pendentes)}")

if saidas_pendentes:
    print(f"\nPrimeiras 10 saídas pendentes:")
    for i, s in enumerate(saidas_pendentes[:10], 1):
        print(f"  {i}. {s['data']} - Doc: {s['doc']} - R$ {s['valor_fmt']} - {s['complemento']}")

