"""Verifica progresso dos lançamentos"""
import json
import csv

# Lê progresso
with open('progresso_lancamento.json', 'r') as f:
    dados = json.load(f)
    lancados = dados['docs_lancados']

# Lê CSV
with open('extrato_bradesco_importacao.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    registros = list(reader)

# Filtra pendentes
pendentes = [r for r in registros 
            if r.get('Documento', '').strip() not in lancados 
            and r.get('Data Lançamento', '').strip()]

print("="*60)
print("STATUS DO LANCAMENTO")
print("="*60)
print(f"Total no CSV: {len(registros)}")
print(f"Ja lancados: {len(lancados)}")
print(f"Pendentes: {len(pendentes)}")
print(f"Progresso: {len(lancados)}/{len(registros)} ({len(lancados)/len(registros)*100:.1f}%)")
print("="*60)
print(f"\nProximos 10 a lancar:")
for i, reg in enumerate(pendentes[:10], 1):
    print(f"  {i}. {reg['Data Lançamento']} - Doc: {reg['Documento']} - {reg['Valor Lançamento']}")




