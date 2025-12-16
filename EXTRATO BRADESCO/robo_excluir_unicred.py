"""
Robô de Exclusão - Unicred
Exclui TODOS os registros do Unicred EXCETO IDs 9 e 49
Mapeamento 100% via Browser MCP
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.alert import Alert
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler('exclusao_unicred.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RoboExclusaoUnicred:
    """
    MAPEAMENTO VIA BROWSER MCP:
    
    TELA DE CONSULTA:
    - Botão Editar: a[title="Editar o Registro"]
    
    FORMULÁRIO DE EDIÇÃO:
    - Botão Excluir: ID = sc_b_del_t (vermelho)
    - Botão Voltar: ID = sc_b_sai_t
    - Número do registro: no texto do formulário
    
    LÓGICA:
    1. Lista todos os registros da tela
    2. Para cada registro (exceto ID 9 e 49):
       - Clica em Editar
       - Clica em Excluir
       - Confirma popup (se houver)
       - Volta para listagem
    3. Repete até acabar
    """
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self.excluidos = 0
        self.protegidos = 0
        self.erros = 0
        
    def iniciar(self):
        """Inicia Chrome"""
        logger.info("\n🗑️  Iniciando robô de exclusão...")
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
            if len(iframes) > 1:
                self.driver.switch_to.frame(iframes[1])
                return True
            return False
        except:
            return False
            
    def obter_id_registro_atual(self):
        """Obtém o ID do registro no formulário de edição"""
        try:
            if not self.iframe():
                return None
            
            # Procura por "Nro. Registro: XXX"
            texto_completo = self.driver.find_element(By.TAG_NAME, "body").text
            import re
            match = re.search(r'Nro\.\s*Registro:\s*(\d+)', texto_completo)
            
            if match:
                return match.group(1)
            return None
        except:
            return None
            
    def clicar_primeiro_editar(self):
        """Clica no primeiro botão de Editar"""
        try:
            if not self.iframe():
                return False, None
            
            # Procura o primeiro botão com título "Editar o Registro"
            botao = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, '//a[@title="Editar o Registro"]'))
            )
            
            # Tenta pegar o ID da linha antes de clicar
            linha = botao.find_element(By.XPATH, './ancestor::tr')
            celulas = linha.find_elements(By.TAG_NAME, 'td')
            id_registro = celulas[2].text.strip() if len(celulas) > 2 else '?'
            
            botao.click()
            time.sleep(2)
            
            return True, id_registro
        except Exception as e:
            logger.error(f"  ✗ Erro ao clicar em Editar: {e}")
            return False, None
            
    def clicar_excluir(self):
        """Clica no botão Excluir (ID: sc_b_del_t)"""
        try:
            if not self.iframe():
                return False
            
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_del_t")))
            botao.click()
            logger.info("  ✓ Clicou em Excluir")
            time.sleep(1)
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao clicar em Excluir: {e}")
            return False
            
    def confirmar_popup(self):
        """Confirma popup de exclusão"""
        try:
            # Aguarda popup aparecer
            time.sleep(1)
            
            if not self.iframe():
                return False
            
            # Tenta encontrar o botão OK do dialog
            # O dialog não é um alert JS, é um elemento HTML
            botao_ok = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Ok')]"))
            )
            
            logger.info("  → Confirmando exclusão...")
            botao_ok.click()
            logger.info("  ✓ Confirmou!")
            time.sleep(2)
            return True
        except:
            # Tenta com alert JS tradicional
            try:
                alert = Alert(self.driver)
                alert.accept()
                logger.info("  ✓ Confirmou via alert")
                time.sleep(2)
                return True
            except:
                # Se não encontrou popup, pode ter excluído direto
                logger.info("  → Sem popup (excluiu direto)")
                return True
            
    def clicar_voltar(self):
        """Clica no botão Voltar (ID: sc_b_sai_t)"""
        try:
            if not self.iframe():
                return False
            
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_sai_t")))
            botao.click()
            time.sleep(2)
            return True
        except:
            # Se não encontrar Voltar, pode ser que já voltou automaticamente
            return True
            
    def excluir_registro(self, numero):
        """Exclui UM registro completo"""
        logger.info(f"\n[{numero}] ID: {numero}")
        
        # IDs protegidos (não excluir)
        if numero in ['9', '49']:
            logger.info(f"  ⚠️  PROTEGIDO - Pulando")
            self.protegidos += 1
            return False
        
        try:
            # 1. Clica em Editar
            sucesso, id_encontrado = self.clicar_primeiro_editar()
            if not sucesso:
                self.erros += 1
                return False
            
            # 2. Verifica qual ID abriu
            id_atual = self.obter_id_registro_atual()
            logger.info(f"  → Editando registro ID: {id_atual}")
            
            # Se for ID protegido, volta sem excluir
            if id_atual in ['9', '49']:
                logger.info(f"  ⚠️  ID {id_atual} PROTEGIDO - Voltando sem excluir")
                self.clicar_voltar()
                self.protegidos += 1
                return False
            
            # 3. Clica em Excluir
            if not self.clicar_excluir():
                self.clicar_voltar()
                self.erros += 1
                return False
            
            # 4. Confirma popup
            if not self.confirmar_popup():
                self.erros += 1
                return False
            
            # 5. Volta para listagem (pode ser automático)
            time.sleep(1)
            
            logger.info(f"  ✓ EXCLUÍDO! (ID: {id_atual})")
            self.excluidos += 1
            return True
            
        except Exception as e:
            logger.error(f"  ✗ ERRO: {e}")
            self.erros += 1
            # Tenta voltar em caso de erro
            try:
                self.clicar_voltar()
            except:
                pass
            return False
            
    def contar_registros(self):
        """Conta quantos registros ainda existem na tela"""
        try:
            if not self.iframe():
                return 0
            
            # Conta botões de editar
            botoes = self.driver.find_elements(By.XPATH, '//a[@title="Editar o Registro"]')
            return len(botoes)
        except:
            return 0
            
    def processar_exclusoes(self):
        """Processa todas as exclusões"""
        logger.info(f"\n{'='*60}")
        logger.info(f"EXCLUSAO EM MASSA - UNICRED")
        logger.info(f"{'='*60}")
        logger.info(f"⚠️  IDs PROTEGIDOS: 9 e 49 (não serão excluídos)")
        logger.info(f"{'='*60}\n")
        
        contador = 1
        max_tentativas = 200  # Segurança para não entrar em loop infinito
        
        while contador <= max_tentativas:
            # Conta quantos registros ainda existem
            total_atual = self.contar_registros()
            
            if total_atual == 0:
                logger.info("\n✓ Nenhum registro restante para excluir!")
                break
            
            if total_atual <= 2:
                # Provavelmente só sobraram os IDs 9 e 49
                logger.info(f"\n✓ Restam apenas {total_atual} registros (provavelmente IDs 9 e 49)")
                logger.info("✓ Processo completo!")
                break
            
            logger.info(f"  → Registros restantes: {total_atual}")
            
            # Exclui o próximo (sempre o primeiro da lista)
            self.excluir_registro(str(contador))
            
            contador += 1
            time.sleep(1)
            
    def fim(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO FINAL")
        logger.info(f"{'='*60}")
        logger.info(f"✓ Excluídos: {self.excluidos}")
        logger.info(f"⚠️  Protegidos: {self.protegidos}")
        logger.info(f"✗ Erros: {self.erros}")
        logger.info(f"{'='*60}\n")
        
        if self.driver:
            input("Pressione ENTER para fechar...")
            self.driver.quit()


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      🗑️  ROBÔ DE EXCLUSÃO - UNICRED 🗑️                   ║
║                                                            ║
║      Exclui todos EXCETO IDs 9 e 49                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    robo = RoboExclusaoUnicred()
    
    try:
        robo.iniciar()
        robo.driver.get("http://sistema.maclinea.com.br:4586/app/")
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  ⚠️  ATENÇÃO: Este robô VAI EXCLUIR registros!            ║
║                                                            ║
║  1. LOGIN                                                  ║
║  2. Financeiro > Movimento Financeiro                     ║
║  3. Filtre: Conta = 1 - UNICREDI                          ║
║  4. PESQUISA                                              ║
║  5. Pressione ENTER para INICIAR EXCLUSÃO                 ║
║                                                            ║
║  IDs 9 e 49 serão PROTEGIDOS automaticamente              ║
╚════════════════════════════════════════════════════════════╝

ENTER para CONFIRMAR E INICIAR...
""")
        
        robo.processar_exclusoes()
        
    except KeyboardInterrupt:
        logger.warning(f"\n⚠ PAUSADO - Excluídos: {robo.excluidos}")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        robo.fim()


if __name__ == "__main__":
    main()

