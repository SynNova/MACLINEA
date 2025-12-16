#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Gera script com dados embutidos para uso direto no console"""

import json

# Ler arquivo
with open('extrato_json_completo.js', 'r', encoding='utf-8') as f:
    conteudo = f.read()

# Extrair JSON
inicio = conteudo.find('[')
fim = conteudo.rfind(']') + 1
json_str = conteudo[inicio:fim]
dados = json.loads(json_str)

# Criar script
script = '''// SCRIPT COM DADOS EMBUTIDOS - COLE DIRETO NO CONSOLE
// Nao precisa carregar arquivo externo

class AutoLancadorEmbutido {
  constructor() {
    this.sucesso = 0;
    this.erro = 0;
    this.pausado = false;
    this.delay = 1500;
    this.dados = null;
  }

  status() {
    if (!this.dados) return;
    console.log(`Status: ${this.sucesso} OK, ${this.erro} erro, ${this.sucesso + this.erro}/${this.dados.length}`);
  }

  setDelay(ms) {
    this.delay = ms;
    console.log(`Delay: ${ms}ms`);
  }

  pausar() {
    this.pausado = true;
    console.log("Pausado");
  }

  continuar() {
    this.pausado = false;
  }

  carregarDados() {
    this.dados = ''' + json.dumps(dados, ensure_ascii=False, indent=4) + ''';
    console.log(`OK: ${this.dados.length} registros`);
  }

  async iniciar() {
    if (!this.dados) {
      console.error("Carregue dados primeiro!");
      return;
    }

    console.log(`\\nIniciando: ${this.dados.length} registros\\n`);
    this.sucesso = 0;
    this.erro = 0;
    const t0 = Date.now();
    
    for (let i = 0; i < this.dados.length; i++) {
      if (this.pausado) {
        while (this.pausado) await new Promise(r => setTimeout(r, 500));
      }
      
      try {
        const r = this.dados[i];
        console.log(`[${i+1}/${this.dados.length}] ${r["Data Lançamento"]} Doc:${r["Documento"]}`);
        this.sucesso++;
      } catch(e) {
        this.erro++;
      }
      
      await new Promise(r => setTimeout(r, this.delay));
    }
    
    const tempo = (Date.now() - t0) / 1000;
    console.log(`\\nFim: ${this.sucesso} OK, ${this.erro} erro, ${tempo.toFixed(0)}s\\n`);
  }
}

autoLancador = new AutoLancadorEmbutido();
autoLancador.carregarDados();
console.log("Pronto! Execute: autoLancador.iniciar()");
'''

with open('lancar_com_dados_embutidos.js', 'w', encoding='utf-8') as f:
    f.write(script)

print(f"[OK] Arquivo gerado: lancar_com_dados_embutidos.js")
print(f"[INFO] Tamanho: {len(script) / 1024:.1f} KB")
print(f"[INFO] Registros: {len(dados)}")
print(f"\nUso: Cole o conteudo do arquivo no console do navegador")
print(f"     Depois execute: autoLancador.iniciar()")




