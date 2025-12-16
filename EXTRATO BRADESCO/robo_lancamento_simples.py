"""
Robô de Lançamento Simplificado - Octus ERP
Versão otimizada que usa JavaScript direto
"""

import csv
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler('lancamento_robo.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RoboLancamentoSimples:
    def __init__(self, url_sistema):
        self.url = url_sistema
        self.driver = None
        self.wait = None
        self.sucesso = 0
        self.erro = 0
        
    def iniciar(self):
        """Inicia o navegador"""
        logger.info("🚀 Iniciando navegador...")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 20)
        self.driver.get(self.url)
        logger.info("✓ Navegador iniciado")
        
    def executar_js(self, script):
        """Executa JavaScript"""
        return self.driver.execute_script(script)
        
    def clicar_novo_js(self):
        """Clica no botão Novo usando JavaScript"""
        script = """
        // Procura por botão com texto "Novo"
        var botoes = document.querySelectorAll('div, button, a');
        for (var i = 0; i < botoes.length; i++) {
            if (botoes[i].textContent.includes('Novo')) {
                botoes[i].click();
                return true;
            }
        }
        return false;
        """
        return self.executar_js(script)
        
    def preencher_campo(self, nome_campo, valor):
        """Preenche um campo usando JavaScript"""
        script = f"""
        var campo = document.querySelector('[name="{nome_campo}"]');
        if (campo) {{
            campo.value = '{valor}';
            campo.dispatchEvent(new Event('change'));
            return true;
        }}
        return false;
        """
        return self.executar_js(script)
        
    def selecionar_dropdown(self, nome_campo, texto):
        """Seleciona opção em dropdown"""
        script = f"""
        var select = document.querySelector('[name="{nome_campo}"]');
        if (select) {{
            for (var i = 0; i < select.options.length; i++) {{
                if (select.options[i].text.includes('{texto}')) {{
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change'));
                    return true;
                }}
            }}
        }}
        return false;
        """
        return self.executar_js(script)
        
    def marcar_radio(self, valor):
        """Marca radio button (E=Entrada, S=Saída)"""
        script = f"""
        var radio = document.querySelector('input[type="radio"][value="{valor}"]');
        if (radio) {{
            radio.click();
            return true;
        }}
        return false;
        """
        return self.executar_js(script)
        
    def clicar_incluir_js(self):
        """Clica no botão Incluir"""
        script = """
        var botoes = document.querySelectorAll('div, button, a');
        for (var i = 0; i < botoes.length; i++) {
            if (botoes[i].textContent.includes('Incluir')) {
                botoes[i].click();
                return true;
            }
        }
        return false;
        """
        return self.executar_js(script)
        
    def lancar_registro(self, registro, numero, total):
        """Lança um registro"""
        logger.info(f"\n[{numero}/{total}] {registro['Data Lançamento']} - Doc: {registro['Documento']}")
        
        try:
            # 1. Clicar em Novo
            logger.info("  → Clicando em Novo...")
            if not self.clicar_novo_js():
                logger.error("  ✗ Erro ao clicar em Novo")
                return False
            time.sleep(2)
            
            # 2. Preencher campos
            logger.info("  → Preenchendo campos...")
            self.preencher_campo("Mfinan_data", registro['Data Lançamento'])
            self.preencher_campo("Mfinan_documento", registro['Documento'])
            self.selecionar_dropdown("Cm_id", "6 - BRADESCO")
            
            # 3. Operação
            op = 'E' if registro['Operação'].upper() == 'ENTRADA' else 'S'
            self.marcar_radio(op)
            
            # 4. Valor
            self.preencher_campo("Mfinan_valor", registro['Valor Lançamento'])
            
            # 5. Empresa
            self.selecionar_dropdown("Empr_id", "MACLINEA")
            
            # 6. Histórico
            hist = "1 - RECEBIMENTO" if registro['Histórico Movimento'].startswith("1") else "2 - FINANCEIRO"
            self.selecionar_dropdown("Hmov_id", hist)
            
            # 7. Complemento
            self.preencher_campo("Mfinan_complemento", registro['Complemento Descrição'])
            
            time.sleep(1)
            
            # 8. Salvar
            logger.info("  → Salvando...")
            if not self.clicar_incluir_js():
                logger.error("  ✗ Erro ao salvar")
                return False
                
            time.sleep(2)
            logger.info("  ✓ Sucesso!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Erro: {e}")
            self.erro += 1
            return False
            
    def processar_csv(self, arquivo):
        """Processa o CSV"""
        # Registros já lançados
        docs_lancados = ['169', '168', '8984796', '6605424', '1037148', '49294', '1', '']
        
        # Ler CSV
        with open(arquivo, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            registros = list(reader)
        
        # Filtrar
        pendentes = []
        for r in registros:
            doc = r.get('Documento', '').strip()
            data = r.get('Data Lançamento', '').strip()
            if doc not in docs_lancados and data:
                pendentes.append(r)
        
        total = len(pendentes)
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 TOTAL A PROCESSAR: {total} registros")
        logger.info(f"{'='*60}\n")
        
        # Processar
        for i, registro in enumerate(pendentes, 1):
            self.lancar_registro(registro, i, total)
            time.sleep(1)
            
    def finalizar(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 RESUMO")
        logger.info(f"{'='*60}")
        logger.info(f"✓ Sucesso: {self.sucesso}")
        logger.info(f"✗ Erro: {self.erro}")
        logger.info(f"{'='*60}\n")
        
        if self.driver:
            input("Pressione ENTER para fechar o navegador...")
            self.driver.quit()


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🤖 ROBÔ DE LANÇAMENTO (VERSÃO SIMPLES) 🤖         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    URL = "http://sistema.maclinea.com.br:4586/app/"
    CSV = "extrato_bradesco_importacao.csv"
    
    robo = RoboLancamentoSimples(URL)
    
    try:
        robo.iniciar()
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  INSTRUÇÕES:                                               ║
║                                                            ║
║  1. Faça LOGIN no sistema                                 ║
║  2. Vá em: Financeiro > Movimento Financeiro              ║
║  3. Pressione ENTER aqui                                  ║
╚════════════════════════════════════════════════════════════╝

Pressione ENTER quando pronto...
""")
        
        robo.processar_csv(CSV)
        
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Interrompido")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
    finally:
        robo.finalizar()


if __name__ == "__main__":
    main()




