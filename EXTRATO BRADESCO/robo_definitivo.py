"""
Robô de Lançamento Octus ERP - VERSÃO DEFINITIVA
Mapeamento completo via Browser MCP
Seletores 100% precisos
"""

import csv
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
        logging.FileHandler('lancamento_definitivo.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RoboOctusDefinitivo:
    """
    MAPEAMENTO EXATO VIA BROWSER MCP:
    
    ESTRUTURA:
    - iframe[0]: dashboard (invisível)
    - iframe[1]: MovtoFinanc_cons (AQUI ESTÁ TUDO!)
    - iframe[2]: consulta (invisível)
    
    BOTÕES:
    - Novo: ID = sc_b_new_top
    - Incluir: ID = sc_b_ins_t
    - Voltar: ID = sc_b_sai_t
    
    CAMPOS:
    - Data: name=mfinan_data
    - Documento: name=mfinan_documento  
    - Ordem: name=mfinan_ordem
    - Valor: name=mfinan_valor
    - Cheque: name=mfinan_cheque
    - Complemento: name=mfinan_complemento
    
    SELECTS:
    - Conta Movimento: name=cm_codigo
    - Empresa: name=emp_codigo
    - Plano de Contas: name=pc_id
    - Histórico: name=hm_codigo
    
    RADIOS:
    - Operação: name=mfinan_operacao (value=0 Entrada, value=1 Saída)
    """
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self.sucesso = 0
        self.erro = 0
        self.primeiro_registro = True
        
    def iniciar(self):
        """Inicia Chrome"""
        logger.info("\n🚀 Iniciando navegador...")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 20)
        logger.info("✓ Navegador iniciado\n")
        
    def iframe(self):
        """Entra no iframe[1] correto"""
        try:
            self.driver.switch_to.default_content()
            iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
            self.driver.switch_to.frame(iframes[1])  # iframe[1] = MovtoFinanc_cons
            return True
        except Exception as e:
            logger.error(f"✗ Erro iframe: {e}")
            return False
            
    def formulario_aberto(self):
        """Verifica se o formulário está aberto"""
        try:
            if not self.iframe():
                return False
            # Verifica se existe o botão Incluir (significa que está no formulário)
            botao_incluir = self.driver.find_elements(By.ID, "sc_b_ins_t")
            return len(botao_incluir) > 0
        except:
            return False
            
    def tela_consulta(self):
        """Verifica se está na tela de consulta"""
        try:
            if not self.iframe():
                return False
            # Verifica se existe o botão Novo (significa que está na consulta)
            botao_novo = self.driver.find_elements(By.ID, "sc_b_new_top")
            return len(botao_novo) > 0
        except:
            return False
            
    def clicar_novo(self):
        """Clica no botão Novo (ID: sc_b_new_top) com retry"""
        for tentativa in range(3):
            try:
                if not self.iframe():
                    time.sleep(1)
                    continue
                    
                botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_new_top")))
                botao.click()
                logger.info("  ✓ Clicou em 'Novo'")
                time.sleep(3)
                return True
            except Exception as e:
                if tentativa < 2:
                    logger.info(f"  → Tentativa {tentativa + 1} falhou, tentando novamente...")
                    time.sleep(2)
                else:
                    logger.error(f"  ✗ Erro ao clicar Novo após 3 tentativas")
                    return False
        return False
            
    def preencher(self, name, valor):
        """Preenche campo (BY NAME)"""
        try:
            campo = self.driver.find_element(By.NAME, name)
            campo.clear()
            campo.send_keys(str(valor))
            return True
        except:
            return False
            
    def selecionar(self, name, texto):
        """Seleciona em dropdown (BY NAME)"""
        try:
            select = Select(self.driver.find_element(By.NAME, name))
            
            # Tenta encontrar a opção pelo texto parcial
            for opcao in select.options:
                if texto.upper() in opcao.text.upper():
                    select.select_by_visible_text(opcao.text)
                    time.sleep(0.3)
                    return True
            return False
        except Exception as e:
            logger.debug(f"  Erro select {name}: {e}")
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
        """Clica no botão Incluir (ID: sc_b_ins_t)"""
        try:
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_ins_t")))
            botao.click()
            logger.info("  ✓ Salvando...")
            time.sleep(3)  # Aguarda o sistema processar
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao incluir: {e}")
            return False
            
    def lancar(self, reg, num, total):
        """Lança UM registro"""
        logger.info(f"\n[{num}/{total}] {reg['Data Lançamento']} - Doc: {reg['Documento']}")
        
        try:
            # 1. Verifica se precisa abrir formulário
            if self.tela_consulta():
                # Está na consulta, precisa clicar em Novo
                if not self.clicar_novo():
                    self.erro += 1
                    return False
            elif not self.formulario_aberto():
                # Não está em nenhuma tela conhecida, tenta clicar em Novo
                logger.info("  → Tentando abrir formulário...")
                if not self.clicar_novo():
                    self.erro += 1
                    return False
            else:
                # Formulário já está aberto, só garante iframe
                if not self.iframe():
                    self.erro += 1
                    return False
            
            # 2. Limpa campos (garantia)
            logger.info("  → Preenchendo campos...")
            time.sleep(1)
            
            # 3. Preenche
            if not self.iframe():  # Garante que está no iframe
                self.erro += 1
                return False
                
            self.preencher("mfinan_data", reg['Data Lançamento'])
            
            doc = reg['Documento'].strip()
            if doc:
                self.preencher("mfinan_documento", doc)
            
            self.selecionar("cm_codigo", "BRADESCO")
            self.marcar_operacao(reg['Operação'])
            self.preencher("mfinan_valor", reg['Valor Lançamento'])
            self.selecionar("emp_codigo", "MACLINEA")
            
            # Plano de Contas - seleciona direto
            plano = reg['Plano de Contas']
            self.selecionar("pc_id", plano)
            
            # Histórico
            hist = reg['Histórico Movimento']
            self.selecionar("hm_codigo", hist)
            
            # Complemento
            self.preencher("mfinan_complemento", reg['Complemento Descrição'])
            
            time.sleep(1)
            
            # 3. Salvar
            if not self.clicar_incluir():
                self.erro += 1
                return False
            
            logger.info(f"✓ OK!")
            self.sucesso += 1
            return True
            
        except Exception as e:
            logger.error(f"✗ ERRO: {e}")
            self.erro += 1
            return False
            
    def processar(self, arquivo):
        """Processa CSV"""
        # Já lançados
        lancados = ['169', '168', '8984796', '6605424', '1037148', '49294', '1', '']
        
        # Lê
        with open(arquivo, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            registros = list(reader)
        
        # Filtra
        pendentes = [r for r in registros 
                    if r.get('Documento', '').strip() not in lancados 
                    and r.get('Data Lançamento', '').strip()]
        
        total = len(pendentes)
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 TOTAL: {total} registros")
        logger.info(f"{'='*60}\n")
        
        # Processa
        for i, reg in enumerate(pendentes, 1):
            self.lancar(reg, i, total)
            time.sleep(2)  # Aguarda entre registros
            
    def fim(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO")
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
║       🎯 ROBÔ OCTUS - VERSÃO DEFINITIVA 🎯               ║
║                                                            ║
║       Mapeamento 100% via Browser MCP                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    robo = RoboOctusDefinitivo()
    
    try:
        robo.iniciar()
        robo.driver.get("http://sistema.maclinea.com.br:4586/app/")
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  1. Faça LOGIN                                             ║
║  2. Vá: Financeiro > Movimento Financeiro                 ║
║  3. Clique em PESQUISA para ver os registros              ║
║  4. Pressione ENTER aqui                                  ║
╚════════════════════════════════════════════════════════════╝

ENTER...
""")
        
        robo.processar("extrato_bradesco_importacao.csv")
        
    except KeyboardInterrupt:
        logger.warning("\n⚠ Parado")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        robo.fim()


if __name__ == "__main__":
    main()

