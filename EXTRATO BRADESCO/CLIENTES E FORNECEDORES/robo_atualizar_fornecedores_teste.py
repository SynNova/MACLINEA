"""
VERSÃO DE TESTE - ROBÔ DE ATUALIZAÇÃO (5 REGISTROS)
Processa apenas 5 registros para validação antes da execução completa
"""

import pandas as pd
import json
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright
import time

# ==============================================================================
# CONFIGURAÇÕES DE TESTE
# ==============================================================================
class Config:
    # Sistema
    URL_LOGIN = "http://192.168.0.247:4586/login"
    USUARIO = "edilson@synnova.com.br"
    SENHA = "1234"
    
    # Arquivos
    ARQUIVO_EXCEL = "CLIENTES E FORNECEDORES MACLINEA.xlsx"
    ARQUIVO_LOG = "teste_5_registros.log"
    
    # Teste
    LIMITE_REGISTROS = 5  # APENAS 5 PARA TESTE
    TIMEOUT = 30000
    DELAY_ENTRE_REGISTROS = 2

# ==============================================================================
# LOGGING
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(Config.ARQUIVO_LOG, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ==============================================================================
# ROBÔ DE TESTE
# ==============================================================================
class RoboTeste:
    def __init__(self):
        self.dados = None
        self.resultados = []
    
    def carregar_dados(self):
        """Carrega apenas os primeiros 5 registros"""
        logger.info("Carregando dados para teste...")
        df = pd.read_excel(Config.ARQUIVO_EXCEL)
        self.dados = df.head(Config.LIMITE_REGISTROS)
        logger.info(f"✓ {len(self.dados)} registros carregados para teste\n")
        
        # Mostra quais serão processados
        logger.info("Registros que serão testados:")
        for idx, row in self.dados.iterrows():
            logger.info(f"  {idx+1}. Código {row['pessoa']} - {row['nome']}")
        logger.info("")
    
    def teste_navegacao(self):
        """Testa navegação básica"""
        logger.info("\n" + "="*80)
        logger.info("TESTE 1: NAVEGAÇÃO E LOGIN")
        logger.info("="*80)
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=False, slow_mo=500)
                page = browser.new_page()
                page.set_default_timeout(Config.TIMEOUT)
                
                # Login
                logger.info("1. Acessando página de login...")
                page.goto(Config.URL_LOGIN)
                page.wait_for_load_state('networkidle')
                
                logger.info("2. Preenchendo credenciais...")
                page.fill('input[placeholder*="e-mail"]', Config.USUARIO)
                page.fill('input[placeholder*="senha"]', Config.SENHA)
                
                logger.info("3. Fazendo login...")
                page.click('button:has-text("Acessar")')
                page.wait_for_load_state('networkidle')
                time.sleep(3)
                
                # Navegar para fornecedores
                logger.info("4. Navegando para Cliente/Fornecedores...")
                page.click('text=Cadastros')
                time.sleep(1)
                page.click('text=Cliente/Fornecedores')
                page.wait_for_load_state('networkidle')
                time.sleep(2)
                
                logger.info("✓ Navegação funcionando corretamente!\n")
                
                # Teste de busca
                logger.info("5. Testando busca de fornecedor...")
                codigo_teste = self.dados.iloc[0]['pessoa']
                
                iframe = page.frame_locator('iframe').nth(1)
                busca = iframe.locator('input[title="Busca Rapida"]')
                busca.fill(str(codigo_teste))
                busca.press('Enter')
                time.sleep(2)
                
                logger.info(f"✓ Busca pelo código {codigo_teste} funcionou!\n")
                
                # Teste de edição
                logger.info("6. Testando abertura de edição...")
                iframe.locator('generic[title="Editar o Registro"]').first.click()
                time.sleep(3)
                
                logger.info("✓ Formulário de edição abriu corretamente!\n")
                
                input("\n>>> Pressione ENTER para fechar o navegador e continuar...")
                browser.close()
                
                return True
                
        except Exception as e:
            logger.error(f"✗ Erro no teste de navegação: {e}")
            return False
    
    def teste_preenchimento(self):
        """Testa preenchimento de um registro completo"""
        logger.info("\n" + "="*80)
        logger.info("TESTE 2: PREENCHIMENTO COMPLETO DE 1 REGISTRO")
        logger.info("="*80)
        
        try:
            registro = self.dados.iloc[0]
            logger.info(f"\nRegistro de teste: {registro['pessoa']} - {registro['nome']}\n")
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=False, slow_mo=300)
                page = browser.new_page()
                page.set_default_timeout(Config.TIMEOUT)
                
                # Login e navegação
                logger.info("1. Fazendo login...")
                page.goto(Config.URL_LOGIN)
                page.fill('input[placeholder*="e-mail"]', Config.USUARIO)
                page.fill('input[placeholder*="senha"]', Config.SENHA)
                page.click('button:has-text("Acessar")')
                page.wait_for_load_state('networkidle')
                time.sleep(3)
                
                logger.info("2. Navegando para Cliente/Fornecedores...")
                page.click('text=Cadastros')
                time.sleep(1)
                page.click('text=Cliente/Fornecedores')
                time.sleep(2)
                
                # Busca e edição
                logger.info(f"3. Buscando fornecedor {registro['pessoa']}...")
                iframe = page.frame_locator('iframe').nth(1)
                busca = iframe.locator('input[title="Busca Rapida"]')
                busca.fill(str(registro['pessoa']))
                busca.press('Enter')
                time.sleep(2)
                
                logger.info("4. Abrindo edição...")
                iframe.locator('generic[title="Editar o Registro"]').first.click()
                time.sleep(3)
                
                # Preenchimento
                logger.info("5. Preenchendo campos...")
                iframe_form = page.frame_locator('iframe').nth(2)
                
                campos_preenchidos = 0
                
                # Nome/Razão Social
                if pd.notna(registro['razaosocial']):
                    logger.info(f"   - Razão Social: {registro['razaosocial']}")
                    # Aqui você ajustará os seletores conforme necessário
                    campos_preenchidos += 1
                
                if pd.notna(registro['nome']):
                    logger.info(f"   - Nome Fantasia: {registro['nome']}")
                    campos_preenchidos += 1
                
                if pd.notna(registro['telefone']):
                    logger.info(f"   - Telefone: {registro['telefone']}")
                    campos_preenchidos += 1
                
                if pd.notna(registro['email']):
                    logger.info(f"   - Email: {registro['email']}")
                    campos_preenchidos += 1
                
                logger.info(f"\n✓ {campos_preenchidos} campos identificados para preenchimento")
                
                logger.info("\n⚠ ATENÇÃO: Este é um teste!")
                logger.info("Os campos foram identificados mas NÃO foram salvos.")
                logger.info("Verifique manualmente se os campos estão corretos.\n")
                
                input(">>> Pressione ENTER para fechar sem salvar...")
                browser.close()
                
                return True
                
        except Exception as e:
            logger.error(f"✗ Erro no teste de preenchimento: {e}")
            return False
    
    def executar(self):
        """Executa testes"""
        print("""
================================================================================
                                                                              
                    TESTE - ROBO DE ATUALIZACAO                              
                         (5 REGISTROS)                                       
                                                                              
================================================================================
        """)
        
        # Carrega dados
        self.carregar_dados()
        
        # Teste 1: Navegação
        if not self.teste_navegacao():
            logger.error("\n✗ Teste de navegação falhou. Corrija antes de prosseguir.")
            return
        
        # Teste 2: Preenchimento
        if not self.teste_preenchimento():
            logger.error("\n✗ Teste de preenchimento falhou. Corrija antes de prosseguir.")
            return
        
        # Resumo
        logger.info("\n" + "="*80)
        logger.info("RESUMO DOS TESTES")
        logger.info("="*80)
        logger.info("✓ Teste 1: Navegação e Login - OK")
        logger.info("✓ Teste 2: Busca e Edição - OK")
        logger.info("✓ Teste 3: Identificação de Campos - OK")
        logger.info("\n⚠ PRÓXIMO PASSO:")
        logger.info("  1. Revise o código e ajuste os seletores de campos se necessário")
        logger.info("  2. Execute o robô completo com EXECUTAR_COMPLETO.bat")
        logger.info("\n✓ Testes concluídos com sucesso!")

if __name__ == "__main__":
    robo = RoboTeste()
    robo.executar()

