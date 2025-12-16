import pdfplumber
import re
import csv
import json
import pandas as pd

pdf_path = "Bradesco_19112025_175210.pdf"
csv_path = "extrato_bradesco_importacao.csv"
json_path = "extrato_data.js"
excel_path = "Efetivo_28102025.xlsx"

amount_re = re.compile(r'(-?[\d\.]+,\d{2})\s+(-?[\d\.]+,\d{2})$')
date_re = re.compile(r'^(\d{2}/\d{2}/\d{4})')

# Load Employee List
try:
    df_employees = pd.read_excel(excel_path)
    # Normalize to uppercase and strip
    employee_names = set(df_employees['Nome'].astype(str).str.upper().str.strip())
    print(f"Loaded {len(employee_names)} employees.")
except Exception as e:
    print(f"Error loading Excel: {e}")
    employee_names = set()

# Classification Rules
# Format: (Keyword, Account String)
classification_rules = [
    ("MACLINEA", "6 - 00 - Transferencia entre Contas"),
    ("SANEPAR", "64 - 1.4.13 - Agua"),
    ("COPEL", "65 - 1.4.14 - Luz"),
    ("TIM", "63 - 1.4.12 - Telefonia/Fixa/Movel/Internet"),
    ("VIVO", "63 - 1.4.12 - Telefonia/Fixa/Movel/Internet"),
    ("CLARO", "63 - 1.4.12 - Telefonia/Fixa/Movel/Internet"),
    ("OI", "63 - 1.4.12 - Telefonia/Fixa/Movel/Internet"),
    ("TARIFA", "36 - 1.4.02 - Despesas Financeiras"),
    ("TAR ", "36 - 1.4.02 - Despesas Financeiras"),
    ("CESTA", "36 - 1.4.02 - Despesas Financeiras"),
    ("MANUT", "36 - 1.4.02 - Despesas Financeiras"),
    ("IOF", "35 - 2.2.03 - IOF"),
    ("FGTS", "22 - 1.3.01 - FGTS"),
    ("POSTO", "49 - 1.4.07 - Combustivel"),
    ("COMBUSTIVEL", "49 - 1.4.07 - Combustivel"),
    ("ALUGUEL", "52 - 1.4.10 - Aluguel"),
]

# Accounts
ACC_SALARIO = "95 - 1.1.06 - NAO IDENTIFICADO"  # Changed to NAO IDENTIFICADO as requested
ACC_RESCISAO = "95 - 1.1.06 - NAO IDENTIFICADO" # Changed to NAO IDENTIFICADO as requested
ACC_NAO_IDENTIFICADO = "95 - 1.1.06 - NAO IDENTIFICADO" 

transactions = []

conta_movimento = "6 - BRADESCO"
empresa = "1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA"

ignore_terms = ["Total", "Saldos Invest"]

def is_employee_match(description, employee_list):
    """
    Looser matching logic for employees.
    Checks if significant parts of the employee name are present in the description.
    """
    desc_words = set(description.replace('-', ' ').split())
    
    # Only ignore connectors for splitting
    connectors = {'DA', 'DE', 'DO', 'DOS', 'DAS', 'E'}
    
    for emp in employee_list:
        emp_parts = [p for p in emp.split() if p not in connectors]
        
        if not emp_parts: continue
        
        matches = 0
        for part in emp_parts:
            if part in desc_words:
                matches += 1
        
        if len(emp_parts) >= 2:
            if matches >= 2: 
                return True
            if len(emp_parts) > 2 and emp_parts[0] in desc_words and emp_parts[-1] in desc_words:
                return True
        elif len(emp_parts) == 1:
            if matches == 1:
                return True
                
    return False

try:
    with pdfplumber.open(pdf_path) as pdf:
        all_text_lines = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                all_text_lines.extend(lines)

    amount_indices = []
    for i, line in enumerate(all_text_lines):
        if any(term in line for term in ignore_terms):
            continue
        if amount_re.search(line):
            amount_indices.append(i)

    current_date = ""

    for i, idx in enumerate(amount_indices):
        line = all_text_lines[idx]
        match = amount_re.search(line)
        amount_str = match.group(1)
        amount_float = float(amount_str.replace('.', '').replace(',', '.'))
        
        if amount_float < 0:
            operacao = "Saída"
            historico_movimento = "2 - FINANCEIRO"
        else:
            operacao = "Entrada"
            historico_movimento = "1 - RECEBIMENTO"
            
        valor_lancamento = f"{abs(amount_float):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

        date_match = date_re.search(line)
        if date_match:
            current_date = date_match.group(1)
        
        if not current_date:
            continue

        line_text_only = line[:match.start()].strip()
        if date_match:
            line_text_only = line_text_only[len(current_date):].strip()
        
        prev_line = all_text_lines[idx-1] if idx > 0 else ""
        next_line = all_text_lines[idx+1] if idx < len(all_text_lines)-1 else ""
        
        documento = ""
        if line_text_only.replace('.', '').isdigit():
            documento = line_text_only
        
        if "SALDO ANTERIOR" in prev_line:
            continue

        clean_prev = prev_line.strip()
        clean_next = next_line.strip()
        if "Extrato Mensal" in clean_prev: clean_prev = ""
        
        full_desc = f"{clean_prev} {clean_next}".strip()
        upper_desc = full_desc.upper()

        plano_contas = ""
        
        # 1. Static Rules
        for keyword, account in classification_rules:
            if keyword in upper_desc:
                plano_contas = account
                break
        
        # 2. Salary / Rescission Logic (Only if not matched yet)
        if not plano_contas:
            name_match = re.search(r'DES:\s+(.*?)(?:\s\d{2}/\d{2}|$)', upper_desc)
            
            if "TRANSFERENCIA PIX" in upper_desc or "PIX QR CODE" in upper_desc:
                if name_match:
                    extracted_name = name_match.group(1).strip()
                    
                    if is_employee_match(upper_desc, employee_names):
                        plano_contas = ACC_SALARIO
                    else:
                        if len(extracted_name) > 3 and not any(char.isdigit() for char in extracted_name):
                             plano_contas = ACC_RESCISAO
                else:
                    if is_employee_match(upper_desc, employee_names):
                        plano_contas = ACC_SALARIO

        # 3. Fallback
        if not plano_contas:
            plano_contas = ACC_NAO_IDENTIFICADO

        transactions.append({
            'Data Lançamento': current_date,
            'Documento': documento,
            'Conta Movimento': conta_movimento,
            'Operação': operacao,
            'Valor Lançamento': valor_lancamento,
            'Nr Cheque': "",
            'Empresa': empresa,
            'Plano de Contas': plano_contas, 
            'Histórico Movimento': historico_movimento,
            'Complemento Descrição': full_desc
        })

    fieldnames = ['Data Lançamento', 'Documento', 'Conta Movimento', 'Operação', 
                  'Valor Lançamento', 'Nr Cheque', 'Empresa', 'Plano de Contas', 
                  'Histórico Movimento', 'Complemento Descrição']
                  
    with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()
        writer.writerows(transactions)

    # Save as JSON (JS variable)
    with open(json_path, 'w', encoding='utf-8') as f:
        json_content = json.dumps(transactions, ensure_ascii=False, indent=4)
        f.write(f"const extratoData = {json_content};")

    print(f"Generated {csv_path} and {json_path} with {len(transactions)} records.")

except Exception as e:
    print(f"Error: {e}")
