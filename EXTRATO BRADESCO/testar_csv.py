"""
Script de teste para verificar leitura do CSV
"""
import csv
import sys

# Configura saída para UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

arquivo = 'extrato_bradesco_importacao.csv'

print("="*60)
print("TESTE DE LEITURA DO CSV")
print("="*60)

# Lê com utf-8-sig para remover BOM
print(f"\nLendo com utf-8-sig (remove BOM)...")
with open(arquivo, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    registros = list(reader)
    
print(f"OK! Total de registros: {len(registros)}")
print(f"\nColunas encontradas:")
if registros:
    for i, col in enumerate(registros[0].keys(), 1):
        print(f"  {i}. '{col}'")

print("\n" + "="*60)
print("REGISTROS JA LANCADOS (serao pulados):")
print("="*60)
docs_lancados = ['169', '168', '8984796', '6605424', '1037148', '49294', '1']
lancados = []
for reg in registros:
    doc = reg.get('Documento', '').strip()
    if doc in docs_lancados:
        lancados.append(reg)
        print(f"OK: {reg.get('Data Lançamento')} - Doc: {doc} - {reg.get('Valor Lançamento')}")
print(f"Total lancados: {len(lancados)}")

print("\n" + "="*60)
print("REGISTROS PENDENTES:")
print("="*60)
pendentes = []
for r in registros:
    doc = r.get('Documento', '').strip()
    data = r.get('Data Lançamento', '').strip()
    if doc not in docs_lancados and data != '':
        pendentes.append(r)

print(f"Total: {len(pendentes)} registros")
print(f"\nPrimeiros 10:")
for i, reg in enumerate(pendentes[:10], 1):
    print(f"{i}. {reg.get('Data Lançamento')} - Doc: {reg.get('Documento')} - {reg.get('Valor Lançamento')}")

