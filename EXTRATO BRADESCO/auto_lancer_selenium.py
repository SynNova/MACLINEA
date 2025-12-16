#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de Automação com Selenium para Lançamento em Lote
Bradesco - Extrato - Movimento Financeiro

Este script automatiza o lançamento de múltiplos registros de movimento financeiro
no sistema Octus ERP, carregando os dados do arquivo extrato_data.js
"""

import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait

class AutoLancadorBradesco:
    def __init__(self, url_sistema="http://sistema.maclinea.com.br:4586/app/", chrome_path=None):
        """
        Inicializa o driver do Selenium
        
        Args:
            url_sistema: URL do sistema Octus ERP
            chrome_path: Caminho do chrome (opcional)
        """
        self.url_sistema = url_sistema
        self.wait_timeout = 10
        self.delay_entre_registros = 2  # segundos
        self.contador_sucesso = 0
        self.contador_erro = 0
        
        # Inicializar driver Chrome
        options = webdriver.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # options.add_argument("--headless")  # Descomente para modo headless
        
        self.driver = webdriver.Chrome(options=options)
        
    def carregar_dados(self, arquivo_json="extrato_json_completo.js"):
        """Carrega os dados do arquivo JSON"""
        print(f"[*] Carregando dados de: {arquivo_json}")
        try:
            with open(arquivo_json, 'r', encoding='utf-8') as f:
                conteudo = f.read()
            
            # Extrair o array
            inicio = conteudo.find('[')
            fim = conteudo.rfind(']') + 1
            json_str = conteudo[inicio:fim]
            
            self.dados = json.loads(json_str)
            print(f"[OK] Total de {len(self.dados)} registros carregados")
            return self.dados
        except Exception as e:
            print(f"[ERRO] Falha ao carregar dados: {e}")
            return []
    
    def navegar_para_movimento_financeiro(self):
        """Navega até a tela de Movimento Financeiro"""
        print(f"[*] Navegando para: {self.url_sistema}")
        self.driver.get(self.url_sistema)
        
        # Aguardar carregar
        WebDriverWait(self.driver, self.wait_timeout).until(
            EC.presence_of_all_elements_located((By.TAG_NAME, "iframe"))
        )
        print("[OK] Sistema carregado")
    
    def preencher_registro(self, dados_registro, numero=1):
        """
        Preenche um registro de movimento financeiro
        
        Args:
            dados_registro: Dicionário com os dados do registro
            numero: Número do registro (para logging)
        """
        try:
            print(f"\n[{numero}] Processando: Data={dados_registro.get('Data Lancamento')}, Doc={dados_registro.get('Documento')}")
            
            # Localizar o iframe
            iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
            if not iframes:
                raise Exception("Iframe não encontrado")
            
            self.driver.switch_to.frame(iframes[0])
            
            # Preencher Data Lançamento
            data_input = self.driver.find_elements(By.CSS_SELECTOR, "input[type='text']")[0]
            data_input.clear()
            data_input.send_keys(dados_registro.get('Data Lancamento', ''))
            
            # Preencher Documento
            if len(self.driver.find_elements(By.CSS_SELECTOR, "input[type='text']")) > 1:
                doc_input = self.driver.find_elements(By.CSS_SELECTOR, "input[type='text']")[1]
                doc_input.clear()
                doc_input.send_keys(dados_registro.get('Documento', ''))
            
            # Selecionar Conta Movimento (Bradesco)
            combos = self.driver.find_elements(By.TAG_NAME, "select")
            if combos:
                select = Select(combos[0])
                try:
                    select.select_by_value("6 - BRADESCO")
                except:
                    select.select_by_visible_text("6 - BRADESCO")
            
            # Selecionar Operação (Entrada/Saída)
            radios = self.driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
            operacao = dados_registro.get('Operacao', 'Saída')
            if operacao == 'Entrada' and len(radios) > 0:
                radios[0].click()
            elif len(radios) > 1:
                radios[1].click()
            
            # Preencher Valor
            inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='text']")
            if len(inputs) > 2:
                valor_input = inputs[2]
                valor_input.clear()
                valor = dados_registro.get('Valor Lancamento', '0').replace(',', '.')
                valor_input.send_keys(valor)
            
            # Selecionar Empresa
            if len(combos) > 1:
                select = Select(combos[1])
                try:
                    select.select_by_value("1 - MACLINEA MAQUINAS E EQUIPAMENTOS LTDA")
                except:
                    select.select_by_visible_text("1 - MACLINEA")
            
            # Selecionar Plano de Contas
            if len(combos) > 2:
                select = Select(combos[2])
                plano_texto = dados_registro.get('Plano de Contas', '')
                try:
                    select.select_by_value(plano_texto)
                except:
                    # Tentar com partes do texto
                    select.select_by_partial_link_text(plano_texto[:20])
            
            # Selecionar Histórico Movimento
            if len(combos) > 3:
                select = Select(combos[3])
                historico = dados_registro.get('Historico Movimento', '')
                try:
                    select.select_by_value(historico)
                except:
                    select.select_by_visible_text(historico)
            
            # Preencher Complemento Descrição
            textareas = self.driver.find_elements(By.TAG_NAME, "textarea")
            if textareas:
                textareas[0].clear()
                textareas[0].send_keys(dados_registro.get('Complemento Descricao', ''))
            
            # Voltar para o contexto principal
            self.driver.switch_to.default_content()
            
            # Clicar em Incluir
            botoes = self.driver.find_elements(By.TAG_NAME, "button")
            for botao in botoes:
                if "Incluir" in botao.text or "incluir" in botao.text.lower():
                    botao.click()
                    break
            
            # Aguardar processamento
            time.sleep(self.delay_entre_registros)
            
            self.contador_sucesso += 1
            print(f"[OK] Registro #{numero} lançado com sucesso")
            return True
            
        except Exception as e:
            self.contador_erro += 1
            print(f"[ERRO] Falha ao lançar registro #{numero}: {str(e)}")
            self.driver.switch_to.default_content()
            return False
    
    def executar_lancamentos(self):
        """Executa o lançamento de todos os registros"""
        if not hasattr(self, 'dados') or not self.dados:
            print("[ERRO] Nenhum dado carregado. Execute carregar_dados() primeiro.")
            return
        
        print(f"\n{'='*60}")
        print("INICIANDO LANÇAMENTO EM LOTE")
        print(f"{'='*60}")
        print(f"Total de registros: {len(self.dados)}")
        print(f"{'='*60}\n")
        
        inicio_tempo = time.time()
        
        try:
            self.navegar_para_movimento_financeiro()
            
            for idx, registro in enumerate(self.dados, 1):
                self.preencher_registro(registro, idx)
                
                # Calcular progresso
                percentual = (idx / len(self.dados)) * 100
                print(f"Progresso: {percentual:.1f}% ({idx}/{len(self.dados)})")
                
        except KeyboardInterrupt:
            print("\n[!] Operação interrompida pelo usuário")
        except Exception as e:
            print(f"\n[ERRO GERAL] {str(e)}")
        finally:
            tempo_total = time.time() - inicio_tempo
            self.exibir_resumo(tempo_total)
            self.driver.quit()
    
    def exibir_resumo(self, tempo_total):
        """Exibe resumo final da operação"""
        print(f"\n{'='*60}")
        print("RESUMO DA OPERAÇÃO")
        print(f"{'='*60}")
        print(f"Sucessos: {self.contador_sucesso}")
        print(f"Erros: {self.contador_erro}")
        print(f"Total processado: {self.contador_sucesso + self.contador_erro}")
        print(f"Taxa de sucesso: {(self.contador_sucesso / (self.contador_sucesso + self.contador_erro) * 100):.1f}%" if (self.contador_sucesso + self.contador_erro) > 0 else "N/A")
        print(f"Tempo total: {tempo_total:.1f}s")
        print(f"Tempo médio por registro: {(tempo_total / (self.contador_sucesso + self.contador_erro)):.2f}s" if (self.contador_sucesso + self.contador_erro) > 0 else "N/A")
        print(f"{'='*60}\n")


def main():
    """Função principal"""
    try:
        # Criar instância do lançador
        lançador = AutoLancadorBradesco()
        
        # Carregar dados
        lançador.carregar_dados("extrato_json_completo.js")
        
        # Executar lançamentos
        lançador.executar_lancamentos()
        
    except Exception as e:
        print(f"[ERRO] Falha na execução principal: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()




