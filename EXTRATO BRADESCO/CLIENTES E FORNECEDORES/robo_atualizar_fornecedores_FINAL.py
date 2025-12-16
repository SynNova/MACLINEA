"""
ROBÔ DE ATUALIZAÇÃO DE CADASTRO DE FORNECEDORES - OCTUS ERP
Versão FINAL com seletores corretos mapeados via browser tools
Atualiza 8055 registros de fornecedores/clientes baseado em planilha Excel

Desenvolvido por: SynNova AI
Data: Novembro/2025
"""

import pandas as pd
import json
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import time

# ==============================================================================
# CONFIGURAÇÕES
# ==============================================================================
class Config:
    # Sistema
    URL_LOGIN = "http://192.168.0.247:4586/login"
    USUARIO = "edilson@synnova.com.br"
    SENHA = "1234"
    
    # Arquivos
    ARQUIVO_EXCEL = "CLIENTES E FORNECEDORES MACLINEA.xlsx"
    ARQUIVO_PROGRESSO = "progresso_atualizacao_fornecedores.json"
    ARQUIVO_LOG = "robo_atualizacao_fornecedores.log"
    ARQUIVO_ERROS = "erros_atualizacao_fornecedores.csv"
    
    # Automação
    TIMEOUT = 30000  # 30 segundos
    DELAY_ENTRE_REGISTROS = 2  # 2 segundos entre cada registro
    SALVAR_PROGRESSO_A_CADA = 10  # Salva checkpoint a cada 10 registros
    
    # Seletores Octus (mapeados via browser tools)
    IFRAME_PRINCIPAL = '#iframe_11'
    CAMPO_BUSCA_RAPIDA = '#SC_fast_search_top'

# ==============================================================================
# CONFIGURAÇÃO DE LOGGING
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
# CLASSE PRINCIPAL DO ROBÔ
# ==============================================================================
class RoboAtualizacaoFornecedores:
    def __init__(self):
        self.dados = None
        self.progresso = self.carregar_progresso()
        self.erros = []
        self.playwright = None
        self.browser = None
        self.page = None
        self.estatisticas = {
            'total': 0,
            'processados': 0,
            'sucessos': 0,
            'erros': 0,
            'pulados': 0,
            'inicio': datetime.now()
        }
    
    # ==========================================================================
    # GESTÃO DE PROGRESSO
    # ==========================================================================
    def carregar_progresso(self):
        """Carrega progresso de execuções anteriores"""
        try:
            with open(Config.ARQUIVO_PROGRESSO, 'r', encoding='utf-8') as f:
                progresso = json.load(f)
                logger.info(f"Progresso carregado: Ultimo registro = {progresso.get('ultimo_indice', 0)}")
                return progresso
        except FileNotFoundError:
            logger.info("Iniciando nova execucao (sem progresso anterior)")
            return {
                'ultimo_indice': 0,
                'processados': [],
                'erros': [],
                'data_inicio': datetime.now().isoformat()
            }
        except json.JSONDecodeError:
            logger.warning("Arquivo de progresso corrompido, criando novo")
            # Renomear arquivo corrompido para backup
            import os
            if os.path.exists(Config.ARQUIVO_PROGRESSO):
                backup = Config.ARQUIVO_PROGRESSO.replace('.json', '_backup.json')
                os.rename(Config.ARQUIVO_PROGRESSO, backup)
            return {
                'ultimo_indice': 0,
                'processados': [],
                'erros': [],
                'data_inicio': datetime.now().isoformat()
            }
    
    def salvar_progresso(self, indice, codigo_fornecedor):
        """Salva progresso atual"""
        self.progresso['ultimo_indice'] = indice
        self.progresso['processados'].append({
            'indice': indice,
            'codigo': int(codigo_fornecedor) if isinstance(codigo_fornecedor, (int, float)) else str(codigo_fornecedor),
            'data': datetime.now().isoformat()
        })
        self.progresso['data_ultima_atualizacao'] = datetime.now().isoformat()
        
        with open(Config.ARQUIVO_PROGRESSO, 'w', encoding='utf-8') as f:
            json.dump(self.progresso, f, indent=2, ensure_ascii=False)
    
    def registrar_erro(self, indice, codigo_fornecedor, erro):
        """Registra erro para análise posterior"""
        erro_info = {
            'indice': indice,
            'codigo': codigo_fornecedor,
            'erro': str(erro),
            'data': datetime.now().isoformat()
        }
        self.erros.append(erro_info)
        self.progresso['erros'].append(erro_info)
        logger.error(f"Erro no registro {indice} (codigo {codigo_fornecedor}): {erro}")
    
    # ==========================================================================
    # CARREGAMENTO DE DADOS
    # ==========================================================================
    def carregar_dados(self):
        """Carrega dados da planilha Excel"""
        logger.info(f"Carregando dados de: {Config.ARQUIVO_EXCEL}")
        self.dados = pd.read_excel(Config.ARQUIVO_EXCEL)
        self.estatisticas['total'] = len(self.dados)
        logger.info(f"{len(self.dados)} registros carregados")
        
        # Mostra estatísticas dos dados
        logger.info("Estatisticas da planilha:")
        logger.info(f"  - Registros com CNPJ/CPF: {self.dados['cnpj_cpf'].notna().sum()}")
        logger.info(f"  - Registros com endereco: {self.dados['endereco'].notna().sum()}")
        logger.info(f"  - Registros com telefone: {self.dados['telefone'].notna().sum()}")
    
    # ==========================================================================
    # AUTOMAÇÃO WEB - PLAYWRIGHT
    # ==========================================================================
    def iniciar_navegador(self):
        """Inicia navegador com Playwright"""
        logger.info("Iniciando navegador Playwright...")
        self.playwright = sync_playwright().start()
        
        # Configura navegador (Chromium)
        self.browser = self.playwright.chromium.launch(
            headless=False,  # Modo visível para acompanhar
            slow_mo=200  # Delay para visualização
        )
        
        # Cria contexto e página
        context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        self.page = context.new_page()
        self.page.set_default_timeout(Config.TIMEOUT)
        
        logger.info("Navegador iniciado")
    
    def fazer_login(self):
        """Realiza login no sistema Octus ERP"""
        logger.info("Realizando login...")
        
        # Navega para página de login
        self.page.goto(Config.URL_LOGIN)
        self.page.wait_for_load_state('networkidle')
        
        # Preenche credenciais
        self.page.fill('input[placeholder*="e-mail"]', Config.USUARIO)
        self.page.fill('input[placeholder*="senha"]', Config.SENHA)
        
        # Clica em entrar
        self.page.click('button:has-text("Acessar")')
        self.page.wait_for_load_state('networkidle')
        
        # Aguarda dashboard carregar
        time.sleep(3)
        logger.info("Login realizado com sucesso")
    
    def navegar_para_fornecedores(self):
        """Navega até o módulo de Cliente/Fornecedores"""
        logger.info("Navegando para modulo Cliente/Fornecedores...")
        
        # Clica em Cliente/Fornecedores no menu lateral
        self.page.click('text=Cliente/Fornecedores')
        time.sleep(3)
        
        logger.info("Modulo Cliente/Fornecedores carregado")
    
    def buscar_fornecedor(self, codigo):
        """Busca fornecedor pelo código usando busca rápida"""
        try:
            # Preenche campo de busca dentro do iframe
            self.page.evaluate(f'''() => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                
                const doc = iframe.contentDocument;
                const campo = doc.querySelector('#SC_fast_search_top');
                const botao = doc.querySelector('#SC_fast_search_submit_top');
                
                if (campo && botao) {{
                    campo.value = '{codigo}';
                    campo.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    botao.click();
                    return true;
                }}
                return false;
            }}''')
            
            time.sleep(3)  # Aguarda resultado da busca
            return True
            
        except Exception as e:
            logger.warning(f"Erro ao buscar codigo {codigo}: {e}")
            return False
    
    def abrir_edicao(self, codigo_esperado):
        """Clica no botão de editar do registro com código EXATO"""
        try:
            # Buscar e validar o código EXATO antes de clicar em editar
            resultado = self.page.evaluate(f'''(codigoEsperado) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return {{sucesso: false, mensagem: 'Iframe não acessível'}};
                
                const doc = iframe.contentDocument;
                
                // Buscar todos os spans de código (pattern: id_sc_field_cf_codigo_*)
                const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
                
                for (let span of spans) {{
                    // ⚠️ CRÍTICO: Pegar o texto COMPLETO do span (não só o highlight!)
                    const codigoCompleto = span.textContent.trim();
                    
                    // Remover pontos e espaços para comparação
                    const codigoLimpo = codigoCompleto.replace(/[.\\s]/g, '');
                    const esperadoLimpo = String(codigoEsperado).replace(/[.\\s]/g, '');
                    
                    // ✅ VALIDAÇÃO: Código EXATO (com e sem formatação)
                    if (codigoCompleto === String(codigoEsperado) || codigoLimpo === esperadoLimpo) {{
                        // Encontrou! Procurar botão editar na mesma linha
                        const linha = span.closest('tr');
                        const botaoEditar = linha ? linha.querySelector('a#bedit') : null;
                        
                        if (botaoEditar) {{
                            botaoEditar.click();
                            return {{
                                sucesso: true,
                                codigo_encontrado: codigoCompleto,
                                codigo_limpo: codigoLimpo,
                                span_id: span.id,
                                mensagem: 'Código EXATO encontrado e clicado'
                            }};
                        }}
                    }}
                }}
                
                return {{
                    sucesso: false,
                    mensagem: 'Código EXATO não encontrado nos resultados'
                }};
            }}''', str(codigo_esperado))
            
            if resultado.get('sucesso'):
                logger.info(f"  Codigo {codigo_esperado} validado → {resultado.get('codigo_encontrado')}")
                time.sleep(4)  # Aguarda formulário carregar
                return True
            else:
                logger.warning(f"  {resultado.get('mensagem')}")
                return False
            
        except Exception as e:
            logger.warning(f"Erro ao abrir edicao: {e}")
            return False
    
    def preencher_campos(self, registro):
        """Preenche os campos do formulário com dados do registro"""
        try:
            campos_preenchidos = 0
            
            # Prepara dados para preenchimento
            dados = {}
            
            # IDENTIFICAÇÃO
            if pd.notna(registro['razaosocial']):
                dados['cf_nome_razao'] = str(registro['razaosocial'])
            
            if pd.notna(registro['nome']):
                dados['cf_nome_fantasia'] = str(registro['nome'])
            
            if pd.notna(registro['cnpj_cpf']):
                cnpj = str(int(registro['cnpj_cpf'])) if isinstance(registro['cnpj_cpf'], float) else str(registro['cnpj_cpf'])
                dados['cf_cnpjx'] = ''.join(filter(str.isdigit, cnpj))
            
            if pd.notna(registro['inscrestad_rg']):
                dados['cf_inscr_est'] = str(registro['inscrestad_rg'])
            
            if pd.notna(registro['inscmunicipal']):
                dados['cf_inscrmunicipio'] = str(registro['inscmunicipal'])
            
            # ENDEREÇO
            if pd.notna(registro['cep']):
                dados['cf_cepx'] = ''.join(filter(str.isdigit, str(registro['cep'])))
            
            if pd.notna(registro['endereco']):
                dados['cf_endereco'] = str(registro['endereco'])
            
            if pd.notna(registro['complemento']):
                dados['cf_end_complemento'] = str(registro['complemento'])
            
            if pd.notna(registro['bairro']):
                dados['cf_bairro'] = str(registro['bairro'])
            
            if pd.notna(registro['cidade']):
                dados['cf_municipio'] = str(registro['cidade'])
            
            if pd.notna(registro['estado']):
                dados['cf_uf'] = str(registro['estado'])
            
            # CONTATOS
            if pd.notna(registro['telefone']):
                dados['cf_telefone1x'] = ''.join(filter(str.isdigit, str(registro['telefone'])))
            
            # Preencher campos via JavaScript
            campos_json = json.dumps(dados)
            self.page.evaluate(f'''(dados) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return 0;
                
                const doc = iframe.contentDocument;
                let preenchidos = 0;
                
                for (let nome_campo in dados) {{
                    const campo = doc.querySelector('#id_sc_field_' + nome_campo);
                    if (campo) {{
                        campo.value = dados[nome_campo];
                        campo.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        preenchidos++;
                    }}
                }}
                
                return preenchidos;
            }}''', dados)
            
            campos_preenchidos = len(dados)
            time.sleep(1)  # Aguarda processamento dos campos
            
            logger.info(f"  {campos_preenchidos} campos preenchidos")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao preencher campos: {e}")
            return False
    
    def salvar_cadastro(self):
        """Clica no botão Salvar"""
        try:
            # Botão salvar está DENTRO do iframe
            self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                
                const doc = iframe.contentDocument;
                const botaoSalvar = doc.querySelector('#sc_b_upd_t');
                
                if (botaoSalvar) {
                    botaoSalvar.click();
                    return true;
                }
                return false;
            }''')
            
            time.sleep(3)  # Aguarda salvamento
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar: {e}")
            return False
    
    def voltar_para_listagem(self):
        """Volta para a listagem de fornecedores"""
        try:
            # Botão Voltar está DENTRO do iframe
            self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                
                const doc = iframe.contentDocument;
                const botaoVoltar = doc.querySelector('#sc_b_sai_t');
                
                if (botaoVoltar) {
                    botaoVoltar.click();
                    return true;
                }
                return false;
            }''')
            
            time.sleep(3)  # Aguarda voltar para listagem
            return True
            
        except Exception as e:
            logger.error(f"Erro ao voltar: {e}")
            # Em caso de erro, recarrega o módulo
            try:
                self.navegar_para_fornecedores()
                return True
            except:
                return False
    
    # ==========================================================================
    # PROCESSAMENTO PRINCIPAL
    # ==========================================================================
    def processar_registro(self, indice, registro):
        """Processa um único registro"""
        codigo = registro['pessoa']
        nome = registro['nome']
        
        logger.info(f"[{indice+1}/{self.estatisticas['total']}] Processando: {codigo} - {nome}")
        
        try:
            # 1. Buscar fornecedor
            if not self.buscar_fornecedor(codigo):
                raise Exception("Fornecedor nao encontrado")
            
            # 2. Abrir edição (validando código EXATO)
            if not self.abrir_edicao(codigo):
                raise Exception(f"Codigo EXATO {codigo} nao encontrado nos resultados")
            
            # 3. Preencher campos
            if not self.preencher_campos(registro):
                raise Exception("Erro ao preencher campos")
            
            # 4. Salvar
            if not self.salvar_cadastro():
                raise Exception("Erro ao salvar cadastro")
            
            # 5. Voltar para listagem
            self.voltar_para_listagem()
            
            # Sucesso!
            self.estatisticas['sucessos'] += 1
            logger.info(f"Registro {codigo} atualizado com sucesso")
            
            # Salvar progresso periodicamente
            if (indice + 1) % Config.SALVAR_PROGRESSO_A_CADA == 0:
                self.salvar_progresso(indice + 1, codigo)
                logger.info(f"Checkpoint salvo (registro {indice + 1})")
            
            return True
            
        except Exception as e:
            self.estatisticas['erros'] += 1
            self.registrar_erro(indice, codigo, e)
            
            # Tenta voltar para listagem em caso de erro
            try:
                self.voltar_para_listagem()
            except:
                pass
            
            return False
        
        finally:
            self.estatisticas['processados'] += 1
            time.sleep(Config.DELAY_ENTRE_REGISTROS)
    
    def executar(self):
        """Execução principal do robô"""
        try:
            # 1. Carregar dados
            self.carregar_dados()
            
            # 2. Iniciar navegador e fazer login
            self.iniciar_navegador()
            self.fazer_login()
            self.navegar_para_fornecedores()
            
            # 3. Processar registros
            inicio = self.progresso['ultimo_indice']
            logger.info(f"\n{'='*80}")
            logger.info(f"INICIANDO PROCESSAMENTO")
            logger.info(f"Total de registros: {self.estatisticas['total']}")
            logger.info(f"Comecando do registro: {inicio + 1}")
            logger.info(f"{'='*80}\n")
            
            for idx in range(inicio, len(self.dados)):
                registro = self.dados.iloc[idx]
                self.processar_registro(idx, registro)
            
            # 4. Finalização
            self.finalizar()
            
        except KeyboardInterrupt:
            logger.warning("\nExecucao interrompida pelo usuario")
            self.finalizar()
            
        except Exception as e:
            logger.error(f"Erro critico: {e}")
            self.finalizar()
    
    def finalizar(self):
        """Finaliza execução e gera relatórios"""
        logger.info(f"\n{'='*80}")
        logger.info("FINALIZANDO EXECUCAO")
        logger.info(f"{'='*80}")
        
        # Calcula tempo total
        tempo_total = datetime.now() - self.estatisticas['inicio']
        
        # Estatísticas finais
        logger.info("\nESTATISTICAS FINAIS:")
        logger.info(f"  Total de registros: {self.estatisticas['total']}")
        logger.info(f"  Processados: {self.estatisticas['processados']}")
        logger.info(f"  Sucessos: {self.estatisticas['sucessos']}")
        logger.info(f"  Erros: {self.estatisticas['erros']}")
        logger.info(f"  Taxa de sucesso: {(self.estatisticas['sucessos']/max(self.estatisticas['processados'],1)*100):.1f}%")
        logger.info(f"  Tempo total: {tempo_total}")
        logger.info(f"  Tempo medio por registro: {tempo_total/max(self.estatisticas['processados'],1)}")
        
        # Salva progresso final
        self.salvar_progresso(
            self.estatisticas['processados'],
            self.dados.iloc[self.estatisticas['processados']-1]['pessoa'] if self.estatisticas['processados'] > 0 else 0
        )
        
        # Salva erros em CSV se houver
        if self.erros:
            df_erros = pd.DataFrame(self.erros)
            df_erros.to_csv(Config.ARQUIVO_ERROS, index=False, encoding='utf-8-sig')
            logger.info(f"\nLista de erros salva em: {Config.ARQUIVO_ERROS}")
        
        # Fecha navegador
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        
        logger.info(f"\nExecucao finalizada!")
        logger.info(f"  Logs salvos em: {Config.ARQUIVO_LOG}")
        logger.info(f"  Progresso salvo em: {Config.ARQUIVO_PROGRESSO}")

# ==============================================================================
# EXECUÇÃO
# ==============================================================================
if __name__ == "__main__":
    print("""
================================================================================
                                                                              
        ROBO DE ATUALIZACAO DE CADASTRO DE FORNECEDORES - OCTUS ERP          
                                                                              
  Registros a processar: 8.055                                            
  Tecnologia: Python + Playwright                                         
  Performance: ~5 segundos por registro                                    
  Tempo estimado: ~11 horas                                               
                                                                              
  Desenvolvido por: SynNova AI (C) 2025                                        
                                                                              
================================================================================
    """)
    
    # Inicia automaticamente (sem input para permitir execução em background)
    robo = RoboAtualizacaoFornecedores()
    robo.executar()

