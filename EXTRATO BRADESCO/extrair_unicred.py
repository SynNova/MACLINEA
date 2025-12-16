"""
Extrai dados do extrato Unicred e gera CSV para importação
"""
import pdfplumber
import re
import csv
from datetime import datetime

print("="*70)
print("EXTRACAO EXTRATO UNICRED")
print("="*70)

registros = []

print("\n[1/3] Extraindo dados do PDF...")

try:
    with pdfplumber.open('Extrato-20251120105541 unicred.pdf') as pdf:
        print(f"  Total de paginas: {len(pdf.pages)}")
        
        for i, pagina in enumerate(pdf.pages, 1):
            print(f"  Processando pagina {i}...")
            texto = pagina.extract_text()
            
            if texto:
                linhas = texto.split('\n')
                
                for linha in linhas:
                    # Procura padrão de data (dd/mm/yyyy ou dd/mm)
                    match_data = re.search(r'(\d{2}/\d{2}(?:/\d{4})?)', linha)
                    
                    if match_data:
                        data = match_data.group(1)
                        
                        # Se não tem ano, adiciona 2025
                        if len(data) == 5:  # dd/mm
                            data = data + '/2025'
                        
                        # Procura valores (formato: 1.234,56 ou 1234,56)
                        valores = re.findall(r'(\d{1,3}(?:\.\d{3})*,\d{2})', linha)
                        
                        if valores:
                            # Determina se é entrada ou saída
                            # Geralmente saídas têm indicadores como (-), Débito, Pgto, etc
                            operacao = 'Saída'
                            
                            # Palavras-chave para entrada
                            if any(palavra in linha.upper() for palavra in ['CREDITO', 'DEPOSITO', 'RECEBIMENTO', 'ENTRADA']):
                                operacao = 'Entrada'
                            elif any(palavra in linha.upper() for palavra in ['DEBITO', 'PAGAMENTO', 'SAQUE', 'TRANSFERENCIA', 'PIX']):
                                operacao = 'Saída'
                            
                            # Extrai documento (número de 4-7 dígitos)
                            match_doc = re.search(r'\b(\d{4,7})\b', linha)
                            documento = match_doc.group(1) if match_doc else ''
                            
                            # Usa o último valor da linha (geralmente é o mais importante)
                            valor = valores[-1]
                            
                            # Descrição = restante da linha
                            descricao = linha.strip()[:100]
                            
                            registros.append({
                                'data': data,
                                'documento': documento,
                                'valor': valor,
                                'operacao': operacao,
                                'descricao': descricao
                            })

    print(f"\n  OK: {len(registros)} registros extraidos")
    
except Exception as e:
    print(f"\n  ERRO: {e}")
    import traceback
    traceback.print_exc()
    exit()

# 2. Remove duplicados
print("\n[2/3] Removendo duplicados...")
registros_unicos = []
vistos = set()

for reg in registros:
    chave = f"{reg['data']}_{reg['documento']}_{reg['valor']}"
    if chave not in vistos:
        vistos.add(chave)
        registros_unicos.append(reg)

print(f"  Antes: {len(registros)}")
print(f"  Depois: {len(registros_unicos)}")
print(f"  Removidos: {len(registros) - len(registros_unicos)}")

# 3. Gera CSV
print("\n[3/3] Gerando CSV...")

arquivo_csv = 'extrato_unicred_importacao.csv'

with open(arquivo_csv, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';')
    
    # Cabeçalho
    writer.writerow([
        'Data Lançamento',
        'Documento',
        'Conta Movimento',
        'Operação',
        'Valor Lançamento',
        'Nr Cheque',
        'Empresa',
        'Plano de Contas',
        'Histórico Movimento',
        'Complemento Descrição'
    ])
    
    # Registros
    for reg in registros_unicos:
        writer.writerow([
            reg['data'],
            reg['documento'],
            '1 - UNICREDI',  # Conta Unicred
            reg['operacao'],
            reg['valor'],
            '',  # Sem cheque
            '1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
            '95 - 1.1.06 - NAO IDENTIFICADO',
            '1 - RECEBIMENTO' if reg['operacao'] == 'Entrada' else '2 - FINANCEIRO',
            reg['descricao']
        ])

print(f"  OK: CSV gerado: {arquivo_csv}")

# 4. Estatísticas
entradas = [r for r in registros_unicos if r['operacao'] == 'Entrada']
saidas = [r for r in registros_unicos if r['operacao'] == 'Saída']

total_entradas = 0
total_saidas = 0

for e in entradas:
    val = float(e['valor'].replace('.', '').replace(',', '.'))
    total_entradas += val

for s in saidas:
    val = float(s['valor'].replace('.', '').replace(',', '.'))
    total_saidas += val

print("\n" + "="*70)
print("ESTATISTICAS")
print("="*70)
print(f"Total de registros: {len(registros_unicos)}")
print(f"  Entradas: {len(entradas)} registros")
print(f"  Saidas: {len(saidas)} registros")
print(f"\nValores:")
print(f"  Entradas: R$ {total_entradas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"  Saidas: R$ {total_saidas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"  Saldo: R$ {total_entradas - total_saidas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\n" + "="*70)
print("PRIMEIROS 10 REGISTROS")
print("="*70)
for i, reg in enumerate(registros_unicos[:10], 1):
    print(f"{i}. {reg['data']} - {reg['operacao']:7} - R$ {reg['valor']:>15} - {reg['descricao'][:50]}")

print("\n" + "="*70)
print(f"CSV CRIADO: {arquivo_csv}")
print("="*70)
print("\nProximo passo: Usar o robo para lancar automaticamente!")
print("="*70)



