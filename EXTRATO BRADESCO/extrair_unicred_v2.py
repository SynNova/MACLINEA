"""
Extrator Unicred V3 - Atualizado
Periodo: 10/11/2025 a 30/11/2025
"""
import pdfplumber
import re
import csv

print("="*70)
print("EXTRACAO UNICRED V3 - NOVO PERIODO")
print("Periodo: 10/11/2025 a 30/11/2025")
print("="*70)

registros = []

print("\n[1/3] Extraindo do PDF...")

with pdfplumber.open('Extrato-20251201171624 unicred.pdf') as pdf:
    for i, pagina in enumerate(pdf.pages, 1):
        print(f"  Pagina {i}/{len(pdf.pages)}...")
        texto = pagina.extract_text()
        
        if not texto:
            continue
        
        linhas = texto.split('\n')
        i = 0
        
        while i < len(linhas):
            linha = linhas[i]
            
            # Verifica se é uma linha de operação (CREDITO ou DEBITO)
            if 'CREDITO' in linha.upper() or 'DEBITO' in linha.upper() or 'DÉBITO' in linha.upper():
                # Determina operação
                operacao = 'Entrada' if 'CREDITO' in linha.upper() or 'CRÉDITO' in linha.upper() else 'Saída'
                
                # Extrai documento (após "Doc.:")
                match_doc = re.search(r'Doc\.:?\s*([^\s/]+)', linha)
                documento = match_doc.group(1).strip() if match_doc else ''
                
                # Descrição principal
                descricao = linha.split('(')[0].strip()
                if 'CREDITO' in descricao or 'DEBITO' in descricao or 'DÉBITO' in descricao:
                    descricao = linha.split('Doc.:')[0].strip()
                
                # Próxima linha geralmente tem data e valor
                if i + 1 < len(linhas):
                    proxima = linhas[i + 1]
                    
                    # Extrai data (dd/mm/yyyy)
                    match_data = re.search(r'(\d{2}/\d{2}/\d{4})', proxima)
                    data = match_data.group(1) if match_data else ''
                    
                    # Extrai valor (pode ter - para débito)
                    # Padrão: R$ 1.234,56 ou - R$ 1.234,56
                    match_valor = re.search(r'-?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})', proxima)
                    valor = match_valor.group(1) if match_valor else ''
                    
                    if data and valor:
                        # Complemento pode estar na linha de descrição adicional
                        complemento = descricao
                        if i + 2 < len(linhas) and not linhas[i + 2].startswith(('CREDITO', 'DEBITO', 'DÉBITO')):
                            complemento += ' ' + linhas[i + 2].strip()
                        
                        registros.append({
                            'data': data,
                            'documento': documento,
                            'valor': valor,
                            'operacao': operacao,
                            'descricao': complemento[:100]
                        })
                        
                        i += 2  # Pula as linhas já processadas
                        continue
            
            i += 1

print(f"\n  OK: {len(registros)} registros extraidos")

# 2. Remove registros de saldo inicial e finais
print("\n[2/3] Filtrando registros válidos...")

registros_validos = []
for reg in registros:
    # Remove registros com valor 0,00
    if reg['valor'] == '0,00':
        continue
    
    # Remove registros de saldo
    if 'Saldo em' in reg['descricao'] or 'Saldo atual' in reg['descricao']:
        continue
    
    registros_validos.append(reg)

print(f"  Antes: {len(registros)}")
print(f"  Validos: {len(registros_validos)}")
print(f"  Removidos: {len(registros) - len(registros_validos)}")

# 3. Gera CSV
print("\n[3/3] Gerando CSV...")

with open('extrato_unicred_novo.csv', 'w', newline='', encoding='utf-8-sig') as f:
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
    for reg in registros_validos:
        writer.writerow([
            reg['data'],
            reg['documento'],
            '1 - UNICREDI',
            reg['operacao'],
            reg['valor'],
            '',
            '1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
            '95 - 1.1.06 - NAO IDENTIFICADO',
            '1 - RECEBIMENTO' if reg['operacao'] == 'Entrada' else '2 - FINANCEIRO',
            reg['descricao']
        ])

print(f"  OK: extrato_unicred_novo.csv")

# 4. Estatísticas
entradas = [r for r in registros_validos if r['operacao'] == 'Entrada']
saidas = [r for r in registros_validos if r['operacao'] == 'Saída']

total_entradas = sum([float(e['valor'].replace('.', '').replace(',', '.')) for e in entradas])
total_saidas = sum([float(s['valor'].replace('.', '').replace(',', '.')) for s in saidas])

print("\n" + "="*70)
print("ESTATISTICAS")
print("="*70)
print(f"Total: {len(registros_validos)} registros")
print(f"  Entradas: {len(entradas)}")
print(f"  Saidas: {len(saidas)}")
print(f"\nValores:")
print(f"  Entradas: R$ {total_entradas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
print(f"  Saidas: R$ {total_saidas:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

print("\n" + "="*70)
print("PRIMEIROS 10 REGISTROS VALIDOS")
print("="*70)
for i, reg in enumerate(registros_validos[:10], 1):
    print(f"{i}. {reg['data']} - {reg['operacao']:7} - Doc: {reg['documento']:15} - R$ {reg['valor']:>12}")

print("\n" + "="*70)
print("ARQUIVO GERADO: extrato_unicred_novo.csv")
print("="*70)
print("\nPROXIMO PASSO: Lancar com o robo!")
print("  python robo_unicred.py")
print("="*70)

