"""
Robô de Lançamento Multi-Banco - Versão Otimizada
Processa extratos de múltiplos bancos (ITAU, BRADESCO, SANTANDER, etc.)
Lê a coluna "Conta Movimento" do CSV para selecionar o banco correto
"""

import csv
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler('lancamento_multibanco.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

ARQUIVO_PROGRESSO = 'progresso_multibanco.json'


class RoboMultiBanco:
    """
    Robô para lançar movimentos de múltiplos bancos
    Lê a coluna "Conta Movimento" do CSV para selecionar o banco correto
    Suporta: ITAU, BRADESCO, SANTANDER, UNICREDI, CAIXA, BANCO DO BRASIL, etc.
    """
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self.sucesso = 0
        self.erro = 0
        self.docs_lancados = self.carregar_progresso()
        
    def carregar_progresso(self):
        """Carrega documentos já lançados"""
        try:
            with open(ARQUIVO_PROGRESSO, 'r') as f:
                dados = json.load(f)
                return dados.get('docs_lancados', [])
        except:
            return []
    
    def salvar_progresso(self, documento):
        """Salva progresso"""
        try:
            if documento and documento not in self.docs_lancados:
                self.docs_lancados.append(documento)
            
            with open(ARQUIVO_PROGRESSO, 'w') as f:
                json.dump({'docs_lancados': self.docs_lancados}, f)
        except:
            pass
        
    def iniciar(self):
        """Inicia Chrome"""
        logger.info("\n🚀 Iniciando navegador...")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 15)
        logger.info("✓ Pronto\n")
        
    def iframe(self):
        """Entra no iframe[1]"""
        try:
            self.driver.switch_to.default_content()
            iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
            self.driver.switch_to.frame(iframes[1])
            return True
        except:
            return False
            
    def form_aberto(self):
        """Verifica se formulário está aberto"""
        try:
            if not self.iframe():
                return False
            return len(self.driver.find_elements(By.ID, "sc_b_ins_t")) > 0
        except:
            return False
            
    def clicar_novo(self):
        """Clica em Novo"""
        try:
            if not self.iframe():
                return False
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_new_top")))
            botao.click()
            time.sleep(1.5)
            return True
        except:
            return False
            
    def preencher(self, name, valor):
        """Preenche campo"""
        try:
            campo = self.driver.find_element(By.NAME, name)
            campo.clear()
            campo.send_keys(str(valor))
            return True
        except:
            return False
            
    def selecionar(self, name, texto):
        """Seleciona em dropdown"""
        try:
            select = Select(self.driver.find_element(By.NAME, name))
            for opcao in select.options:
                if texto.upper() in opcao.text.upper():
                    select.select_by_visible_text(opcao.text)
                    time.sleep(0.2)
                    return True
            return False
        except:
            return False
            
    def marcar_operacao(self, tipo):
        """Marca Entrada (0) ou Saída (1)"""
        try:
            valor = "0" if tipo.upper() == "ENTRADA" else "1"
            radio = self.driver.find_element(By.XPATH, f"//input[@name='mfinan_operacao' and @value='{valor}']")
            radio.click()
            return True
        except:
            return False
            
    def clicar_incluir(self):
        """Salva"""
        try:
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_ins_t")))
            botao.click()
            time.sleep(1.5)
            return True
        except:
            return False
            
    def lancar(self, reg, num, total):
        """Lança um registro - detecta banco automaticamente pela coluna Conta Movimento"""
        doc = reg['Documento'].strip()
        banco = reg.get('Conta Movimento', '').strip()
        logger.info(f"[{num}/{total}] {reg['Data Lançamento']} - {banco} - {reg['Operação']:7} - Doc: {doc}")
        
        try:
            # Abre formulário se necessário
            if not self.form_aberto():
                if not self.clicar_novo():
                    self.erro += 1
                    return False
            else:
                if not self.iframe():
                    self.erro += 1
                    return False
            
            # Preenche
            self.preencher("mfinan_data", reg['Data Lançamento'])
            
            if doc:
                self.preencher("mfinan_documento", doc)
            
            # Seleciona o banco da coluna "Conta Movimento" (ex: "4 - ITAU", "6 - BRADESCO")
            self.selecionar("cm_codigo", banco)
            self.marcar_operacao(reg['Operação'])
            self.preencher("mfinan_valor", reg['Valor Lançamento'])
            self.selecionar("emp_codigo", "MACLINEA")
            self.selecionar("pc_id", reg['Plano de Contas'])
            self.selecionar("hm_codigo", reg['Histórico Movimento'])
            self.preencher("mfinan_complemento", reg['Complemento Descrição'])
            
            time.sleep(0.5)
            
            # Salva
            if not self.clicar_incluir():
                self.erro += 1
                return False
            
            self.salvar_progresso(doc)
            
            logger.info(f"✓ OK!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"✗ ERRO: {e}")
            self.erro += 1
            return False
            
    def processar(self, arquivo):
        """Processa CSV com múltiplos bancos"""
        # Lê CSV
        with open(arquivo, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            registros = list(reader)
        
        # Filtra pendentes
        pendentes = [r for r in registros 
                    if r.get('Documento', '').strip() not in self.docs_lancados 
                    and r.get('Data Lançamento', '').strip()]
        
        total = len(pendentes)
        
        # Conta por banco
        bancos = {}
        for r in pendentes:
            banco = r.get('Conta Movimento', 'N/A')
            bancos[banco] = bancos.get(banco, 0) + 1
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 MULTI-BANCO - TOTAL: {total} registros")
        logger.info(f"{'='*60}")
        for banco, qtd in sorted(bancos.items()):
            logger.info(f"   {banco}: {qtd}")
        if self.docs_lancados:
            logger.info(f"{'='*60}")
            logger.info(f"✓ Já lançados anteriormente: {len(self.docs_lancados)}")
        logger.info(f"{'='*60}\n")
        
        # Processa
        for i, reg in enumerate(pendentes, 1):
            self.lancar(reg, i, total)
            time.sleep(0.8)
            
    def fim(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO MULTI-BANCO")
        logger.info(f"{'='*60}")
        logger.info(f"✓ Sucesso: {self.sucesso}")
        logger.info(f"✗ Erro: {self.erro}")
        logger.info(f"{'='*60}\n")
        
        if self.driver:
            input("Pressione ENTER para fechar...")
            self.driver.quit()


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      🏦 ROBÔ MULTI-BANCO - LANÇAMENTO AUTOMÁTICO 🏦       ║
║                                                            ║
║   Processa: ITAU, BRADESCO, SANTANDER, UNICREDI, etc.     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    robo = RoboMultiBanco()
    
    try:
        robo.iniciar()
        robo.driver.get("http://sistema.maclinea.com.br:4586/app/")
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  1. LOGIN                                                  ║
║  2. Financeiro > Movimento Financeiro                     ║
║  3. PESQUISA                                              ║
║  4. ENTER                                                 ║
╚════════════════════════════════════════════════════════════╝

ENTER...
""")
        
        robo.processar("extrato_unicred_novo.csv")
        
    except KeyboardInterrupt:
        logger.warning(f"\n⚠ PAUSADO - Salvos: {robo.sucesso}")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        robo.fim()


if __name__ == "__main__":
    main()


