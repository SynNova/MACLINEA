"""
Robô Octus - VERSÃO OTIMIZADA
- Tempos reduzidos
- Salva progresso automaticamente
- Retoma de onde parou
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
        logging.FileHandler('lancamento_otimizado.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

ARQUIVO_PROGRESSO = 'progresso_lancamento.json'


class RoboOtimizado:
    """
    MAPEAMENTO (via Browser MCP):
    - iframe[1] = MovtoFinanc_cons
    - Botão Novo: ID = sc_b_new_top
    - Botão Incluir: ID = sc_b_ins_t
    - Campos: mfinan_data, mfinan_documento, mfinan_valor, mfinan_complemento
    - Selects: cm_codigo, emp_codigo, pc_id, hm_codigo
    - Radio: mfinan_operacao (0=Entrada, 1=Saída)
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
            # Docs já lançados inicialmente
            return ['169', '168', '8984796', '6605424', '1037148', '49294', '1', '']
    
    def salvar_progresso(self, documento):
        """Salva progresso após cada registro"""
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
        """Clica em Novo (se necessário)"""
        try:
            if not self.iframe():
                return False
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_new_top")))
            botao.click()
            time.sleep(1.5)  # Reduzido de 3s
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
                    time.sleep(0.2)  # Reduzido de 0.3s
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
        """Salva o registro"""
        try:
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_ins_t")))
            botao.click()
            time.sleep(1.5)  # Reduzido de 3s
            return True
        except:
            return False
            
    def lancar(self, reg, num, total):
        """Lança um registro"""
        doc = reg['Documento'].strip()
        logger.info(f"[{num}/{total}] {reg['Data Lançamento']} - Doc: {doc}")
        
        try:
            # Abre formulário se necessário
            if not self.form_aberto():
                if not self.clicar_novo():
                    self.erro += 1
                    return False
            else:
                # Formulário já aberto, só garante iframe
                if not self.iframe():
                    self.erro += 1
                    return False
            
            # Preenche todos os campos
            self.preencher("mfinan_data", reg['Data Lançamento'])
            
            if doc:
                self.preencher("mfinan_documento", doc)
            
            self.selecionar("cm_codigo", "BRADESCO")
            self.marcar_operacao(reg['Operação'])
            self.preencher("mfinan_valor", reg['Valor Lançamento'])
            self.selecionar("emp_codigo", "MACLINEA")
            self.selecionar("pc_id", reg['Plano de Contas'])
            self.selecionar("hm_codigo", reg['Histórico Movimento'])
            self.preencher("mfinan_complemento", reg['Complemento Descrição'])
            
            time.sleep(0.5)  # Pequena pausa antes de salvar
            
            # Salva
            if not self.clicar_incluir():
                self.erro += 1
                return False
            
            # Salva progresso
            self.salvar_progresso(doc)
            
            logger.info(f"✓ OK!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"✗ ERRO: {e}")
            self.erro += 1
            return False
            
    def processar(self, arquivo):
        """Processa CSV"""
        # Lê CSV
        with open(arquivo, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            registros = list(reader)
        
        # Filtra apenas pendentes
        pendentes = [r for r in registros 
                    if r.get('Documento', '').strip() not in self.docs_lancados 
                    and r.get('Data Lançamento', '').strip()]
        
        total = len(pendentes)
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 TOTAL: {total} registros")
        if len(self.docs_lancados) > 7:
            logger.info(f"🔄 Retomando de onde parou...")
            logger.info(f"✓ Já lançados: {len(self.docs_lancados) - 7}")
        logger.info(f"{'='*60}\n")
        
        # Processa com tempo otimizado
        for i, reg in enumerate(pendentes, 1):
            self.lancar(reg, i, total)
            time.sleep(0.8)  # Reduzido de 2s para 0.8s
            
    def fim(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO")
        logger.info(f"{'='*60}")
        logger.info(f"✓ Sucesso: {self.sucesso}")
        logger.info(f"✗ Erro: {self.erro}")
        logger.info(f"Total processado: {self.sucesso + self.erro}")
        logger.info(f"{'='*60}\n")
        
        if self.driver:
            input("Pressione ENTER para fechar...")
            self.driver.quit()


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       ⚡ ROBÔ OTIMIZADO - RÁPIDO E RETOMÁVEL ⚡          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    robo = RoboOtimizado()
    
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
        
        robo.processar("extrato_bradesco_importacao.csv")
        
    except KeyboardInterrupt:
        logger.warning(f"\n\n⚠ PAUSADO - Salvos: {robo.sucesso}")
        logger.info("Execute novamente para continuar de onde parou!")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
    finally:
        robo.fim()


if __name__ == "__main__":
    main()




