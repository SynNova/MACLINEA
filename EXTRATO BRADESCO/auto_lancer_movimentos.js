/**
 * Script de Automação para Lançamento em Lote de Movimentos Financeiros
 * Octus ERP - Financeiro -> Movimento Financeiro
 */

// Array com TODOS os dados do extrato (iniciaremos a partir do registro 6 já que os 5 primeiros já foram lançados)
const extratoCompleto = [
  {"Data Lançamento": "04/11/2025", "Documento": "168", "Operação": "Saída", "Valor Lançamento": "7.416,02", "Plano de Contas": "95 - 1.1.06 - NAO IDENTIFICADO", "Histórico Movimento": "2 - FINANCEIRO", "Complemento Descrição": "PAGTO ELETRON COBRANCA PAG COBRANCA NET EMPRESA"},
  {"Data Lançamento": "04/11/2025", "Documento": "169", "Operação": "Saída", "Valor Lançamento": "477,36", "Plano de Contas": "95 - 1.1.06 - NAO IDENTIFICADO", "Histórico Movimento": "2 - FINANCEIRO", "Complemento Descrição": "PAGTO ELETRON COBRANCA PAG COBRANCA NET EMPRESA"},
  {"Data Lançamento": "04/11/2025", "Documento": "5749146", "Operação": "Saída", "Valor Lançamento": "31.465,35", "Plano de Contas": "95 - 1.1.06 - NAO IDENTIFICADO", "Histórico Movimento": "2 - FINANCEIRO", "Complemento Descrição": "TRANSF CC PARA CC PJ MARCOS ROBERTO MELO DO COUTO"},
  {"Data Lançamento": "04/11/2025", "Documento": "1242441", "Operação": "Saída", "Valor Lançamento": "24.235,06", "Plano de Contas": "95 - 1.1.06 - NAO IDENTIFICADO", "Histórico Movimento": "2 - FINANCEIRO", "Complemento Descrição": "TRANSFERENCIA PIX DES: DANILO MASSARIN 04/11"}
  // ... (adicione todos os 2084 registros restantes aqui)
];

class AutoLancadorMovimentos {
  constructor() {
    this.index = 0;
    this.sucesso = 0;
    this.erro = 0;
    this.inicioTempo = Date.now();
  }

  // Aguarda um elemento aparecer no DOM
  async aguardarElemento(seletor, timeout = 5000) {
    const inicio = Date.now();
    while (Date.now() - inicio < timeout) {
      const elemento = document.querySelector(seletor);
      if (elemento) return elemento;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Elemento não encontrado: ${seletor}`);
  }

  // Simula digitação com delay
  async digitarCom Delay(elemento, texto, delayMs = 50) {
    elemento.focus();
    elemento.value = '';
    for (let char of texto) {
      elemento.value += char;
      elemento.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    elemento.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Seleciona opção em combobox
  async selecionarCombobox(seletor, valor) {
    const combobox = document.querySelector(seletor);
    if (!combobox) throw new Error(`Combobox não encontrado: ${seletor}`);
    
    if (combobox.tagName === 'SELECT') {
      combobox.value = valor;
      combobox.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Para combobox customizado
      combobox.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      const opcao = Array.from(document.querySelectorAll('[role="option"]')).find(o => o.textContent.includes(valor));
      if (opcao) opcao.click();
    }
  }

  // Preench e lança um registro
  async lancarRegistro(dados) {
    try {
      // Aguardar que o iframe esteja pronto
      const iframe = document.querySelector('iframe[active]');
      if (!iframe) throw new Error('iframe não encontrado');

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      // Preencher Data Lançamento
      const dataInput = iframeDoc.querySelector('input[aria-label*="Data"]') || 
                       Array.from(iframeDoc.querySelectorAll('input')).find(i => i.value && i.value.includes('/'));
      if (dataInput) await this.digitarComDelay(dataInput, dados["Data Lançamento"]);

      // Preencher Documento
      const docInputs = iframeDoc.querySelectorAll('input[type="text"]');
      if (docInputs.length > 1) await this.digitarComDelay(docInputs[1], dados["Documento"]);

      // Selecionar Conta Movimento (BRADESCO = 6)
      const contaSelects = iframeDoc.querySelectorAll('select');
      if (contaSelects.length > 0) await this.selecionarCombobox(contaSelects[0], "6 - BRADESCO");

      // Selecionar Operação
      const operacaoRadios = iframeDoc.querySelectorAll('input[type="radio"]');
      if (dados["Operação"] === "Entrada" && operacaoRadios[0]) operacaoRadios[0].click();
      if (dados["Operação"] === "Saída" && operacaoRadios[1]) operacaoRadios[1].click();

      // Preencher Valor
      const valorInputs = iframeDoc.querySelectorAll('input[type="text"]');
      if (valorInputs.length > 2) {
        await this.digitarComDelay(valorInputs[2], dados["Valor Lançamento"].replace(',', '.'));
      }

      // Selecionar Empresa
      if (contaSelects.length > 1) {
        await this.selecionarCombobox(contaSelects[1], "1 - MACLINEA");
      }

      // Selecionar Plano de Contas
      if (contaSelects.length > 2) {
        const planoValue = dados["Plano de Contas"].split(" - ")[1] || dados["Plano de Contas"];
        await this.selecionarCombobox(contaSelects[2], planoValue);
      }

      // Selecionar Histórico Movimento
      if (contaSelects.length > 3) {
        await this.selecionarCombobox(contaSelects[3], dados["Histórico Movimento"]);
      }

      // Preencher Complemento Descrição
      const textareas = iframeDoc.querySelectorAll('textarea');
      if (textareas.length === 0) {
        const ultimosInputs = Array.from(iframeDoc.querySelectorAll('input[type="text"]'));
        if (ultimosInputs.length > 3) {
          await this.digitarComDelay(ultimosInputs[ultimosInputs.length - 1], dados["Complemento Descrição"]);
        }
      } else {
        await this.digitarComDelay(textareas[0], dados["Complemento Descrição"]);
      }

      // Clicar em Incluir
      const botaoIncluir = iframeDoc.querySelector('button:contains("Incluir")') || 
                          Array.from(iframeDoc.querySelectorAll('button')).find(b => b.textContent.includes('Incluir'));
      if (botaoIncluir) botaoIncluir.click();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar salvamento

      this.sucesso++;
      console.log(`✓ Registro ${this.sucesso} lançado: ${dados["Data Lançamento"]} - Doc: ${dados["Documento"]}`);

    } catch (erro) {
      this.erro++;
      console.error(`✗ Erro ao lançar registro: ${erro.message}`);
    }
  }

  // Executa lançamento de todos os registros
  async executar() {
    console.log(`\n🚀 INICIANDO LANÇAMENTO EM LOTE\n`);
    console.log(`📊 Total de registros: ${extratoCompleto.length}`);
    console.log(`⏱️ Hora de início: ${new Date().toLocaleTimeString()}\n`);

    for (let i = 0; i < extratoCompleto.length; i++) {
      const dados = extratoCompleto[i];
      console.log(`\n[${i + 1}/${extratoCompleto.length}] Processando...`);
      
      await this.lancarRegistro(dados);
      
      // Delay progressivo para não sobrecarregar o servidor
      const delay = 2000 + (i % 5) * 500; // 2-4 segundos
      await new Promise(resolve => setTimeout(resolve, delay));

      // Progress bar
      const progress = Math.round(((i + 1) / extratoCompleto.length) * 100);
      console.log(`⏳ Progresso: ${progress}%`);
    }

    const tempoTotal = (Date.now() - this.inicioTempo) / 1000;
    console.log(`\n✅ LANÇAMENTO CONCLUÍDO\n`);
    console.log(`📈 Resumo Final:`);
    console.log(`  ✓ Sucessos: ${this.sucesso}`);
    console.log(`  ✗ Erros: ${this.erro}`);
    console.log(`  ⏱️ Tempo total: ${tempoTotal}s`);
    console.log(`  📊 Taxa de sucesso: ${((this.sucesso / extratoCompleto.length) * 100).toFixed(2)}%\n`);
  }
}

// Iniciar automação
console.log("SCRIPT DE AUTOMAÇÃO CARREGADO");
console.log("Para iniciar, execute: autoLancador.executar()");

const autoLancador = new AutoLancadorMovimentos();




