"""
Robô de Lançamento Octus ERP - Versão 2.0
Baseado em melhores práticas de automação com iframes
"""

import csv
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, TimeoutException
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler('lancamento_robo.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RoboOctusV2:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.sucesso = 0
        self.erro = 0
        
    def iniciar_navegador(self):
        """Inicia o Chrome"""
        logger.info("Iniciando navegador...")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 20)
        logger.info("✓ Navegador iniciado")
        
    def encontrar_iframe_correto(self):
        """Encontra o iframe que contém o botão Novo"""
        logger.info("Procurando iframe correto...")
        
        # Volta para o contexto principal
        self.driver.switch_to.default_content()
        
        # Lista todos os iframes
        iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
        logger.info(f"  Total de iframes: {len(iframes)}")
        
        # Script para procurar o botão Novo
        script_busca = """
        var elementos = document.querySelectorAll('*');
        for (var i = 0; i < elementos.length; i++) {
            var texto = elementos[i].textContent || '';
            if (texto.includes('Novo') && elementos[i].offsetHeight > 0 && elementos[i].offsetWidth > 0) {
                return true;
            }
        }
        return false;
        """
        
        # Testa cada iframe
        for i, iframe in enumerate(iframes):
            try:
                self.driver.switch_to.default_content()
                self.driver.switch_to.frame(iframe)
                
                # Verifica se o botão Novo existe neste iframe
                tem_botao = self.driver.execute_script(script_busca)
                
                if tem_botao:
                    logger.info(f"✓ Botão 'Novo' encontrado no iframe {i}")
                    return True
                    
            except Exception as e:
                logger.debug(f"  Iframe {i}: {e}")
                continue
        
        logger.error("✗ Botão 'Novo' não encontrado em nenhum iframe")
        return False
        
    def clicar_novo(self):
        """Clica no botão + Novo usando JavaScript"""
        script = """
        // Procura elementos com texto "Novo"
        var elementos = document.querySelectorAll('div, button, a, span');
        for (var i = 0; i < elementos.length; i++) {
            var texto = elementos[i].textContent || '';
            if (texto.includes('Novo') && elementos[i].offsetHeight > 0) {
                elementos[i].click();
                return true;
            }
        }
        return false;
        """
        
        resultado = self.driver.execute_script(script)
        if resultado:
            logger.info("  ✓ Clicou em 'Novo'")
            time.sleep(2)
            return True
        else:
            logger.error("  ✗ Não encontrou botão 'Novo'")
            return False
            
    def preencher_campo_js(self, nome, valor):
        """Preenche campo usando JavaScript"""
        script = f"""
        var campo = document.querySelector('[name="{nome}"]');
        if (campo) {{
            campo.value = '{valor}';
            campo.dispatchEvent(new Event('change', {{ bubbles: true }}));
            campo.dispatchEvent(new Event('input', {{ bubbles: true }}));
            return true;
        }}
        return false;
        """
        return self.driver.execute_script(script)
        
    def selecionar_dropdown_js(self, nome, texto_parcial):
        """Seleciona opção em dropdown"""
        script = f"""
        var select = document.querySelector('[name="{nome}"]');
        if (select) {{
            for (var i = 0; i < select.options.length; i++) {{
                if (select.options[i].text.includes('{texto_parcial}')) {{
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    return true;
                }}
            }}
        }}
        return false;
        """
        return self.driver.execute_script(script)
        
    def marcar_radio_js(self, valor):
        """Marca radio button (E=Entrada, S=Saída)"""
        script = f"""
        var radios = document.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radios.length; i++) {{
            if (radios[i].value === '{valor}') {{
                radios[i].click();
                return true;
            }}
        }}
        return false;
        """
        return self.driver.execute_script(script)
        
    def clicar_incluir(self):
        """Clica no botão Incluir"""
        script = """
        var elementos = document.querySelectorAll('div, button, a, span');
        for (var i = 0; i < elementos.length; i++) {
            var texto = elementos[i].textContent || '';
            if (texto.includes('Incluir') && elementos[i].offsetHeight > 0) {
                elementos[i].click();
                return true;
            }
        }
        return false;
        """
        resultado = self.driver.execute_script(script)
        if resultado:
            logger.info("  ✓ Clicou em 'Incluir'")
            time.sleep(2)
            return True
        return False
        
    def lancar_registro(self, reg, num, total):
        """Lança um registro completo"""
        logger.info(f"\n{'='*60}")
        logger.info(f"[{num}/{total}] {reg['Data Lançamento']} - Doc: {reg['Documento']}")
        logger.info(f"{'='*60}")
        
        try:
            # 1. Encontra iframe e clica em Novo
            if not self.encontrar_iframe_correto():
                logger.error("✗ Não encontrou iframe")
                self.erro += 1
                return False
                
            if not self.clicar_novo():
                logger.error("✗ Não clicou em Novo")
                self.erro += 1
                return False
            
            # 2. Preenche campos
            logger.info("  → Preenchendo campos...")
            
            # Data
            if not self.preencher_campo_js("Mfinan_data", reg['Data Lançamento']):
                logger.warning("  ⚠ Não preencheu data")
                
            # Documento
            doc = reg['Documento'].strip()
            if doc:
                self.preencher_campo_js("Mfinan_documento", doc)
            
            # Conta Movimento
            if not self.selecionar_dropdown_js("Cm_id", "BRADESCO"):
                logger.warning("  ⚠ Não selecionou conta")
            
            # Operação (Entrada/Saída)
            op = 'E' if reg['Operação'].upper() == 'ENTRADA' else 'S'
            if not self.marcar_radio_js(op):
                logger.warning("  ⚠ Não marcou operação")
            
            # Valor
            if not self.preencher_campo_js("Mfinan_valor", reg['Valor Lançamento']):
                logger.warning("  ⚠ Não preencheu valor")
            
            # Empresa
            if not self.selecionar_dropdown_js("Empr_id", "MACLINEA"):
                logger.warning("  ⚠ Não selecionou empresa")
            
            # Histórico
            hist_texto = "RECEBIMENTO" if reg['Histórico Movimento'].startswith("1") else "FINANCEIRO"
            if not self.selecionar_dropdown_js("Hmov_id", hist_texto):
                logger.warning("  ⚠ Não selecionou histórico")
            
            # Complemento
            if not self.preencher_campo_js("Mfinan_complemento", reg['Complemento Descrição']):
                logger.warning("  ⚠ Não preencheu complemento")
            
            time.sleep(1)
            
            # 3. Salva
            logger.info("  → Salvando...")
            if not self.clicar_incluir():
                logger.error("  ✗ Não clicou em Incluir")
                self.erro += 1
                return False
            
            logger.info("  ✓ SUCESSO!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"  ✗ ERRO: {e}")
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
        
        # Filtra pendentes
        pendentes = []
        for r in registros:
            doc = r.get('Documento', '').strip()
            data = r.get('Data Lançamento', '').strip()
            if doc not in lancados and data:
                pendentes.append(r)
        
        total = len(pendentes)
        logger.info(f"\n{'='*60}")
        logger.info(f"TOTAL A PROCESSAR: {total} registros")
        logger.info(f"{'='*60}\n")
        
        # Processa
        for i, reg in enumerate(pendentes, 1):
            self.lancar_registro(reg, i, total)
            time.sleep(1)
            
    def finalizar(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO FINAL")
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
║        🤖 ROBÔ OCTUS ERP - VERSÃO 2.0 🤖                  ║
║                                                            ║
║        Com detecção automática de iframes                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    URL = "http://sistema.maclinea.com.br:4586/app/"
    CSV = "extrato_bradesco_importacao.csv"
    
    robo = RoboOctusV2()
    
    try:
        robo.iniciar_navegador()
        robo.driver.get(URL)
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  INSTRUÇÕES:                                               ║
║                                                            ║
║  1. Faça LOGIN no sistema                                 ║
║  2. Vá em: Financeiro > Movimento Financeiro              ║
║  3. Pressione ENTER aqui                                  ║
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




