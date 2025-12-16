# 🗺️ MAPEAMENTO COMPLETO - OCTUS ERP
## Sistema de Cliente/Fornecedores

**Data:** 25/11/2025  
**Sistema:** Octus ERP v2025.05  
**URL Base:** http://192.168.0.247:4586

---

## 📁 ESTRUTURA DE IFRAMES

O sistema Octus usa múltiplos iframes aninhados:

### Iframes Identificados:
```javascript
// PÁGINA PRINCIPAL
- document.querySelectorAll('iframe')[0] → #iframe_10008 (Dashboard)
- document.querySelectorAll('iframe')[1] → #iframe_11 (CliFor_cons - PRINCIPAL)
- document.querySelectorAll('iframe')[2] → #iframeConsulta (Consulta adicional)
```

### ⚠️ **IFRAME CORRETO PARA AUTOMAÇÃO:**
```javascript
// Use o ID direto:
const iframe = document.querySelector('#iframe_11');
const iframeDoc = iframe.contentDocument;
```

---

## 🔍 TELA DE LISTAGEM (CliFor_cons)

### URL do Iframe:
```
http://192.168.0.247:4586/CliFor_cons
```

### Campo de Busca Rápida:
```javascript
// ✅ MAPEADO E TESTADO
ID: SC_fast_search_top
Name: nmgp_arg_fast_search
Placeholder: "Busca Rapida"
```

### Botão de Busca (IMPORTANTE - É uma IMAGEM!):
```javascript
// ✅ MAPEADO E TESTADO
Tag: <img>
ID: SC_fast_search_submit_top
onclick: nm_gp_submit_qsearch('top');

// MÉTODO CORRETO:
const campo = doc.querySelector('#SC_fast_search_top');
const botao = doc.querySelector('#SC_fast_search_submit_top');
campo.value = '148';
campo.dispatchEvent(new Event('change', { bubbles: true }));
botao.click();  // Clicar na IMAGEM!
```

### Botões da Listagem:
- **+ Novo**: Abre formulário de novo cadastro
- **Editar (ícone lápis)**: `generic[title="Editar o Registro"]` em cada linha
- **Colunas**: Configura colunas visíveis
- **Pesquisar**: Abre filtros avançados

---

## ✏️ FORMULÁRIO DE EDIÇÃO

### Campos Identificados no iframe #iframe_11:

| Campo | ID | Name | Observações |
|-------|------|------|-------------|
| **Data Cadastro** | `id_sc_field_cf_data_cad` | `cf_data_cad` | Readonly/Disabled |
| **CNPJ** | `id_sc_field_cf_cnpjx` | `cf_cnpjx` | Máscara automática |
| **CPF** | `id_sc_field_cf_cpfx` | `cf_cpfx` | Alternativo ao CNPJ |
| **RG/CI** | `id_sc_field_cf_ci` | `cf_ci` | Carteira identidade |
| **Ident. Estrangeiro** | `id_sc_field_cf_identif_estrangeiro` | `cf_identif_estrangeiro` | Para estrangeiros |
| **Inscrição Estadual** | `id_sc_field_cf_inscr_est` | `cf_inscr_est` | IE |
| **Inscrição Municipal** | `id_sc_field_cf_inscrmunicipio` | `cf_inscrmunicipio` | IM |
| **Razão Social** | `id_sc_field_cf_nome_razao` | `cf_nome_razao` | ✅ PRINCIPAL |
| **Nome Fantasia** | `id_sc_field_cf_nome_fantasia` | `cf_nome_fantasia` | ✅ PRINCIPAL |
| **CEP** | `id_sc_field_cf_cepx` | `cf_cepx` | Busca automática |
| **Endereço** | `id_sc_field_cf_endereco` | `cf_endereco` | Logradouro |
| **Número** | `id_sc_field_cf_endereco_nro` | `cf_endereco_nro` | Nº do endereço |
| **Complemento** | `id_sc_field_cf_end_complemento` | `cf_end_complemento` | Apt, Sala, etc |
| **Bairro** | `id_sc_field_cf_bairro` | `cf_bairro` | Bairro |
| **Município** | `id_sc_field_cf_municipio` | `cf_municipio` | Cidade |
| **UF** | `id_sc_field_cf_uf` | `cf_uf` | Estado (sigla) |
| **Telefone 1** | `id_sc_field_cf_telefone1x` | `cf_telefone1x` | Principal |
| **Telefone 2** | `id_sc_field_cf_telefone2x` | `cf_telefone2x` | Secundário |
| **Celular** | `id_sc_field_cf_celularx` | `cf_celularx` | Celular |

---

## 🎯 SELETORES PARA PLAYWRIGHT/SELENIUM

### Padrão de Acesso aos Campos:

```python
# PYTHON - PLAYWRIGHT
iframe = page.frame_locator('#iframe_11')

# Preencher Razão Social
iframe.locator('#id_sc_field_cf_nome_razao').fill('NOME DA EMPRESA')

# Preencher Nome Fantasia  
iframe.locator('#id_sc_field_cf_nome_fantasia').fill('FANTASIA')

# Preencher CNPJ
iframe.locator('#id_sc_field_cf_cnpjx').fill('12345678000100')

# Preencher Endereço
iframe.locator('#id_sc_field_cf_endereco').fill('Rua Exemplo, 123')

# Preencher Telefone
iframe.locator('#id_sc_field_cf_telefone1x').fill('(41) 1234-5678')
```

### JavaScript Puro:
```javascript
const iframe = document.querySelector('#iframe_11');
const doc = iframe.contentDocument;

// Acessar campo
const razaoSocial = doc.querySelector('#id_sc_field_cf_nome_razao');
razaoSocial.value = 'NOME DA EMPRESA';

// Disparar evento change (importante!)
razaoSocial.dispatchEvent(new Event('change', { bubbles: true }));
```

---

## 📋 MAPEAMENTO PLANILHA → OCTUS

| Coluna Planilha | Campo Octus | ID Octus |
|-----------------|-------------|----------|
| `razaosocial` | Razão Social | `#id_sc_field_cf_nome_razao` |
| `nome` | Nome Fantasia | `#id_sc_field_cf_nome_fantasia` |
| `cnpj_cpf` | CNPJ/CPF | `#id_sc_field_cf_cnpjx` ou `#id_sc_field_cf_cpfx` |
| `inscrestad_rg` | Inscrição Estadual | `#id_sc_field_cf_inscr_est` |
| `inscmunicipal` | Inscrição Municipal | `#id_sc_field_cf_inscrmunicipio` |
| `cep` | CEP | `#id_sc_field_cf_cepx` |
| `endereco` | Endereço | `#id_sc_field_cf_endereco` |
| `complemento` | Complemento | `#id_sc_field_cf_end_complemento` |
| `bairro` | Bairro | `#id_sc_field_cf_bairro` |
| `cidade` | Município | `#id_sc_field_cf_municipio` |
| `estado` | UF | `#id_sc_field_cf_uf` |
| `telefone` | Telefone 1 | `#id_sc_field_cf_telefone1x` |
| `email` | Email | `[PRECISA MAPEAR]` |

---

## 🔄 FLUXO COMPLETO DE AUTOMAÇÃO

```
1. LOGIN
   ↓
2. NAVEGAR → Cadastros → Cliente/Fornecedores
   ↓
3. AGUARDAR IFRAME #iframe_11 CARREGAR
   ↓
4. BUSCAR FORNECEDOR (via campo busca rápida)
   ↓
5. CLICAR EM EDITAR (ícone lápis)
   ↓
6. AGUARDAR FORMULÁRIO CARREGAR
   ↓
7. PREENCHER CAMPOS (dentro do iframe #iframe_11)
   ↓
8. CLICAR EM SALVAR
   ↓
9. AGUARDAR CONFIRMAÇÃO
   ↓
10. VOLTAR PARA LISTAGEM
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### Classes CSS:
- Todos os campos têm classe: `sc-js-input`
- Campos podem ter: `scFormInputDisabled` (readonly)
- Padrão de class: `css_{nome_campo}_obj`

### Máscaras Automáticas:
- **CNPJ**: `##.###.###/####-##`
- **CPF**: `###.###.###-##`
- **CEP**: `##.###-###`
- **Telefone**: `(##) ####-####` ou `(##) #####-####`

### Comportamentos Especiais:
1. **CEP**: Ao preencher, busca automática do endereço
2. **CNPJ**: Valida dígitos verificadores
3. **Campos "NULL"**: Sistema usa string "NULL" para vazios

### Timeouts Recomendados:
- Carregamento de página: 30s
- Carregamento de iframe: 10s
- Busca automática (CEP): 5s
- Salvamento: 5s

---

## 🚀 CÓDIGO ATUALIZADO PARA ROBÔ

```python
# Acessar iframe correto
iframe = page.frame_locator('#iframe_11')

# Exemplo de preenchimento completo
campos = {
    'razao_social': iframe.locator('#id_sc_field_cf_nome_razao'),
    'fantasia': iframe.locator('#id_sc_field_cf_nome_fantasia'),
    'cnpj': iframe.locator('#id_sc_field_cf_cnpjx'),
    'ie': iframe.locator('#id_sc_field_cf_inscr_est'),
    'cep': iframe.locator('#id_sc_field_cf_cepx'),
    'endereco': iframe.locator('#id_sc_field_cf_endereco'),
    'bairro': iframe.locator('#id_sc_field_cf_bairro'),
    'municipio': iframe.locator('#id_sc_field_cf_municipio'),
    'uf': iframe.locator('#id_sc_field_cf_uf'),
    'telefone': iframe.locator('#id_sc_field_cf_telefone1x'),
}

# Preencher cada campo
for nome, locator in campos.items():
    if valor_existe:
        locator.fill(str(valor))
        time.sleep(0.1)  # Pequeno delay para processamento
```

---

## ✅ STATUS DO MAPEAMENTO

- [✅] Estrutura de iframes identificada
- [✅] Campos do formulário mapeados
- [✅] IDs dos campos documentados
- [✅] Mapeamento planilha → sistema
- [⏳] Campo de busca rápida (precisa inspeção manual)
- [⏳] Botões Salvar/Voltar (precisa identificar seletores)
- [⏳] Campo de Email (não apareceu nos primeiros 20 inputs)

---

**Próximos Passos:**
1. Identificar seletor do campo de busca rápida na listagem
2. Mapear botões de ação (Salvar, Voltar)
3. Localizar campo de Email no formulário
4. Testar fluxo completo com dados reais

---

**Documentado por:** SynNova AI  
**Última atualização:** 25/11/2025 19:05

