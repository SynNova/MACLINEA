# -*- coding: utf-8 -*-
"""
Script para consolidar todos os extratos bancários em um único CSV
Formato de saída baseado no extrato_unicred_novo.csv
"""

import pandas as pd
import os
from datetime import datetime
import warnings
import re
warnings.filterwarnings('ignore')

# Diretório dos extratos
DIRETORIO = r"C:\Users\Administrador\Documents\00_SYNNOVA\00_PROJETOS\MACLINEA\EXTRATOS TODOS OS BANCOS"

# Colunas do CSV final (baseado no extrato_unicred_novo.csv)
COLUNAS_FINAIS = [
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
]

def formatar_data(data):
    """Formata data para DD/MM/YYYY"""
    if pd.isna(data) or data is None:
        return ''
    try:
        if isinstance(data, datetime):
            return data.strftime('%d/%m/%Y')
        elif isinstance(data, str):
            data = data.strip()
            # Tenta diferentes formatos
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y-%m-%d %H:%M:%S']:
                try:
                    return datetime.strptime(data, fmt).strftime('%d/%m/%Y')
                except:
                    continue
            # Se já está no formato correto
            if re.match(r'\d{2}/\d{2}/\d{4}', data):
                return data
            return data
        return str(data)
    except:
        return str(data)

def converter_valor_br(valor_str):
    """Converte valor no formato brasileiro (1.234,56) para float"""
    if pd.isna(valor_str) or valor_str is None or valor_str == '':
        return None
    try:
        if isinstance(valor_str, (int, float)):
            return float(valor_str)
        # Remove espaços
        valor_str = str(valor_str).strip()
        # Formato brasileiro: 1.234,56 -> 1234.56
        # Remove pontos de milhar e troca vírgula por ponto
        if ',' in valor_str and '.' in valor_str:
            valor_str = valor_str.replace('.', '').replace(',', '.')
        elif ',' in valor_str:
            valor_str = valor_str.replace(',', '.')
        return float(valor_str)
    except:
        return None

def processar_banco_brasil(arquivo):
    """
    Processa extratos do Banco do Brasil (XLSX)
    Estrutura:
    - Linha 2: Cabeçalho (Data, observacao, Data balancete, etc.)
    - Dados a partir da linha 3
    - Col 0: Data
    - Col 7: Histórico
    - Col 8: Valor R$
    - Col 9: D/C (Débito=D, Crédito=C)
    """
    print(f"  📁 Processando: {os.path.basename(arquivo)}")
    
    try:
        df = pd.read_excel(arquivo, header=None, engine='openpyxl')
        registros = []
        
        # Dados começam na linha 3 (índice 3)
        for idx in range(3, len(df)):
            row = df.iloc[idx]
            
            data = formatar_data(row.iloc[0])
            historico = str(row.iloc[7]) if not pd.isna(row.iloc[7]) else ''
            valor_str = row.iloc[8]
            tipo = str(row.iloc[9]).strip().upper() if not pd.isna(row.iloc[9]) else ''
            documento = str(row.iloc[5]) if not pd.isna(row.iloc[5]) else ''
            
            # Pula linhas sem data válida ou linhas de rodapé
            if not data or not re.match(r'\d{2}/\d{2}/\d{4}', data):
                continue
            
            # Pula linhas de saldo
            if 'SALDO' in historico.upper():
                continue
            
            valor = converter_valor_br(valor_str)
            if valor is None:
                continue
            
            # D = Débito (Saída), C = Crédito (Entrada)
            operacao = 'Saída' if tipo == 'D' else 'Entrada'
            
            registro = {
                'Data Lançamento': data,
                'Documento': documento if documento != 'nan' else '',
                'Conta Movimento': 'BANCO DO BRASIL',
                'Operação': operacao,
                'Valor Lançamento': abs(valor),
                'Nr Cheque': '',
                'Empresa': 'MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
                'Plano de Contas': '',
                'Histórico Movimento': '2 - FINANCEIRO',
                'Complemento Descrição': historico
            }
            registros.append(registro)
        
        print(f"    ✓ {len(registros)} lançamentos extraídos")
        return registros
        
    except Exception as e:
        print(f"    ✗ ERRO: {e}")
        return []

def processar_itau(arquivo):
    """
    Processa extratos do Itaú (XLSX)
    Estrutura:
    - Cabeçalho na linha 9
    - Dados a partir da linha 10
    - Col 0: Data
    - Col 1: Lançamento (descrição)
    - Col 2: Razão Social
    - Col 3: CPF/CNPJ
    - Col 4: Valor (R$)
    - Col 5: Saldo (R$)
    """
    print(f"  📁 Processando: {os.path.basename(arquivo)}")
    
    try:
        df = pd.read_excel(arquivo, header=None, engine='openpyxl')
        registros = []
        
        # Dados começam na linha 10 (índice 10)
        for idx in range(10, len(df)):
            row = df.iloc[idx]
            
            data = formatar_data(row.iloc[0])
            lancamento = str(row.iloc[1]) if not pd.isna(row.iloc[1]) else ''
            razao_social = str(row.iloc[2]) if not pd.isna(row.iloc[2]) else ''
            valor = row.iloc[4]
            
            # Pula linhas sem data válida
            if not data or not re.match(r'\d{2}/\d{2}/\d{4}', data):
                continue
            
            # Pula linhas de saldo
            if 'SALDO' in lancamento.upper():
                continue
            
            # Valor já vem como float no Itaú
            if pd.isna(valor):
                continue
            
            try:
                valor_num = float(valor)
            except:
                continue
            
            # Determina operação pelo sinal
            operacao = 'Entrada' if valor_num >= 0 else 'Saída'
            
            # Descrição completa
            descricao = lancamento
            if razao_social and razao_social != 'nan':
                descricao += f' - {razao_social}'
            
            registro = {
                'Data Lançamento': data,
                'Documento': '',
                'Conta Movimento': 'ITAU',
                'Operação': operacao,
                'Valor Lançamento': abs(valor_num),
                'Nr Cheque': '',
                'Empresa': 'MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
                'Plano de Contas': '',
                'Histórico Movimento': '2 - FINANCEIRO',
                'Complemento Descrição': descricao
            }
            registros.append(registro)
        
        print(f"    ✓ {len(registros)} lançamentos extraídos")
        return registros
        
    except Exception as e:
        print(f"    ✗ ERRO: {e}")
        return []

def processar_santander(arquivo):
    """
    Processa extratos do Santander (XLSX)
    Estrutura:
    - Cabeçalho na linha 2
    - Dados a partir da linha 3
    - Col 0: Data
    - Col 1: Histórico
    - Col 2: Documento
    - Col 3: Valor (R$)
    - Col 4: Saldo (R$)
    """
    print(f"  📁 Processando: {os.path.basename(arquivo)}")
    
    try:
        df = pd.read_excel(arquivo, header=None, engine='openpyxl')
        registros = []
        
        # Dados começam na linha 3 (índice 3)
        for idx in range(3, len(df)):
            row = df.iloc[idx]
            
            data = formatar_data(row.iloc[0])
            historico = str(row.iloc[1]) if not pd.isna(row.iloc[1]) else ''
            documento = str(row.iloc[2]) if not pd.isna(row.iloc[2]) else ''
            valor = row.iloc[3]
            
            # Pula linhas sem data válida
            if not data or not re.match(r'\d{2}/\d{2}/\d{4}', data):
                continue
            
            # Valor já vem como float
            if pd.isna(valor):
                continue
            
            try:
                valor_num = float(valor)
            except:
                continue
            
            # Determina operação pelo sinal
            operacao = 'Entrada' if valor_num >= 0 else 'Saída'
            
            registro = {
                'Data Lançamento': data,
                'Documento': documento if documento != 'nan' else '',
                'Conta Movimento': 'SANTANDER',
                'Operação': operacao,
                'Valor Lançamento': abs(valor_num),
                'Nr Cheque': '',
                'Empresa': 'MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
                'Plano de Contas': '',
                'Histórico Movimento': '2 - FINANCEIRO',
                'Complemento Descrição': historico
            }
            registros.append(registro)
        
        print(f"    ✓ {len(registros)} lançamentos extraídos")
        return registros
        
    except Exception as e:
        print(f"    ✗ ERRO: {e}")
        return []

def processar_bradesco(arquivo):
    """
    Processa extratos do Bradesco (XLS)
    Estrutura:
    - Cabeçalho na linha 8
    - Dados a partir da linha 9
    - Col 0: Data
    - Col 1: Lançamento (descrição)
    - Col 2: Documento
    - Col 3: Crédito (R$) - formato brasileiro
    - Col 4: Débito (R$) - formato brasileiro
    - Col 5: Saldo (R$)
    """
    print(f"  📁 Processando: {os.path.basename(arquivo)}")
    
    try:
        df = pd.read_excel(arquivo, header=None, engine='xlrd')
        registros = []
        
        # Dados começam na linha 9 (índice 9)
        for idx in range(9, len(df)):
            row = df.iloc[idx]
            
            data = formatar_data(row.iloc[0])
            lancamento = str(row.iloc[1]) if not pd.isna(row.iloc[1]) else ''
            documento = str(row.iloc[2]) if not pd.isna(row.iloc[2]) else ''
            credito = converter_valor_br(row.iloc[3])
            debito = converter_valor_br(row.iloc[4])
            
            # Pula linhas sem data válida
            if not data or not re.match(r'\d{2}/\d{2}/\d{4}', data):
                continue
            
            # Pula linhas de saldo anterior
            if 'SALDO ANTERIOR' in lancamento.upper():
                continue
            
            # Determina valor e operação
            if credito is not None and credito > 0:
                valor = credito
                operacao = 'Entrada'
            elif debito is not None:
                # Débito pode vir negativo ou positivo
                valor = abs(debito)
                operacao = 'Saída'
            else:
                continue
            
            registro = {
                'Data Lançamento': data,
                'Documento': documento if documento != 'nan' else '',
                'Conta Movimento': 'BRADESCO',
                'Operação': operacao,
                'Valor Lançamento': valor,
                'Nr Cheque': '',
                'Empresa': 'MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
                'Plano de Contas': '',
                'Histórico Movimento': '2 - FINANCEIRO',
                'Complemento Descrição': lancamento
            }
            registros.append(registro)
        
        print(f"    ✓ {len(registros)} lançamentos extraídos")
        return registros
        
    except Exception as e:
        print(f"    ✗ ERRO: {e}")
        return []

def processar_caixa_pdf(arquivo):
    """
    Processa extratos da Caixa (PDF)
    Nota: Os PDFs analisados não contêm movimentações, apenas saldo.
    """
    print(f"  📁 Processando: {os.path.basename(arquivo)}")
    
    try:
        import pdfplumber
        
        registros = []
        
        with pdfplumber.open(arquivo) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        # Procura por linhas de lançamento (data no início)
                        match = re.match(r'(\d{2}/\d{2}/\d{4})\s+(\d+)\s+([\w\s]+)\s+([\d.,]+)\s*([CD])?', line)
                        if match:
                            data = match.group(1)
                            documento = match.group(2)
                            historico = match.group(3).strip()
                            valor_str = match.group(4)
                            tipo = match.group(5) if match.group(5) else ''
                            
                            # Pula saldos
                            if 'SALDO' in historico.upper():
                                continue
                            
                            valor = converter_valor_br(valor_str)
                            if valor is None or valor == 0:
                                continue
                            
                            # D = Débito (Saída), C = Crédito (Entrada)
                            operacao = 'Saída' if tipo == 'D' else 'Entrada'
                            
                            registro = {
                                'Data Lançamento': data,
                                'Documento': documento,
                                'Conta Movimento': 'CAIXA',
                                'Operação': operacao,
                                'Valor Lançamento': abs(valor),
                                'Nr Cheque': '',
                                'Empresa': 'MACLINEA MAQUINAS E EQUIPAMENTOS LTDA',
                                'Plano de Contas': '',
                                'Histórico Movimento': '2 - FINANCEIRO',
                                'Complemento Descrição': historico
                            }
                            registros.append(registro)
        
        if len(registros) == 0:
            print(f"    ⚠ Nenhum lançamento encontrado (apenas saldo disponível)")
        else:
            print(f"    ✓ {len(registros)} lançamentos extraídos")
        
        return registros
        
    except ImportError:
        print("    ⚠ pdfplumber não instalado")
        return []
    except Exception as e:
        print(f"    ✗ ERRO: {e}")
        return []

def main():
    print()
    print("╔" + "═" * 58 + "╗")
    print("║" + " CONSOLIDAÇÃO DE EXTRATOS BANCÁRIOS ".center(58) + "║")
    print("║" + " MACLINEA MAQUINAS E EQUIPAMENTOS LTDA ".center(58) + "║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    todos_registros = []
    
    # Processa Banco do Brasil
    print("━" * 60)
    print("📊 BANCO DO BRASIL")
    print("━" * 60)
    for arquivo in ['BANCO DO BRASIL DEZEMBRO.xlsx', 'BANCO DO BRASIL NOVEMBRO.xlsx']:
        caminho = os.path.join(DIRETORIO, arquivo)
        if os.path.exists(caminho):
            registros = processar_banco_brasil(caminho)
            todos_registros.extend(registros)
    
    # Processa Itaú
    print()
    print("━" * 60)
    print("📊 ITAÚ")
    print("━" * 60)
    caminho = os.path.join(DIRETORIO, 'ITAU 3.xlsx')
    if os.path.exists(caminho):
        registros = processar_itau(caminho)
        todos_registros.extend(registros)
    
    # Processa Santander
    print()
    print("━" * 60)
    print("📊 SANTANDER")
    print("━" * 60)
    caminho = os.path.join(DIRETORIO, 'SANTANDER.xlsx')
    if os.path.exists(caminho):
        registros = processar_santander(caminho)
        todos_registros.extend(registros)
    
    # Processa Bradesco
    print()
    print("━" * 60)
    print("📊 BRADESCO")
    print("━" * 60)
    caminho = os.path.join(DIRETORIO, 'BRADESCO.xls')
    if os.path.exists(caminho):
        registros = processar_bradesco(caminho)
        todos_registros.extend(registros)
    
    # Processa Caixa (PDFs)
    print()
    print("━" * 60)
    print("📊 CAIXA (PDFs)")
    print("━" * 60)
    for arquivo in ['CAIXA DEZEMBRO.pdf', 'CX NOVEMBRO.pdf']:
        caminho = os.path.join(DIRETORIO, arquivo)
        if os.path.exists(caminho):
            registros = processar_caixa_pdf(caminho)
            todos_registros.extend(registros)
    
    # Cria DataFrame final
    print()
    print("╔" + "═" * 58 + "╗")
    print("║" + " GERANDO CSV CONSOLIDADO ".center(58) + "║")
    print("╚" + "═" * 58 + "╝")
    
    if todos_registros:
        df_final = pd.DataFrame(todos_registros)
        
        # Garante a ordem das colunas
        df_final = df_final[COLUNAS_FINAIS]
        
        # Formata valores para CSV com vírgula decimal (formato brasileiro)
        df_final['Valor Lançamento'] = df_final['Valor Lançamento'].apply(
            lambda x: str(round(float(x), 2)).replace('.', ',') if x else ''
        )
        
        # Ordena por data
        df_final['_data_sort'] = pd.to_datetime(df_final['Data Lançamento'], format='%d/%m/%Y', errors='coerce')
        df_final = df_final.sort_values('_data_sort')
        df_final = df_final.drop('_data_sort', axis=1)
        
        # Salva CSV
        arquivo_saida = os.path.join(DIRETORIO, 'extratos_consolidados.csv')
        df_final.to_csv(arquivo_saida, sep=';', index=False, encoding='utf-8')
        
        print()
        print(f"  ✅ SUCESSO!")
        print(f"  📄 Arquivo: {arquivo_saida}")
        print(f"  📝 Total de lançamentos: {len(todos_registros)}")
        
        # Mostra resumo por banco
        print()
        print("  ┌" + "─" * 40 + "┐")
        print("  │" + " RESUMO POR BANCO ".center(40) + "│")
        print("  ├" + "─" * 40 + "┤")
        
        resumo = df_final.groupby('Conta Movimento').size().reset_index(name='Lançamentos')
        for _, row in resumo.iterrows():
            banco = row['Conta Movimento']
            qtd = row['Lançamentos']
            print(f"  │  {banco:<25} {qtd:>10} │")
        
        print("  ├" + "─" * 40 + "┤")
        print(f"  │  {'TOTAL':<25} {len(todos_registros):>10} │")
        print("  └" + "─" * 40 + "┘")
        
        # Mostra resumo por operação
        print()
        print("  ┌" + "─" * 40 + "┐")
        print("  │" + " RESUMO POR OPERAÇÃO ".center(40) + "│")
        print("  ├" + "─" * 40 + "┤")
        
        resumo_op = df_final.groupby('Operação').size().reset_index(name='Lançamentos')
        for _, row in resumo_op.iterrows():
            op = row['Operação']
            qtd = row['Lançamentos']
            print(f"  │  {op:<25} {qtd:>10} │")
        
        print("  └" + "─" * 40 + "┘")
        
    else:
        print()
        print("  ⚠️ Nenhum lançamento encontrado para consolidar!")
    
    print()

if __name__ == '__main__':
    main()
