"""
Compara PDF do sistema com CSV original
Encontra a diferença de R$ 353.732,77
"""
import csv
import re
import pdfplumber

print("="*70)
print("COMPARACAO PDF DO SISTEMA vs CSV ORIGINAL")
print("="*70)

# 1. Extrai dados do PDF
print("\n[1/4] Extraindo dados do PDF do sistema...")
registros_pdf = []
total_credito_pdf = 0
total_debito_pdf = 0

try:
    with pdfplumber.open('Consulta Movimento Financeiro.pdf') as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                # Procura linhas com padrão: ID Data ... Crédito Débito
                linhas = texto.split('\n')
                for linha in linhas:
                    # Tenta extrair valores de crédito e débito
                    # Padrão comum: ... valor,XX valor,YY ...
                    valores = re.findall(r'(\d{1,3}(?:\.\d{3})*,\d{2})', linha)
                    if len(valores) >= 2:
                        # Extrai documento se possível
                        doc_match = re.search(r'\b(\d{5,7})\b', linha)
                        documento = doc_match.group(1) if doc_match else ''
                        
                        # Pode ter crédito e débito na mesma linha
                        for val in valores[-2:]:  # Pega os 2 últimos valores
                            val_num = float(val.replace('.', '').replace(',', '.'))
                            if val_num > 0:
                                registros_pdf.append({
                                    'documento': documento,
                                    'valor': val_num,
                                    'linha': linha[:80]
                                })
                
                # Procura linha de total
                if 'Total Geral' in texto:
                    match_total = re.search(r'Total Geral.*?(\d{1,3}(?:\.\d{3})*,\d{2}).*?(\d{1,3}(?:\.\d{3})*,\d{2})', texto)
                    if match_total:
                        total_credito_pdf = float(match_total.group(1).replace('.', '').replace(',', '.'))
                        total_debito_pdf = float(match_total.group(2).replace('.', '').replace(',', '.'))

    print(f"  OK: {len(registros_pdf)} registros extraidos do PDF")
    print(f"  Total Credito PDF: R$ {total_credito_pdf:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    print(f"  Total Debito PDF: R$ {total_debito_pdf:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    
except Exception as e:
    print(f"  ERRO ao ler PDF: {e}")
    print("  Instalando pdfplumber...")
    import subprocess
    subprocess.run(['pip', 'install', 'pdfplumber'], check=True)
    print("  Execute novamente!")
    exit()

# 2. Lê o CSV
print("\n[2/4] Lendo CSV original...")
with open('extrato_bradesco_importacao.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    registros_csv = list(reader)

entradas_csv = []
saidas_csv = []

for reg in registros_csv:
    if not reg.get('Data Lançamento', '').strip():
        continue
    
    valor_str = reg.get('Valor Lançamento', '').replace('.', '').replace(',', '.')
    try:
        valor = float(valor_str)
    except:
        continue
    
    if reg['Operação'].upper() == 'ENTRADA':
        entradas_csv.append({
            'doc': reg['Documento'].strip(),
            'data': reg['Data Lançamento'],
            'valor': valor,
            'complemento': reg['Complemento Descrição'][:50]
        })
    else:
        saidas_csv.append({
            'doc': reg['Documento'].strip(),
            'data': reg['Data Lançamento'],
            'valor': valor,
            'complemento': reg['Complemento Descrição'][:50]
        })

total_entradas_csv = sum([e['valor'] for e in entradas_csv])
total_saidas_csv = sum([s['valor'] for s in saidas_csv])

print(f"  OK: {len(entradas_csv)} entradas, {len(saidas_csv)} saidas")
print(f"  Total Entradas CSV: R$ {total_entradas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"  Total Saidas CSV: R$ {total_saidas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

# 3. Comparação
print("\n" + "="*70)
print("COMPARACAO")
print("="*70)

print("\nENTRADAS:")
print(f"  CSV: R$ {total_entradas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
if total_credito_pdf > 0:
    print(f"  PDF: R$ {total_credito_pdf:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    dif_entradas = total_entradas_csv - total_credito_pdf
    print(f"  DIFERENCA: R$ {dif_entradas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\nSAIDAS:")
print(f"  CSV: R$ {total_saidas_csv:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
saidas_esperadas_bradesco = 4072687.81
print(f"  Esperado (Bradesco): R$ {saidas_esperadas_bradesco:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

dif_saidas = total_saidas_csv - saidas_esperadas_bradesco
print(f"  DIFERENCA: R$ {dif_saidas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

if total_debito_pdf > 0:
    print(f"\n  PDF Sistema: R$ {total_debito_pdf:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    dif_sistema = total_saidas_csv - total_debito_pdf
    print(f"  CSV vs Sistema: R$ {dif_sistema:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

# 4. Procura registros problemáticos
print("\n" + "="*70)
print("REGISTROS PROBLEMATICOS")
print("="*70)

# Procura documentos duplicados no CSV
docs_csv = {}
for s in saidas_csv:
    doc = s['doc']
    if doc and doc != '':
        if doc in docs_csv:
            print(f"\nDUPLICADO no CSV: Doc {doc}")
            print(f"  1: {docs_csv[doc]['complemento']}")
            print(f"  2: {s['complemento']}")
            print(f"  Valores: {docs_csv[doc]['valor']} vs {s['valor']}")
        else:
            docs_csv[doc] = s

# Registros sem documento
sem_doc = [s for s in saidas_csv if not s['doc']]
if sem_doc:
    print(f"\nREGISTROS SEM DOCUMENTO: {len(sem_doc)}")
    total_sem_doc = sum([s['valor'] for s in sem_doc])
    print(f"  Total: R$ {total_sem_doc:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
    for s in sem_doc:
        print(f"  - {s['data']}: R$ {s['valor']:,.2f} - {s['complemento']}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\n" + "="*70)




