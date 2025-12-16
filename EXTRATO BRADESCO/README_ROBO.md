# 🤖 Robô de Lançamento Automático - Bradesco

Automatiza o lançamento de 167 registros do extrato Bradesco no Octus ERP.

## 🚀 Início Rápido (Forma Mais Fácil)

### Windows

1. **Execute o arquivo:**
   ```
   instalar_e_executar.bat
   ```

2. **Siga as instruções na tela**

Pronto! O robô fará tudo automaticamente! 🎉

---

## 📋 Passo a Passo Manual

### 1️⃣ Pré-requisitos

- ✅ Python 3.8 ou superior
- ✅ Google Chrome
- ✅ Conexão com o sistema Octus ERP

### 2️⃣ Instalar Dependências

```bash
pip install -r requirements.txt
```

### 3️⃣ Executar o Robô

```bash
python robo_lancamento.py
```

### 4️⃣ Instruções durante a Execução

1. O navegador Chrome abrirá automaticamente
2. **Faça LOGIN** no Octus ERP
3. Navegue até: **Financeiro > Movimento Financeiro**
4. Volte ao terminal e pressione **ENTER**
5. Relaxe e veja a mágica acontecer! ✨

---

## 📊 Status dos Registros

### ✅ Já Lançados (7 registros)

- Doc 169 - R$ 477,36 (04/11)
- Doc 168 - R$ 7.416,02 (04/11)
- Doc 8984796 - R$ 0,09 (04/11)
- Doc 6605424 - R$ 0,60 (04/11)
- Doc 1037148 - R$ 618,14 (04/11)
- Doc 49294 - R$ 700.000,00 (03/11) ← Testado agora
- Doc 1 - R$ 400.000,00 (11/11)

### ⏳ Pendentes: **167 registros**

---

## ⏱️ Tempo Estimado

| Item | Tempo |
|------|-------|
| Por registro | ~40 segundos |
| Total (167 registros) | **~1h 50min** |
| Manual | ~6 horas |
| **Economia** | **~4h 10min** 🎉 |

---

## 🎯 Como o Robô Funciona

O robô simula uma pessoa preenchendo o formulário:

```
1. Clica em "+ Novo"
2. Preenche Data (ex: 03/11/2025)
3. Preenche Documento (ex: 49294)
4. Seleciona Conta: 6 - BRADESCO
5. Marca: Entrada ou Saída
6. Preenche Valor (ex: 700.000,00)
7. Seleciona Empresa: MACLINEA
8. Preenche Plano de Contas (ex: 95)
9. Seleciona Histórico (1-RECEBIMENTO ou 2-FINANCEIRO)
10. Preenche Complemento
11. Clica em "Incluir"
12. ✅ Próximo!
```

---

## 📝 Logs e Monitoramento

### Terminal
Mostra progresso em tempo real:
```
[1/167] Lançando: 03/11/2025 - Doc: 1037148
✓ Registro lançado com sucesso!

[2/167] Lançando: 04/11/2025 - Doc: 
✓ Registro lançado com sucesso!
```

### Arquivo de Log
`lancamento_robo.log` - Registro completo de todas as operações

---

## ⚠️ Observações Importantes

### ✅ PODE

- Pausar com **Ctrl+C**
- Retomar depois (registros já lançados são pulados)
- Ver o log a qualquer momento
- Minimizar o terminal

### ❌ NÃO PODE

- Fechar o navegador durante execução
- Clicar na tela do sistema
- Desligar o computador
- Fazer logout do sistema

---

## 🛠️ Solução de Problemas

### Erro: "Python não encontrado"
**Solução:** Instale Python 3.8+ de https://python.org

### Erro: "ChromeDriver não encontrado"
**Solução:** O Selenium baixa automaticamente. Se falhar:
```bash
pip install --upgrade selenium
```

### Erro: "Campo não encontrado"
**Solução:** 
1. Verifique se está na tela correta
2. Aguarde o sistema carregar completamente
3. Confira o arquivo `lancamento_robo.log`

### Erro: "Timeout"
**Solução:** 
1. Internet lenta - aumente o tempo de espera
2. Sistema travado - reinicie o navegador

---

## 📂 Estrutura de Arquivos

```
📁 PROJETO
├── 📄 robo_lancamento.py        ← Script principal
├── 📄 requirements.txt           ← Dependências
├── 📄 instalar_e_executar.bat   ← Atalho Windows
├── 📄 extrato_bradesco_importacao.csv  ← Dados
├── 📄 lancamento_robo.log       ← Log (gerado)
├── 📄 README_ROBO.md            ← Este arquivo
└── 📄 INSTRUCOES_ROBO.md        ← Instruções detalhadas
```

---

## 🎉 Resultado Final

Ao concluir, você verá:

```
════════════════════════════════════════════════════════════
RESUMO DO LANÇAMENTO
════════════════════════════════════════════════════════════
✓ Sucesso: 167
✗ Erro: 0
Total: 167
════════════════════════════════════════════════════════════

✅ TODOS OS REGISTROS FORAM LANÇADOS COM SUCESSO!
```

---

## 📞 Suporte

Se precisar de ajuda:

1. Verifique `lancamento_robo.log`
2. Tire screenshot do erro
3. Anote qual registro deu problema

---

## ✨ Características

- 🔄 **Automático**: Sem intervenção manual
- 🛡️ **Seguro**: Pula registros já lançados
- 📊 **Monitorado**: Log completo de tudo
- ⏸️ **Pausável**: Ctrl+C para parar
- 🔄 **Retomável**: Continua de onde parou
- ⚡ **Rápido**: 4h+ mais rápido que manual

---

**Desenvolvido para facilitar sua vida! 🚀**




