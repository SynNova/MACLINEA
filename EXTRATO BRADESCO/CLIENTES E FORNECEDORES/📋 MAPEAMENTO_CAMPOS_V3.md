# 📋 MAPEAMENTO COMPLETO DE CAMPOS - ROBÔ V3

## ✅ CAMPOS OBRIGATÓRIOS

| Campo Octus | ID do Campo | Tipo | Coluna Planilha | Valor Padrão |
|-------------|-------------|------|-----------------|--------------|
| Data Cadastro * | `cf_data_cad` | input (disabled) | - | Automático |
| Ativo * | `cf_ativo` | **RADIO** | `indativo` | "Sim" se S, "Não" se N |
| Tipo Cadastro * | `cf_tipo` | **SELECT** | - | "Fornecedor" |
| Tipo Pessoa * | `cf_tipo_pessoa` | **RADIO** | `indfisjur` | "Jurídica" se J, "Física" se F |
| Nome/Razão Social * | `cf_nome_razao` | input | `razaosocial` | - |
| CEP * | `cf_cepx` | input | `cep` | apenas números |
| Endereço * | `cf_endereco` | input | `endereco` | - |
| **Número *** | `cf_endereco_nro` | input | - | **"S/N"** |
| Bairro * | `cf_bairro` | input | `bairro` | - |
| Município * | `mu_codigo` | input | - | Manter existente |
| País * | `pa_codigo` | **SELECT** | - | "1058" (Brasil) |
| Telefone 1 * | `cf_telefone1x` | input | `telefone` | apenas números |

## 📝 CAMPOS OPCIONAIS

| Campo Octus | ID do Campo | Tipo | Coluna Planilha |
|-------------|-------------|------|-----------------|
| Nome Fantasia | `cf_nome_fantasia` | input | `nome` |
| CNPJ/CPF | `cf_cnpjx` | input | `cnpj_cpf` |
| Inscrição Estadual | `cf_inscr_est` | input | `inscrestad_rg` |
| Inscrição Municipal | `cf_inscrmunicipio` | input | `inscmunicipal` |
| Complemento | `cf_end_complemento` | input | `complemento` |
| Email Principal | `cf_email` | input | `email` |

## 🎯 TIPOS DE PREENCHIMENTO

### INPUT (Texto)
```javascript
input.value = valor;
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
input.dispatchEvent(new Event('blur', { bubbles: true }));
```

### SELECT (Combobox)
```javascript
select.value = valor;
select.dispatchEvent(new Event('change', { bubbles: true }));
```

### RADIO (Opções)
```javascript
radio.checked = true;
radio.dispatchEvent(new Event('change', { bubbles: true }));
```

## ⚠️ TRATAMENTOS ESPECIAIS

### 1. Campo Número
- Planilha **NÃO TEM** coluna de número
- Usar valor padrão: **"S/N"**

### 2. Município
- O sistema usa código IBGE (ex: 4101507)
- **NÃO ALTERAR** - manter o valor já existente no cadastro
- Apenas preencher se estiver vazio

### 3. Tipo Pessoa
- `indfisjur = "J"` → "Jurídica"
- `indfisjur = "F"` → "Física"
- Padrão: "Jurídica"

### 4. Ativo
- `indativo = "S"` → "Sim"
- `indativo = "N"` → "Não"
- Padrão: "Sim"

### 5. Telefone
- Remover caracteres especiais (apenas números)
- Sistema aplica máscara automaticamente

### 6. CEP
- Remover caracteres especiais (apenas números)
- Sistema aplica máscara automaticamente

## 🔄 FLUXO DO ROBÔ

1. **LOGIN** → Octus ERP
2. **NAVEGAR** → Cliente/Fornecedores
3. **ORDENAR** → Por código (2 cliques = crescente)
4. **LOOP**:
   - Buscar código na página
   - Se não encontrar → próxima página
   - Clicar EDITAR
   - Preencher campos (inputs, selects, radios)
   - Clicar SALVAR
   - Fechar modal de sucesso (se aparecer)
   - Clicar VOLTAR
   - Fechar modal de confirmação (se aparecer)
   - Repetir

## 📊 COLUNAS DA PLANILHA

```
pessoa, nome, razaosocial, indfisjur, cnpj_cpf, inscrestad_rg, 
inscmunicipal, inscricaoinss, codigoean, iesubsttrib, dtnascabert, 
indativo, empresa, filial, idregistro, indalterado, paispessoa, 
endereco, complemento, bairro, cidade, estado, pais, cep, telefone, 
fax, telex, caixapostal, email, homepage, cepcaixapostal, 
indFisicaJuridica, CNPJCPFcomMascara, InscricaoCNPJCPF, 
indAtivoSimNao, indAlteradoSimNao
```

## ✅ VALIDADO EM: 25/11/2025

Testado manualmente via Browser com sucesso!








