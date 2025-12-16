# Automação de Lançamento em Lote - Bradesco

## 📋 Descrição

Este projeto contém scripts e ferramentas para automatizar o lançamento em lote de movimentos financeiros do Bradesco no sistema Octus ERP.

## 📁 Arquivos

### 1. **extrato_json_completo.js**
   - Arquivo JSON com TODOS os 174 registros do extrato Bradesco
   - Gerado automaticamente pelo `gerar_script_automacao.py`
   - Usado pelos scripts de automação

### 2. **lancar_automatico_console.js** ⭐ MAIS SIMPLES
   - Script JavaScript para executar no console do navegador
   - **Método mais prático e rápido**
   - Não requer instalação de dependências
   - Pode ser pausado e retomado

### 3. **auto_lancer_selenium.py**
   - Script Python com Selenium para automação robusta
   - Ideal para grandes volumes
   - Requer: `pip install selenium`

### 4. **gerar_script_automacao.py**
   - Converte `extrato_data.js` em `extrato_json_completo.js`
   - Já foi executado (resultado: 174 registros)

### 5. **auto_lancer_movimentos.js**
   - Versão inicial do script (versão mais complexa)

---

## 🚀 MÉTODO 1: Console do Navegador (RECOMENDADO)

### Passo 1: Abrir o Sistema
```
1. Acesse: http://sistema.maclinea.com.br:4586/app/
2. Navegue até: Financeiro > Movimento Financeiro
3. Você verá a lista de movimentos já lançados
```

### Passo 2: Preparar o Console
```
1. Abra o Console do Navegador (F12 > Console)
2. Aguarde qualquer mensagem de erro desaparecer
3. O prompt > estará pronto para comandos
```

### Passo 3: Executar a Automação
```javascript
// 1. Carregar os dados (execute uma vez)
await autoLancador.carregarDados('extrato_json_completo.js')

// 2. Iniciar o lançamento em lote
await autoLancador.iniciar()
```

### Passo 4: Monitorar o Progresso
```javascript
// Ver status em tempo real
autoLancador.status()

// Pausar se necessário
autoLancador.pausar()

// Continuar após pausar
autoLancador.continuar()

// Ajustar velocidade (em milissegundos)
autoLancador.setDelay(2000)  // 2 segundos entre registros
```

---

## 🐍 MÉTODO 2: Python + Selenium (AVANÇADO)

### Instalação de Dependências
```bash
pip install selenium
```

### Executar o Script
```bash
python auto_lancer_selenium.py
```

### Características
- Automação completa e robusta
- Manipula o navegador como um usuário real
- Melhor tratamento de erros
- Ideal para grandes volumes

---

## 📊 DADOS DOS REGISTROS

| Item | Valor |
|------|-------|
| **Total de Registros** | 174 |
| **Data Início** | 03/11/2025 |
| **Data Fim** | 19/11/2025 |
| **Conta Movimento** | 6 - BRADESCO |
| **Empresa** | 1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA |

### Distribuição por Operação
- **Entrada**: Depósitos/Recebimentos
- **Saída**: Pagamentos/Transferências

### Planos de Contas Principais
- `95 - 1.1.06 - NAO IDENTIFICADO` (maioria dos registros)
- `6 - 00 - Transferencia entre Contas`
- `63 - 1.4.12 - Telefonia/Fixa/Movel/Internet`
- `64 - 1.4.13 - Agua`
- `65 - 1.4.14 - Luz`
- `36 - 1.4.02 - Despesas Financeiras`
- `79 - Juros Recebidos / Aporte Capital Social`

---

## ⏱️ TEMPO ESPERADO

### Console (Método 1)
- **Tempo por registro**: 2-3 segundos
- **Tempo total estimado**: ~6-9 minutos (174 registros)
- **Velocidade**: Pode ser ajustada com `setDelay(ms)`

### Selenium (Método 2)
- **Tempo por registro**: 1-2 segundos
- **Tempo total estimado**: ~4-6 minutos
- **Velocidade**: Mais rápida que o console

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] 1. Abra o navegador e acesse o sistema
- [ ] 2. Navegue até Financeiro > Movimento Financeiro
- [ ] 3. Clique em "+Novo" para abrir o formulário
- [ ] 4. Abra o console (F12 > Console)
- [ ] 5. Copie e cole o comando de carregamento
- [ ] 6. Aguarde a confirmação de "174 registros carregados"
- [ ] 7. Execute o comando de início
- [ ] 8. Acompanhe o progresso pelo console
- [ ] 9. Verifique o resumo final

---

## 🔧 TROUBLESHOOTING

### Erro: "Arquivo não encontrado"
**Solução**: Coloque `extrato_json_completo.js` na mesma pasta do HTML ou especifique o caminho completo:
```javascript
await autoLancador.carregarDados('../path/extrato_json_completo.js')
```

### Erro: "iframe não encontrado"
**Solução**: Certifique-se de que:
1. Você está na página correta (Movimento Financeiro)
2. O formulário de novo movimento está aberto
3. Aguarde alguns segundos para a página carregar

### Processamento muito lento
**Solução**: Diminua o delay (cuidado com sobrecarga do servidor)
```javascript
autoLancador.setDelay(1000)  // 1 segundo ao invés de 1.5
```

### Alguns campos não são preenchidos
**Solução**: Os seletores podem ser diferentes na interface. Verifique o HTML:
1. F12 > Inspector
2. Clique no elemento a inspecionar
3. Copie o `name` ou `id` do campo
4. Atualize os seletores no script

---

## 📝 ESTRUTURA DOS DADOS

Cada registro contém:
```json
{
  "Data Lançamento": "03/11/2025",
  "Documento": "49294",
  "Conta Movimento": "6 - BRADESCO",
  "Operação": "Entrada",
  "Valor Lançamento": "700.000,00",
  "Nr Cheque": "",
  "Empresa": "1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA",
  "Plano de Contas": "95 - 1.1.06 - NAO IDENTIFICADO",
  "Histórico Movimento": "1 - RECEBIMENTO",
  "Complemento Descrição": "TRANSF CC PARA CC PJ USIFIX INDUSTRIA E COMERCIO LT"
}
```

---

## 💡 DICAS E BOAS PRÁTICAS

1. **Não feche a guia do navegador** durante a execução
2. **Não mude de página** enquanto a automação está rodando
3. **Use um delay maior** (2-3s) se o servidor responder lentamente
4. **Verifique alguns registros** no meio do processo
5. **Salve logs** do console para análise de erros

---

## 🐛 SUPORTE E DEBUGGING

### Ver logs detalhados
O console exibe em tempo real:
- ✓ Registros lançados com sucesso
- ✗ Erros encontrados
- 📊 Percentual de progresso
- ⚡ Tempo estimado

### Copiar logs do console
1. Clique direito no console
2. "Save as..." ou selecione tudo (Ctrl+A) e copie (Ctrl+C)

---

## 📧 PRÓXIMOS PASSOS

1. ✅ Executar a automação (este documento)
2. ⏳ Verificar se todos os 174 registros foram lançados
3. 📊 Validar os dados no sistema
4. 🔄 Repetir para outras contas/períodos se necessário

---

**Versão**: 1.0
**Data**: 19 de Novembro de 2025
**Sistema**: Octus ERP
**Banco**: Bradesco




