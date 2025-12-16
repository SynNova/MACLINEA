"""
Script para separar endereço e número em colunas distintas na planilha.
Gera uma nova planilha processada para uso do robô.
"""

import pandas as pd
import re
from pathlib import Path

def separar_endereco_numero(endereco_completo):
    """
    Separa o endereco do numero.
    Exemplos:
        'Rua das Flores 123' -> ('Rua das Flores', '123')
        'Av Brasil, 456' -> ('Av Brasil', '456')
        'Rua ABC 123 A' -> ('Rua ABC', '123 A')
        'Rua sem numero' -> ('Rua sem numero', 'S/N')
    """
    if pd.isna(endereco_completo) or not endereco_completo:
        return '', 'S/N'
    
    endereco = str(endereco_completo).strip()
    
    # Se ja tem S/N ou similar, retorna como esta
    if endereco.upper().endswith('S/N') or endereco.upper().endswith('SN') or endereco.upper().endswith('S.N'):
        return endereco.rsplit(' ', 1)[0].strip(), 'S/N'
    
    # Tentar extrair numero apos virgula (ex: "Rua ABC, 123")
    if ',' in endereco:
        partes = endereco.rsplit(',', 1)
        if len(partes) == 2:
            possivel_numero = partes[1].strip()
            if possivel_numero and possivel_numero[0].isdigit():
                return partes[0].strip(), possivel_numero
    
    # Tentar extrair numero no final com possível complemento (ex: "Rua ABC 123 A" ou "Rua ABC 123-B")
    match = re.search(r'\s+(\d+[\s\-]?[A-Za-z]?)$', endereco)
    if match:
        numero = match.group(1).strip()
        endereco_sem_numero = endereco[:match.start()].strip()
        return endereco_sem_numero, numero
    
    # Tentar numero mais complexo no final (ex: "BR 285 km 74 700")
    match = re.search(r'\s+(\d+(?:\s+[A-Za-z]+\s*\d*)?)$', endereco)
    if match:
        numero = match.group(1).strip()
        endereco_sem_numero = endereco[:match.start()].strip()
        if len(numero) <= 15:
            return endereco_sem_numero, numero
    
    # Nao encontrou numero, retorna endereco completo com S/N
    return endereco, 'S/N'


def processar_planilha():
    """Processa a planilha original e cria nova com endereço e número separados."""
    
    arquivo_original = Path('CLIENTES E FORNECEDORES MACLINEA.xlsx')
    arquivo_processado = Path('CLIENTES E FORNECEDORES PROCESSADO.xlsx')
    
    print("=" * 70)
    print("  PROCESSADOR DE ENDERECOS - Separar Endereco e Numero")
    print("=" * 70)
    
    # Carregar planilha
    print(f"\n[*] Carregando: {arquivo_original}")
    df = pd.read_excel(arquivo_original, dtype={'cnpj_cpf': str})
    total = len(df)
    print(f"    {total} registros carregados")
    
    # Aplicar separacao
    print("\n[*] Separando enderecos e numeros...")
    
    enderecos_separados = []
    numeros_separados = []
    
    com_numero = 0
    sem_numero = 0
    
    for idx, row in df.iterrows():
        endereco_original = row.get('endereco', '')
        endereco, numero = separar_endereco_numero(endereco_original)
        
        enderecos_separados.append(endereco)
        numeros_separados.append(numero)
        
        if numero and numero != 'S/N':
            com_numero += 1
        else:
            sem_numero += 1
        
        # Progresso a cada 1000
        if (idx + 1) % 1000 == 0:
            print(f"   Processados: {idx + 1}/{total}")
    
    # Adicionar novas colunas
    df['endereco_separado'] = enderecos_separados
    df['numero_endereco'] = numeros_separados
    
    # Salvar nova planilha
    print(f"\n[*] Salvando: {arquivo_processado}")
    df.to_excel(arquivo_processado, index=False)
    
    # Estatisticas
    print("\n" + "=" * 70)
    print("  ESTATISTICAS")
    print("=" * 70)
    print(f"  Total de registros:     {total}")
    print(f"  [OK] Com numero extraido:  {com_numero} ({com_numero*100/total:.1f}%)")
    print(f"  [--] Sem numero (S/N):     {sem_numero} ({sem_numero*100/total:.1f}%)")
    
    # Mostrar exemplos
    print("\n" + "=" * 70)
    print("  EXEMPLOS DE SEPARACAO")
    print("=" * 70)
    print(f"  {'ORIGINAL':<40} | {'ENDERECO':<25} | {'NUM'}")
    print("-" * 70)
    
    # Pegar 10 exemplos variados (com e sem numero)
    exemplos = df[['endereco', 'endereco_separado', 'numero_endereco']].dropna().head(15)
    for _, row in exemplos.iterrows():
        orig = str(row['endereco'])[:40]
        end = str(row['endereco_separado'])[:25]
        num = str(row['numero_endereco'])
        print(f"  {orig:<40} | {end:<25} | {num}")
    
    print("\n" + "=" * 70)
    print(f"  [OK] Planilha processada salva em: {arquivo_processado}")
    print("=" * 70)
    
    return arquivo_processado


if __name__ == '__main__':
    processar_planilha()

