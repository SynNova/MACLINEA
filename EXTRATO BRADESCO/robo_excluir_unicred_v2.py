"""
Robô de Exclusão Unicred - VERSÃO FINAL
Mapeamento 100% via Browser MCP
Exclui todos EXCETO IDs 9 e 49
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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
    MAPEAMENTO COMPLETO VIA BROWSER MCP:
    
    CONSULTA:
    - Botão Editar: //a[@title="Editar o Registro"]
    - Total de botões: 100
    
    FORMULÁRIO DE EDIÇÃO:
    - Botão Excluir: ID = sc_b_del_t
    - Botão Voltar: ID = sc_b_sai_t
    - Número do registro: "Nro. Registro: XXX"
    
    POPUP DE CONFIRMAÇÃO:
    - Tipo: Dialog HTML (não alert JS!)
    - Mensagem: "Confirma a exclusão do registro?"
    - Botão OK: //button[contains(text(), 'Ok')]
    - Botão Cancelar: //button[contains(text(), 'Cancelar')]
    
    IDs PROTEGIDOS: 9 e 49 (NÃO serão excluídos)
    """
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self.excluidos = 0
        self.protegidos = 0
        self.erros = 0
        
    def iniciar(self):
        """Inicia Chrome"""
        logger.info("\n🗑️  ROB robô DE EXCLUSÃO UNICRED")
        logger.info("="*60)
        logger.info("⚠️  IDs PROTEGIDOS: 9 e 49")
        logger.info("="*60)
        
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 15)
        logger.info("\n✓ Navegador iniciado\n")
        
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
            
    def obter_id_registro(self):
        """Obtém o ID do registro no formulário"""
        try:
            if not self.iframe():
                return None
            
            texto = self.driver.find_element(By.TAG_NAME, "body").text
            import re
            match = re.search(r'Nro\.\s*Registro:\s*(\d+)', texto)
            return match.group(1) if match else None
        except:
            return None
            
    def clicar_editar(self):
        """Clica no primeiro botão de Editar"""
        try:
            if not self.iframe():
                return False
            
            botao = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, '//a[@title="Editar o Registro"]'))
            )
            botao.click()
            time.sleep(1)  # Reduzido de 2s para 1s
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao clicar Editar: {e}")
            return False
            
    def clicar_excluir(self):
        """Clica no botão Excluir (ID: sc_b_del_t)"""
        try:
            if not self.iframe():
                return False
            
            botao = self.wait.until(EC.element_to_be_clickable((By.ID, "sc_b_del_t")))
            botao.click()
            time.sleep(0.5)  # Reduzido de 1s para 0.5s
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao clicar Excluir: {e}")
            return False
            
    def confirmar_ok(self):
        """Clica no botão OK do dialog de confirmação"""
        try:
            if not self.iframe():
                return False
            
            # Aguarda o dialog aparecer e o botão OK ficar clicável
            botao_ok = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Ok')]"))
            )
            botao_ok.click()
            logger.info("  ✓ Confirmou exclusão")
            time.sleep(1)  # Reduzido de 2s para 1s
            return True
        except Exception as e:
            logger.error(f"  ✗ Erro ao confirmar: {e}")
            return False
            
    def contar_registros(self):
        """Conta quantos registros ainda existem"""
        try:
            if not self.iframe():
                return 0
            botoes = self.driver.find_elements(By.XPATH, '//a[@title="Editar o Registro"]')
            return len(botoes)
        except:
            return 0
            
    def clicar_voltar(self):
        """Clica no botão Voltar usando JavaScript (garante execução do onclick)"""
        try:
            if not self.iframe():
                return False
            
            # Usa JavaScript para garantir que o onclick seja executado
            script = """
            var botao = document.getElementById('sc_b_sai_t');
            if (botao) {
                botao.click();
                return true;
            }
            return false;
            """
            
            resultado = self.driver.execute_script(script)
            
            if resultado:
                logger.info("  ✓ Clicou em Voltar (via JS)")
                time.sleep(1.5)  # Reduzido de 2s para 1.5s
                return True
            else:
                logger.warning("  ⚠️  Botão Voltar não encontrado")
                return False
                
        except Exception as e:
            logger.error(f"  ✗ Erro ao voltar: {e}")
            return False
            
    def excluir_um_registro(self, tentativa):
        """Exclui UM registro (sempre o primeiro da lista)"""
        logger.info(f"\n[Exclusão {tentativa}]")
        
        try:
            # 1. Clica em Editar
            if not self.clicar_editar():
                self.erros += 1
                return False
            
            # 2. Obtém o ID do registro
            id_atual = self.obter_id_registro()
            logger.info(f"  → ID: {id_atual}")
            
            # 3. Verifica se é protegido
            if id_atual in ['9', '49']:
                logger.info(f"  ⚠️  PROTEGIDO - Pulando")
                self.protegidos += 1
                # Volta sem excluir (mais rápido)
                time.sleep(0.3)
                self.clicar_voltar()
                return False
            
            # 4. Clica em Excluir
            if not self.clicar_excluir():
                # Se falhou, tenta voltar
                self.clicar_voltar()
                self.erros += 1
                return False
            
            # 5. Confirma
            if not self.confirmar_ok():
                # Se falhou, tenta voltar
                self.clicar_voltar()
                self.erros += 1
                return False
            
            # 6. IMPORTANTE: SEMPRE volta para consulta
            # Após excluir, o sistema abre um NOVO formulário de inclusão
            # Precisamos clicar em Voltar para retornar à consulta
            logger.info("  → Voltando para consulta...")
            time.sleep(0.8)  # Reduzido de 1.5s para 0.8s
            
            # SEMPRE clica em Voltar (ID = sc_b_sai_t)
            if not self.clicar_voltar():
                logger.warning("  ⚠️  Não clicou em Voltar, tentando novamente...")
                time.sleep(0.5)  # Reduzido de 1s para 0.5s
                self.clicar_voltar()
            
            logger.info(f"  ✓ EXCLUÍDO! (ID: {id_atual})")
            self.excluidos += 1
            return True
            
        except Exception as e:
            logger.error(f"  ✗ ERRO: {e}")
            self.erros += 1
            # Tenta voltar mesmo em caso de erro
            try:
                self.clicar_voltar()
            except:
                pass
            return False
            
    def processar(self):
        """Processa todas as exclusões"""
        logger.info(f"\n{'='*60}")
        logger.info(f"INICIANDO EXCLUSÕES")
        logger.info(f"{'='*60}\n")
        
        tentativa = 1
        max_tentativas = 150
        
        while tentativa <= max_tentativas:
            # Conta registros restantes
            total = self.contar_registros()
            
            if total == 0:
                logger.info("\n✓ Nenhum registro para excluir!")
                break
            
            if total <= 2:
                logger.info(f"\n✓ Restam {total} registros (provavelmente IDs 9 e 49)")
                logger.info("✓ PROCESSO COMPLETO!")
                break
            
            logger.info(f"  → Restantes: {total}")
            
            # Exclui o próximo
            self.excluir_um_registro(tentativa)
            
            tentativa += 1
            time.sleep(0.5)  # Reduzido de 1s para 0.5s
            
    def fim(self):
        """Finaliza"""
        logger.info(f"\n{'='*60}")
        logger.info(f"RESUMO")
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
║         🗑️  ROBÔ DE EXCLUSÃO - UNICRED 🗑️                ║
║                                                            ║
║         Exclui TODOS exceto IDs 9 e 49                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    robo = RoboExclusaoUnicred()
    
    try:
        robo.iniciar()
        robo.driver.get("http://sistema.maclinea.com.br:4586/app/")
        
        input("""
╔════════════════════════════════════════════════════════════╗
║  ⚠️  ATENÇÃO: EXCLUSÃO EM MASSA!                          ║
║                                                            ║
║  1. LOGIN                                                  ║
║  2. Financeiro > Movimento Financeiro                     ║
║  3. Filtre: Conta = 1 - UNICREDI                          ║
║  4. PESQUISA                                              ║
║  5. ENTER para INICIAR                                    ║
║                                                            ║
║  ✓ IDs 9 e 49 serão PROTEGIDOS                            ║
╚════════════════════════════════════════════════════════════╝

ENTER para CONFIRMAR...
""")
        
        robo.processar()
        
    except KeyboardInterrupt:
        logger.warning(f"\n⚠ PAUSADO")
    except Exception as e:
        logger.error(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        robo.fim()


if __name__ == "__main__":
    main()

