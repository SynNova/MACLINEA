#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para gerar automação de lançamento em lote
Lê extrato_data.js e cria script JavaScript otimizado
"""

import json
import os

def main():
    # Ler o arquivo extrato_data.js
    arquivo_entrada = "extrato_data.js"
    
    print(f"[*] Lendo arquivo: {arquivo_entrada}")
    
    with open(arquivo_entrada, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extrair apenas o array JSON
    start_idx = content.find('[')
    end_idx = content.rfind(']') + 1
    json_str = content[start_idx:end_idx]
    
    # Parse JSON
    data = json.loads(json_str)
    
    print(f"[OK] Total de registros lidos: {len(data)}")
    print(f"\n[INFO] Amostra dos dados:")
    print(f"  Primeiro: {data[0].get('Data Lancamento')} - Doc {data[0].get('Documento')}")
    print(f"  Ultimo:   {data[-1].get('Data Lancamento')} - Doc {data[-1].get('Documento')}")
    
    # Gerar arquivo JavaScript com todos os dados
    js_content = """// Dados exportados de extrato_data.js
// Gerado automaticamente para automacao de lancamento

const extratoCompleto = """
    
    js_content += json.dumps(data, ensure_ascii=False, indent=2)
    js_content += """;\n\n// Estatisticas\nconst TOTAL_REGISTROS = """ + str(len(data)) + """;\nconst DATA_GERACAO = '""" + json.dumps(data[0].get('Data Lancamento')).strip('"') + """ a """ + json.dumps(data[-1].get('Data Lancamento')).strip('"') + """';\n"""
    
    # Salvar em arquivo
    arquivo_saida = 'extrato_json_completo.js'
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    tamanho_kb = os.path.getsize(arquivo_saida) / 1024
    print(f"\n[OK] Arquivo '{arquivo_saida}' gerado com sucesso!")
    print(f"   Tamanho: {tamanho_kb:.2f} KB")
    print(f"   Registros: {len(data)}")
    
    # Estatísticas adicionais
    operacoes = {}
    datas = {}
    for item in data:
        op = item.get('Operacao', 'Desconhecida')
        operacoes[op] = operacoes.get(op, 0) + 1
        data_item = item.get('Data Lancamento', 'Desconhecida')
        datas[data_item] = datas.get(data_item, 0) + 1
    
    print(f"\n[STATS] Estatisticas dos registros:")
    for op, qtd in sorted(operacoes.items()):
        print(f"   {op}: {qtd} registros")
    
    print(f"\n[DATES] Distribuicao por data:")
    for data_item, qtd in sorted(datas.items()):
        print(f"   {data_item}: {qtd} registros")

if __name__ == '__main__':
    main()

