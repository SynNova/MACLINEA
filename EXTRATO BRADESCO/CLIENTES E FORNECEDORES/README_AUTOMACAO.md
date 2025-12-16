# 🤖 ROBÔ DE ATUALIZAÇÃO DE FORNECEDORES - OCTUS ERP

## 📋 Visão Geral

Sistema automatizado para atualização em massa de cadastros de fornecedores/clientes no sistema Octus ERP, processando 8.055 registros a partir de planilha Excel.

## 🚀 Características

- ✅ **Tecnologia:** Python + Playwright (mais rápido que Selenium)
- ✅ **Sistema de Checkpoint:** Retoma de onde parou em caso de interrupção
- ✅ **Logs Detalhados:** Registro completo de todas as operações
- ✅ **Tratamento de Erros:** Continua processando mesmo com erros individuais
- ✅ **Modo Teste:** Valida com 5 registros antes da execução completa
- ✅ **Performance:** ~5 segundos por registro (~11 horas total)

## 📦 Instalação

### Passo 1: Instalar Playwright

```bash
# Execute o arquivo:
instalar_playwright.bat
```

Ou manualmente:
```bash
pip install playwright
playwright install chromium
```

## 🧪 Execução - Modo Teste (RECOMENDADO)

Antes de executar a atualização completa, **SEMPRE** execute o teste:

```bash
# Execute:
EXECUTAR_TESTE_5_REGISTROS.bat
```

O teste irá:
1. ✅ Validar login no sistema
2. ✅ Testar navegação até o módulo
3. ✅ Verificar busca de fornecedores
4. ✅ Validar abertura do formulário de edição
5. ✅ Identificar campos a serem preenchidos

**NÃO SALVA DADOS** - apenas valida o funcionamento.

## 🎯 Execução Completa

Após validar o teste com sucesso:

```bash
# Execute:
EXECUTAR_COMPLETO.bat
```

### Informações da Execução Completa:
- **Total de registros:** 8.055
- **Tempo estimado:** ~11 horas
- **Performance:** 5 segundos/registro
- **Sistema de checkpoint:** A cada 10 registros

### Durante a Execução:
- ✅ Navegador ficará visível para acompanhamento
- ✅ Logs em tempo real no console e arquivo
- ✅ Progresso salvo automaticamente
- ✅ Pode ser interrompido com `Ctrl+C` e retomado depois

## 📊 Estrutura dos Arquivos

```
📁 CLIENTES E FORNECEDORES/
│
├── 📄 CLIENTES E FORNECEDORES MACLINEA.xlsx  (dados de entrada)
│
├── 🤖 robo_atualizar_fornecedores.py  (script principal)
├── 🧪 robo_atualizar_fornecedores_teste.py  (versão teste)
│
├── 📊 progresso_atualizacao_fornecedores.json  (checkpoint)
├── 📝 robo_atualizacao_fornecedores.log  (logs detalhados)
├── ❌ erros_atualizacao_fornecedores.csv  (lista de erros)
│
├── ▶️ instalar_playwright.bat
├── ▶️ EXECUTAR_TESTE_5_REGISTROS.bat
└── ▶️ EXECUTAR_COMPLETO.bat
```

## 🔄 Sistema de Checkpoint

O robô salva progresso automaticamente:

```json
{
  "ultimo_indice": 150,
  "processados": [...],
  "data_inicio": "2025-11-25T18:30:00",
  "data_ultima_atualizacao": "2025-11-25T19:45:00"
}
```

**Se interrompido**, ao executar novamente:
- ✅ Retoma do último registro salvo
- ✅ Não reprocessa registros já atualizados
- ✅ Mantém histórico de todas as execuções

## 📈 Campos Atualizados

O robô atualiza os seguintes campos:

### Identificação
- Nome/Razão Social
- Nome Fantasia
- CNPJ/CPF
- Inscrição Estadual
- Inscrição Municipal

### Endereço
- CEP
- Endereço + Número
- Complemento
- Bairro
- Município
- Estado
- País

### Contatos
- Telefone Principal
- Telefone Secundário
- Celular
- Email Principal

## 📝 Logs e Relatórios

### Log Principal (`robo_atualizacao_fornecedores.log`):
```
2025-11-25 18:30:15 [INFO] Processando registro 1/8055
2025-11-25 18:30:20 [INFO] ✓ Registro 148 atualizado com sucesso
2025-11-25 18:30:25 [INFO] Processando registro 2/8055
...
```

### Relatório de Erros (`erros_atualizacao_fornecedores.csv`):
| Índice | Código | Erro | Data |
|--------|--------|------|------|
| 150 | 1234 | Fornecedor não encontrado | 2025-11-25 19:15:30 |

## ⚙️ Configurações Avançadas

Edite o arquivo `robo_atualizar_fornecedores.py`:

```python
class Config:
    TIMEOUT = 30000  # Timeout em ms
    DELAY_ENTRE_REGISTROS = 1  # Segundos entre registros
    SALVAR_PROGRESSO_A_CADA = 10  # Checkpoint a cada X registros
```

## 🛠️ Solução de Problemas

### Erro: "Playwright not found"
```bash
pip install playwright
playwright install chromium
```

### Erro: "Fornecedor não encontrado"
- Verifique se o código existe no sistema Octus
- Confira se a busca rápida está funcionando

### Erro: "Timeout ao preencher campos"
- Aumente o valor de `TIMEOUT` nas configurações
- Verifique se o sistema Octus está respondendo normalmente

### Navegador não abre
- Reinstale os navegadores do Playwright:
  ```bash
  playwright install chromium
  ```

## 📞 Suporte

Em caso de problemas:
1. Verifique o arquivo de log
2. Execute o modo teste para diagnóstico
3. Consulte a lista de erros (CSV)

## 🎯 Fluxo de Trabalho Recomendado

1. ✅ **Backup:** Faça backup do banco de dados Octus
2. ✅ **Teste:** Execute `EXECUTAR_TESTE_5_REGISTROS.bat`
3. ✅ **Validação:** Verifique manualmente os 5 registros teste no Octus
4. ✅ **Execução:** Execute `EXECUTAR_COMPLETO.bat`
5. ✅ **Monitoramento:** Acompanhe os logs e estatísticas
6. ✅ **Validação Final:** Confira alguns registros aleatórios após conclusão

## 📊 Estatísticas Esperadas

- **Taxa de sucesso esperada:** > 95%
- **Tempo médio por registro:** 5 segundos
- **Tempo total:** ~11 horas
- **Registros por hora:** ~730

## ⚠️ Avisos Importantes

- ⚠️ **SEMPRE** execute o teste antes da execução completa
- ⚠️ **FAÇA BACKUP** do banco de dados antes de iniciar
- ⚠️ **NÃO FECHE** o navegador manualmente durante a execução
- ⚠️ **MANTENHA** o computador ligado durante todo o processo
- ⚠️ **VERIFIQUE** a conexão de rede está estável

## 🏆 Desenvolvido por

**SynNova AI** © 2025
- Tecnologia: Python 3.11+ + Playwright
- Performance: Otimizado para alta velocidade
- Confiabilidade: Sistema robusto com checkpoint e recuperação

---

**Versão:** 1.0.0  
**Data:** Novembro/2025  
**Status:** ✅ Pronto para produção








