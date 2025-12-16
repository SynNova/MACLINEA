/**
 * SCRIPT PARA EXECUTAR NO CONSOLE DO NAVEGADOR
 * Para usar: Copie e cole este script no console do navegador (F12 > Console)
 * 
 * Instruções:
 * 1. Abra o sistema em http://sistema.maclinea.com.br:4586/app/
 * 2. Navegue até: Financeiro > Movimento Financeiro
 * 3. Clique em "+Novo" para abrir o formulário de novo movimento
 * 4. Abra o console do navegador (F12)
 * 5. Cole este script todo no console
 * 6. Pressione Enter
 * 7. Execute: autoLancador.iniciar()
 */

// Dados do extrato - AQUI VOCÊ COPIA E COLA O CONTEÚDO DO extrato_json_completo.js
// OU deixe carregando automaticamente
const extratoCompleto = [];

// Classe principal de automação
class AutoLancadorConsole {
  constructor() {
    this.index = 0;
    this.sucesso = 0;
    this.erro = 0;
    this.pausado = false;
    this.delay = 1500;
    console.log("✓ Auto Lançador Console inicializado!");
    console.log("Use: autoLancador.iniciar() para começar");
    console.log("Use: autoLancador.pausar() para pausar");
    console.log("Use: autoLancador.continuar() para continuar");
    console.log("Use: autoLancador.status() para ver progresso");
  }

  // Carregar dados do arquivo JSON
  async carregarDados(url = "extrato_json_completo.js") {
    try {
      const response = await fetch(url);
      const texto = await response.text();
      
      // Extrair o array
      const inicio = texto.indexOf('[');
      const fim = texto.lastIndexOf(']') + 1;
      const jsonStr = texto.substring(inicio, fim);
      
      const dados = JSON.parse(jsonStr);
      this.dados = dados;
      console.log(`✓ ${dados.length} registros carregados com sucesso!`);
      return dados;
    } catch(e) {
      console.error(`✗ Erro ao carregar dados: ${e.message}`);
      return null;
    }
  }

  // Aguardar elemento aparecer
  async aguardarElemento(seletor, timeout = 5000) {
    const inicio = Date.now();
    while (Date.now() - inicio < timeout) {
      const elem = document.querySelector(seletor);
      if (elem) return elem;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Elemento não encontrado: ${seletor}`);
  }

  // Preencher campo de texto com delay
  async preencherCampo(seletor, valor, delayMs = 50) {
    try {
      const campo = document.querySelector(seletor);
      if (!campo) throw new Error(`Campo não encontrado: ${seletor}`);
      
      campo.focus();
      campo.value = '';
      
      for (let char of String(valor)) {
        campo.value += char;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, delayMs));
      }
      
      return true;
    } catch(e) {
      console.warn(`⚠ Erro ao preencher ${seletor}: ${e.message}`);
      return false;
    }
  }

  // Selecionar opção em combobox
  async selecionarCombo(seletor, valor) {
    try {
      const combo = document.querySelector(seletor);
      if (!combo) return false;
      
      if (combo.tagName === 'SELECT') {
        combo.value = valor;
        combo.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        combo.click();
        await new Promise(r => setTimeout(r, 200));
        
        const opcoes = document.querySelectorAll('[role="option"]');
        for (let opcao of opcoes) {
          if (opcao.textContent.includes(valor)) {
            opcao.click();
            break;
          }
        }
      }
      return true;
    } catch(e) {
      console.warn(`⚠ Erro ao selecionar combo ${seletor}: ${e.message}`);
      return false;
    }
  }

  // Clicar em botão
  async clicarBotao(textoBotao) {
    try {
      const botoes = document.querySelectorAll('button');
      for (let botao of botoes) {
        if (botao.textContent.toLowerCase().includes(textoBotao.toLowerCase())) {
          botao.click();
          await new Promise(r => setTimeout(r, 200));
          return true;
        }
      }
      throw new Error(`Botão não encontrado: ${textoBotao}`);
    } catch(e) {
      console.warn(`⚠ Erro ao clicar botão: ${e.message}`);
      return false;
    }
  }

  // Processar um registro
  async processarRegistro(dados, numero) {
    try {
      if (this.pausado) {
        console.log(`⏸ Aguardando...[${numero}/${this.dados.length}]`);
        while (this.pausado) await new Promise(r => setTimeout(r, 1000));
      }

      console.log(`\n[${numero}/${this.dados.length}] Processando: ${dados['Data Lançamento']} - Doc ${dados['Documento']}`);

      // Preencher campos principais
      await this.preencherCampo('input[name*="data"], input[aria-label*="Data"]', dados['Data Lançamento']);
      await this.preencherCampo('input[name*="doc"], input[aria-label*="Doc"]', dados['Documento']);
      
      // Selecionar Conta Movimento
      await this.selecionarCombo('select[name*="conta"], select[aria-label*="Conta"]', 'BRADESCO');
      
      // Selecionar Operação
      const radios = document.querySelectorAll('input[type="radio"]');
      if (dados['Operação'] === 'Entrada' && radios[0]) radios[0].click();
      else if (radios[1]) radios[1].click();
      
      // Preencher Valor
      await this.preencherCampo('input[name*="valor"], input[aria-label*="Valor"]', 
        dados['Valor Lançamento'].replace(',', '.'));
      
      // Preencher demais campos
      await this.preencherCampo('textarea, input[name*="compl"]', dados['Complemento Descrição']);

      // Clicar em Incluir
      await this.clicarBotao('Incluir');
      await new Promise(r => setTimeout(r, this.delay));

      this.sucesso++;
      console.log(`✓ Registro lançado com sucesso!`);
      return true;

    } catch(e) {
      this.erro++;
      console.error(`✗ Erro ao lançar registro: ${e.message}`);
      return false;
    }
  }

  // Iniciar processamento
  async iniciar() {
    if (!this.dados || this.dados.length === 0) {
      console.error("✗ Nenhum dado carregado! Use: await autoLancador.carregarDados()");
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log("INICIANDO LANÇAMENTO EM LOTE");
    console.log(`${'='.repeat(60)}`);
    console.log(`Total de registros: ${this.dados.length}`);
    console.log(`Delay entre registros: ${this.delay}ms`);
    console.log(`${'='.repeat(60)}\n`);

    const inicio = Date.now();
    this.sucesso = 0;
    this.erro = 0;

    for (let i = 0; i < this.dados.length; i++) {
      await this.processarRegistro(this.dados[i], i + 1);
      
      const percentual = ((i + 1) / this.dados.length * 100).toFixed(1);
      console.log(`📊 Progresso: ${percentual}%`);
    }

    const tempo = (Date.now() - inicio) / 1000;
    this.exibirResumo(tempo);
  }

  // Pausar processamento
  pausar() {
    this.pausado = true;
    console.log("⏸ Processamento pausado. Use: autoLancador.continuar()");
  }

  // Continuar processamento
  continuar() {
    this.pausado = false;
    console.log("▶ Processamento continuado...");
  }

  // Mostrar status
  status() {
    console.log(`\n📊 STATUS ATUAL:`);
    console.log(`  Sucessos: ${this.sucesso}`);
    console.log(`  Erros: ${this.erro}`);
    console.log(`  Total: ${this.sucesso + this.erro}/${this.dados ? this.dados.length : 'N/A'}`);
    console.log(`  Taxa: ${this.dados ? ((this.sucesso / this.dados.length) * 100).toFixed(1) : 'N/A'}%\n`);
  }

  // Exibir resumo final
  exibirResumo(tempoTotal) {
    console.log(`\n${'='.repeat(60)}`);
    console.log("RESUMO FINAL");
    console.log(`${'='.repeat(60)}`);
    console.log(`✓ Sucessos: ${this.sucesso}`);
    console.log(`✗ Erros: ${this.erro}`);
    console.log(`📊 Taxa de sucesso: ${((this.sucesso / (this.sucesso + this.erro)) * 100).toFixed(1)}%`);
    console.log(`⏱ Tempo total: ${tempoTotal.toFixed(1)}s`);
    console.log(`⚡ Tempo médio: ${(tempoTotal / (this.sucesso + this.erro)).toFixed(2)}s`);
    console.log(`${'='.repeat(60)}\n`);
  }

  // Configurar delay
  setDelay(ms) {
    this.delay = ms;
    console.log(`✓ Delay configurado para ${ms}ms`);
  }
}

// Criar instância global
const autoLancador = new AutoLancadorConsole();

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║ AUTO LANÇADOR - MOVIMENTO FINANCEIRO                      ║");
console.log("║ Sistema Octus ERP - Bradesco                             ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

console.log("COMANDOS DISPONÍVEIS:");
console.log("  1. Carregar dados:");
console.log("     await autoLancador.carregarDados('extrato_json_completo.js')");
console.log("");
console.log("  2. Iniciar lançamentos:");
console.log("     await autoLancador.iniciar()");
console.log("");
console.log("  3. Pausar/Continuar:");
console.log("     autoLancador.pausar()");
console.log("     autoLancador.continuar()");
console.log("");
console.log("  4. Ver status:");
console.log("     autoLancador.status()");
console.log("");
console.log("  5. Configurar delay (ms):");
console.log("     autoLancador.setDelay(2000)");
console.log("");
console.log("═".repeat(60) + "\n");

// Facilitar - carregar automaticamente se arquivo estiver disponível
console.log("⏳ Tentando carregar dados automaticamente...");
autoLancador.carregarDados('extrato_json_completo.js').catch(() => {
  console.log("ℹ Arquivo não encontrado no servidor.");
  console.log("ℹ Copie o conteúdo de 'extrato_json_completo.js' para 'autoLancador.dados'");
});




