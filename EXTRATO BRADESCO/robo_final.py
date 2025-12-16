"""
Robô de Lançamento Octus ERP - VERSÃO FINAL
Com seletores EXATOS mapeados pelo browser MCP
"""

import csv
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler('lancamento_final.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RoboOctusFinal:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.sucesso = 0
        self.erro = 0
        
    def iniciar_navegador(self):
        """Inicia Chrome"""
        logger.info("\n🚀 Iniciando navegador...")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 20)
        logger.info("✓ Navegador iniciado\n")
        
    def entrar_iframe_principal(self):
        """Entra no iframe principal (iframe[1] = iframe_17)"""
        try:
            self.driver.switch_to.default_content()
            iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
            
            if len(iframes) > 1:
                # Entra no segundo iframe (índice 1)
                self.driver.switch_to.frame(iframes[1])
                return True
            else:
                logger.error("✗ iframe principal não encontrado")
                return False
        except Exception as e:
            logger.error(f"✗ Erro ao entrar no iframe: {e}")
            return False
            
    def clicar_novo(self):
        """Clica no botão Novo - ID: sc_b_new_top"""
        try:
            if not self.entrar_iframe_principal():
                return False
                
            # Usa o ID exato que encontramos
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_new_top")))
            botao.click()
            logger.info("  ✓ Clicou em 'Novo'")
            time.sleep(3)
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao clicar em Novo: {e}")
            return False
            
    def preencher_campo(self, name, valor):
        """Preenche um campo pelo nome"""
        try:
            campo = self.driver.find_element(By.NAME, name)
            campo.clear()
            campo.send_keys(valor)
            return True
        except:
            return False
            
    def selecionar_dropdown(self, name, texto_parcial):
        """Seleciona opção em dropdown"""
        try:
            select = self.driver.find_element(By.NAME, name)
            opcoes = select.find_elements(By.TAG_NAME, "option")
            
            for opcao in opcoes:
                if texto_parcial.upper() in opcao.text.upper():
                    opcao.click()
                    time.sleep(0.3)
                    return True
            return False
        except Exception as e:
            logger.debug(f"  Erro dropdown {name}: {e}")
            return False
            
    def selecionar_autocomplete(self, campo_id, texto):
        """Preenche campo autocomplete (Plano de Contas)"""
        try:
            # Clica no campo
            campo = self.driver.find_element(By.XPATH, f"//input[contains(@class, 'select2-search__field')]")
            campo.click()
            time.sleep(0.5)
            
            # Digita o texto
            campo.send_keys(texto)
            time.sleep(1)
            
            # Pressiona Enter
            campo.send_keys(Keys.ENTER)
            time.sleep(0.5)
            return True
        except Exception as e:
            logger.debug(f"  Erro autocomplete: {e}")
            return False
            
    def marcar_radio(self, valor):
        """Marca radio (E=Entrada, S=Saída)"""
        try:
            radio = self.driver.find_element(By.XPATH, f"//input[@type='radio' and @value='{valor}']")
            radio.click()
            return True
        except:
            return False
            
    def clicar_incluir(self):
        """Clica no botão Incluir"""
        try:
            # Procura pelo ID ou classe similar ao botão Novo
            botao = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@id, 'sc_b_ins') or contains(text(), 'Incluir')]"))
            )
            botao.click()
            logger.info("  ✓ Salvou!")
            time.sleep(3)
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao salvar: {e}")
            return False
            
    def lancar_registro(self, reg, num, total):
        """Lança um registro completo"""
        logger.info(f"\n{'='*60}")
        logger.info(f"[{num}/{total}] {reg['Data Lançamento']} - Doc: {reg['Documento']}")
        
        try:
            # 1. Clicar em Novo
            if not self.clicar_novo():
                self.erro += 1
                return False
            
            # 2. Preencher campos
            logger.info("  → Preenchendo...")
            
            self.preencher_campo("Mfinan_data", reg['Data Lançamento'])
            
            doc = reg['Documento'].strip()
            if doc:
                self.preencher_campo("Mfinan_documento", doc)
            
            self.selecionar_dropdown("Cm_id", "BRADESCO")
            
            # Operação
            op = 'E' if reg['Operação'].upper() == 'ENTRADA' else 'S'
            self.marcar_radio(op)
            
            self.preencher_campo("Mfinan_valor", reg['Valor Lançamento'])
            
            self.selecionar_dropdown("Empr_id", "MACLINEA")
            
            # Plano de Contas - extrai o código
            plano = reg['Plano de Contas']
            if " - " in plano:
                codigo_plano = plano.split(" - ")[0].strip()
            else:
                codigo_plano = plano
            self.selecionar_autocomplete("Pc_id", codigo_plano)
            
            # Histórico
            hist = "1 - RECEBIMENTO" if reg['Histórico Movimento'].startswith("1") else "2 - FINANCEIRO"
            self.selecionar_dropdown("Hmov_id", hist)
            
            # Complemento
            self.preencher_campo("Mfinan_complemento", reg['Complemento Descrição'])
            
            time.sleep(1)
            
            # 3. Salvar
            if not self.clicar_incluir():
                self.erro += 1
                return False
            
            logger.info(f"✓ SUCESSO!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"✗ ERRO: {e}")
            self.erro += 1
            return False
            
    def processar_csv(self, arquivo):
        """Processa CSV"""
        # Docs já lançados
        lancados = ['169', '168', '8984796', '6605424', '1037148', '49294', '1', '']
        
        # Lê CSV
        with open(arquivo, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            registros = list(reader)
        
        # Filtra
        pendentes = []
        for r in registros:
            doc = r.get('Documento', '').strip()
            data = r.get('Data Lançamento', '').strip()
            if doc not in lancados and data:
                pendentes.append(r)
        
        total = len(pendentes)
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 TOTAL A PROCESSAR: {total} registros")
        logger.info(f"{'='*60}\n")
        
        # Processa
        for i, reg in enumerate(pendentes, 1):
            self.lancar_registro(reg, i, total)
            time.sleep(1.5)
            
    def finalizar(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 RESUMO FINAL")
        logger.info(f"{'='*60}")
        logger.info(f"✓ Sucesso: {self.sucesso}")
        logger.info(f"✗ Erro: {self.erro}")
        logger.info(f"Total: {self.sucesso + self.erro}")
        logger.info(f"{'='*60}\n")
        
        if self.driver:
            input("\nPressione ENTER para fechar...")
            self.driver.quit()


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🤖 ROBÔ OCTUS ERP - VERSÃO FINAL 🤖              ║
║                                                            ║
║         Com seletores mapeados via Browser MCP            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    URL = "http://sistema.maclinea.com.br:4586/app/"
    CSV = "extrato_bradesco_importacao.csv"
    
    robo = RoboOctusFinal()
    
    try:
        robo.iniciar_navegador()
        robo.driver.get(URL)
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  INSTRUÇÕES:                                               ║
║                                                            ║
║  1. Faça LOGIN                                            ║
║  2. Vá em: Financeiro > Movimento Financeiro              ║
║  3. Clique em PESQUISA (se necessário)                    ║
║  4. Pressione ENTER aqui                                  ║
╚════════════════════════════════════════════════════════════╝

Pressione ENTER...
""")
        
        robo.processar_csv(CSV)
        
    except KeyboardInterrupt:
        logger.warning("\n⚠ Interrompido")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        robo.finalizar()


if __name__ == "__main__":
    main()




