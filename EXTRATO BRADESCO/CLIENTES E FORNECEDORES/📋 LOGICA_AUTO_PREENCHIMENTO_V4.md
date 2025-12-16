# 📋 ROBÔ V4 - LÓGICA DE AUTO-PREENCHIMENTO

## 🎯 PROBLEMAS RESOLVIDOS

### 1. Auto-preenchimento do Sistema
O Octus ERP, ao digitar o CNPJ, **consulta automaticamente** a Receita Federal e preenche:
- Endereço (CEP, Logradouro, Bairro)
- Contato (Telefone, Email)

Se o robô simplesmente sobrescrever esses dados, pode **perder informações atualizadas** da Receita.

### 2. CNPJ/CPF perdendo zeros à esquerda
O Python/Excel lê números como float, perdendo zeros à esquerda:
- `01367615000113` era lido como `1367615000113` ❌

**CORRIGIDO:** Função `formatar_cnpj_cpf()` que:
- CNPJ: preenche com zeros até 14 dígitos
- CPF: preenche com zeros até 11 dígitos

### 3. Email divergente
Quando o email do sistema é diferente do email da planilha:
- **Antes:** Apenas registrava divergência
- **Agora:** Email do sistema fica em "E-mail Principal", email da planilha vai para "E-mail Compras"

## ✅ SOLUÇÃO IMPLEMENTADA

### Fluxo do Robô V4:

```
┌─────────────────────────────────────────────────────────────┐
│  1. PREENCHER CNPJ                                          │
│     └── Dispara eventos (input, change, blur)               │
│                                                             │
│  2. AGUARDAR AUTO-PREENCHIMENTO (3 segundos)                │
│     └── Sistema consulta Receita Federal                    │
│                                                             │
│  3. OBTER VALORES ATUAIS DOS CAMPOS                         │
│     └── CEP, Endereço, Bairro, Telefone, Email              │
│                                                             │
│  4. COMPARAR COM PLANILHA                                   │
│     ├── Se VAZIO → Preencher com dados da planilha          │
│     ├── Se IGUAL → Não fazer nada                           │
│     └── Se DIFERENTE → Registrar divergência (não sobrescreve)│
│                                                             │
│  5. PREENCHER DEMAIS CAMPOS (que não são auto-preenchidos)  │
│     └── Razão Social, Nome Fantasia, Inscrições, etc.       │
└─────────────────────────────────────────────────────────────┘
```

## 📧 LÓGICA ESPECIAL PARA EMAIL

```
┌─────────────────────────────────────────────────────────────┐
│  SISTEMA tem email? ───────────────────────────────────────│
│       │                                                     │
│       ├── NÃO → Preenche "E-mail Principal" com planilha   │
│       │                                                     │
│       └── SIM → É igual ao da planilha?                    │
│                   │                                         │
│                   ├── SIM → Não faz nada                   │
│                   │                                         │
│                   └── NÃO → Mantém sistema em "Principal"  │
│                             Coloca planilha em "Compras"   │
│                             Registra divergência no log    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 ARQUIVOS GERADOS

| Arquivo | Descrição |
|---------|-----------|
| `divergencias_v4.csv` | Lista de divergências para análise manual |
| `erros_v4.csv` | Registros que tiveram erro |
| `robo_v4.log` | Log completo da execução |
| `progresso_v4.json` | Checkpoint para retomar |

## 📊 FORMATO DO ARQUIVO DE DIVERGÊNCIAS

```csv
codigo,nome,campo,valor_sistema,valor_planilha,data
123,EMPRESA LTDA,cf_cepx,86700-000,86703-010,2025-11-25T12:00:00
456,OUTRO LTDA,cf_telefone1x,(43) 9999-0000,(43) 3303-8300,2025-11-25T12:05:00
```

## 🔍 CAMPOS MONITORADOS

### Campos que podem ser AUTO-PREENCHIDOS pelo sistema:

| Campo | ID | Descrição |
|-------|-----|-----------|
| CEP | `cf_cepx` | Auto-preenchido pela Receita |
| Endereço | `cf_endereco` | Auto-preenchido pela Receita |
| Bairro | `cf_bairro` | Auto-preenchido pela Receita |
| Telefone | `cf_telefone1x` | Pode ser auto-preenchido |
| Email | `cf_email` | Pode ser auto-preenchido |

### Campos SEMPRE preenchidos (não afetados):

| Campo | ID | Descrição |
|-------|-----|-----------|
| Razão Social | `cf_nome_razao` | Sempre da planilha |
| Nome Fantasia | `cf_nome_fantasia` | Sempre da planilha |
| Inscrição Estadual | `cf_inscr_est` | Sempre da planilha |
| Inscrição Municipal | `cf_inscrmunicipio` | Sempre da planilha |
| Número | `cf_endereco_nro` | "S/N" se vazio |
| Complemento | `cf_end_complemento` | Sempre da planilha |

## 🚀 COMO EXECUTAR

```bash
# Teste com 5 registros
python robo_fornecedores_v4.py 5

# Processar todos
python robo_fornecedores_v4.py
```

## ⚠️ IMPORTANTE

Após a execução, **SEMPRE verifique** o arquivo `divergencias_v4.csv`:

1. Abra o arquivo no Excel
2. Analise cada divergência
3. Decida se:
   - O valor do sistema está correto (Receita mais atualizada)
   - O valor da planilha precisa ser inserido manualmente

## 📝 EXEMPLO DE LOG

```
[INFO] [1/8055] Processando: 123 - EMPRESA LTDA
[INFO]   Preenchendo CNPJ: 12345678000199
[INFO]   Aguardando auto-preenchimento (3s)...
[INFO]   Valores do sistema obtidos: 5 campos
[WARNING]   ⚠ DIVERGÊNCIA [cf_cepx]: Sistema='86700-000' | Planilha='86703-010'
[INFO]   8 campos preenchidos (excluindo auto-preenchidos)
[INFO]   ✓ Registro 123 atualizado com sucesso
```

## 🔢 FORMATAÇÃO CNPJ/CPF

```python
def formatar_cnpj_cpf(valor):
    # Se float, converte para int (remove decimais)
    if isinstance(valor, float):
        valor = int(valor)
    
    # Extrai apenas números
    apenas_numeros = ''.join(filter(str.isdigit, str(valor)))
    
    # CNPJ = 14 dígitos, CPF = 11 dígitos
    if len(apenas_numeros) > 11:
        return apenas_numeros.zfill(14)  # CNPJ
    else:
        return apenas_numeros.zfill(11)  # CPF
```

**Exemplo:**
- Excel: `1367615000113.0` (float)
- Antes: `1367615000113` (13 dígitos - ERRADO!)
- Agora: `01367615000113` (14 dígitos - CORRETO!)

## ✅ VALIDADO EM: 25/11/2025

