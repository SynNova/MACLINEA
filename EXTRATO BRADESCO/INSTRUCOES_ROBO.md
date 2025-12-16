# 🤖 Robô de Lançamento Automático - Octus ERP

## 📋 Pré-requisitos

1. **Python 3.8 ou superior** instalado
2. **Google Chrome** instalado
3. **ChromeDriver** (será baixado automaticamente pelo Selenium)

## 🚀 Como Usar

### 1️⃣ Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
pip install -r requirements.txt
```

### 2️⃣ Executar o Robô

```bash
python robo_lancamento.py
```

### 3️⃣ Seguir as Instruções

1. O navegador abrirá automaticamente
2. **Faça LOGIN** no sistema Octus ERP
3. Navegue até: **Financeiro > Movimento Financeiro**
4. Volte ao terminal e pressione **ENTER**
5. O robô começará a processar os registros automaticamente!

## ⚙️ Como Funciona

O robô faz exatamente o que uma pessoa faria:

1. ✅ Clica em "+ Novo"
2. ✅ Preenche "Data Lançamento"
3. ✅ Preenche "Documento"
4. ✅ Seleciona "Conta Movimento" (6 - BRADESCO)
5. ✅ Marca "Entrada" ou "Saída"
6. ✅ Preenche "Valor Lançamento"
7. ✅ Seleciona "Empresa"
8. ✅ Preenche "Plano de Contas"
9. ✅ Seleciona "Histórico Movimento"
10. ✅ Preenche "Complemento Descrição"
11. ✅ Clica em "Incluir" para salvar
12. ✅ Repete para o próximo registro

## 📊 Registros Já Lançados (Serão Pulados)

O robô já está configurado para **pular** estes registros:

- ✓ Documento 169 (04/11/2025)
- ✓ Documento 168 (04/11/2025)
- ✓ Documento 8984796 (04/11/2025)
- ✓ Documento 6605424 (04/11/2025)
- ✓ Documento 1037148 (04/11/2025)
- ✓ Documento 49294 (03/11/2025)
- ✓ Documento 1 (11/11/2025)

## 📈 Progresso

O robô mostrará:
- ✅ Registros processados com sucesso
- ❌ Registros com erro
- 📊 Progresso em tempo real: [5/167]

## 📝 Logs

Todos os lançamentos ficam registrados em:
- **`lancamento_robo.log`** - Arquivo de log completo
- **Terminal** - Progresso em tempo real

## ⏱️ Tempo Estimado

- **167 registros restantes**
- **~40 segundos por registro**
- **Tempo total estimado: ~1h 50min**

Muito mais rápido que manual! 🚀

## ⚠️ Observações Importantes

1. **NÃO feche o navegador** durante a execução
2. **NÃO clique em nada** na tela do sistema
3. Você pode **pausar** pressionando Ctrl+C
4. Se houver erro, o robô continua com o próximo
5. Os logs ficam salvos para auditoria

## 🛠️ Ajustes se Necessário

Se algum campo estiver diferente no sistema, edite o arquivo `robo_lancamento.py`:

- **Linha 70-80**: Seletores de campos
- **Linha 260**: Documentos já lançados
- **Linha 400**: URL do sistema

## 📞 Suporte

Se tiver algum problema:
1. Verifique o arquivo `lancamento_robo.log`
2. Tire um screenshot da tela
3. Anote qual registro deu erro

---

**Desenvolvido com ❤️ para automatizar seu trabalho!**




