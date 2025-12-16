"""
ROBÔ DE ATUALIZAÇÃO V2 - NAVEGAÇÃO PÁGINA POR PÁGINA
Estratégia: Ordenar por código + navegar página por página
Desenvolvido por: SynNova AI
Data: Novembro/2025
"""

import pandas as pd
import json
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright
import time

# ==============================================================================
# CONFIGURAÇÕES
# ==============================================================================
class Config:
    URL_LOGIN = "http://192.168.0.247:4586/login"
    USUARIO = "edilson@synnova.com.br"
    SENHA = "1234"
    
    ARQUIVO_EXCEL = "CLIENTES E FORNECEDORES MACLINEA.xlsx"
    ARQUIVO_PROGRESSO = "progresso_v2.json"
    ARQUIVO_LOG = "robo_v2.log"
    ARQUIVO_ERROS = "erros_v2.csv"
    
    TIMEOUT = 30000
    DELAY_ENTRE_REGISTROS = 1
    REGISTROS_POR_PAGINA = 50  # Octus mostra 50 por página
    SALVAR_PROGRESSO_A_CADA = 10

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
# ROBÔ V2 - NAVEGAÇÃO SEQUENCIAL
# ==============================================================================
class RoboFornecedoresV2:
    def __init__(self):
        self.dados = None
        self.progresso = self.carregar_progresso()
        self.erros = []
        self.page = None
        self.estatisticas = {
            'total': 0,
            'processados': 0,
            'sucessos': 0,
            'erros': 0,
            'nao_encontrados': 0,
            'inicio': datetime.now()
        }
    
    def carregar_progresso(self):
        """Carrega progresso"""
        try:
            with open(Config.ARQUIVO_PROGRESSO, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {
                'ultimo_indice': 0,
                'pagina_atual': 1,
                'processados': [],
                'erros': []
            }
    
    def salvar_progresso(self, indice, codigo):
        """Salva progresso"""
        self.progresso['ultimo_indice'] = indice
        self.progresso['processados'].append({
            'indice': indice,
            'codigo': int(codigo) if isinstance(codigo, (int, float)) else codigo,
            'data': datetime.now().isoformat()
        })
        
        with open(Config.ARQUIVO_PROGRESSO, 'w', encoding='utf-8') as f:
            json.dump(self.progresso, f, indent=2, ensure_ascii=False)
    
    def carregar_dados(self):
        """Carrega planilha"""
        logger.info("Carregando planilha...")
        self.dados = pd.read_excel(Config.ARQUIVO_EXCEL)
        self.estatisticas['total'] = len(self.dados)
        logger.info(f"{len(self.dados)} registros carregados")
    
    def iniciar_navegador(self):
        """Inicia Playwright"""
        logger.info("Iniciando navegador...")
        self.playwright = sync_playwright().start()
        browser = self.playwright.chromium.launch(headless=False, slow_mo=150)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        self.page = context.new_page()
        self.page.set_default_timeout(Config.TIMEOUT)
        logger.info("Navegador iniciado")
    
    def fazer_login(self):
        """Login no Octus"""
        logger.info("Fazendo login...")
        self.page.goto(Config.URL_LOGIN)
        self.page.fill('input[placeholder*="e-mail"]', Config.USUARIO)
        self.page.fill('input[placeholder*="senha"]', Config.SENHA)
        self.page.click('button:has-text("Acessar")')
        time.sleep(3)
        logger.info("Login OK")
    
    def navegar_para_fornecedores(self):
        """Abre módulo Cliente/Fornecedores"""
        logger.info("Abrindo Cliente/Fornecedores...")
        self.page.click('text=Cliente/Fornecedores')
        time.sleep(3)
        logger.info("Modulo carregado")
    
    def ordenar_por_codigo(self):
        """Ordena listagem por código (ordem crescente - 1 a infinito)"""
        logger.info("Ordenando por codigo (2 cliques para crescente)...")
        
        # 1º clique (decrescente)
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const links = doc.querySelectorAll('a');
            
            for (let link of links) {
                if (link.textContent.trim() === 'Código') {
                    link.click();
                    break;
                }
            }
        }''')
        time.sleep(2)
        
        # 2º clique (crescente)
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const links = doc.querySelectorAll('a');
            
            for (let link of links) {
                if (link.textContent.trim() === 'Código') {
                    link.click();
                    break;
                }
            }
        }''')
        time.sleep(3)
        logger.info("Ordenacao crescente aplicada (1 → infinito)")
    
    def buscar_codigo_na_pagina(self, codigo_esperado):
        """Busca código EXATO na página atual"""
        resultado = self.page.evaluate(f'''(codigoEsperado) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return {{encontrado: false}};
            
            const doc = iframe.contentDocument;
            const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
            
            for (let span of spans) {{
                const codigoCompleto = span.textContent.trim();
                const codigoLimpo = codigoCompleto.replace(/[.\\s]/g, '');
                const esperadoLimpo = String(codigoEsperado).replace(/[.\\s]/g, '');
                
                // Validação EXATA
                if (codigoCompleto === String(codigoEsperado) || codigoLimpo === esperadoLimpo) {{
                    const linha = span.closest('tr');
                    const botaoEditar = linha ? linha.querySelector('a#bedit') : null;
                    
                    if (botaoEditar) {{
                        botaoEditar.click();
                        return {{
                            encontrado: true,
                            codigo: codigoCompleto,
                            span_id: span.id
                        }};
                    }}
                }}
            }}
            
            return {{encontrado: false}};
        }}''', str(codigo_esperado))
        
        return resultado.get('encontrado', False), resultado
    
    def proxima_pagina(self):
        """Avança para próxima página"""
        try:
            self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return;
                
                const doc = iframe.contentDocument;
                // Procurar botão "Avançar" ou similar
                const botaoProximo = doc.querySelector('generic[title*="Avançar"]') ||
                                    doc.querySelectorAll('a')[1];  // Link "2", "3", etc
                
                if (botaoProximo) {
                    botaoProximo.click();
                }
            }''')
            
            time.sleep(3)
            return True
        except:
            return False
    
    def preencher_campos(self, registro):
        """Preenche formulário"""
        dados = {}
        
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
        if pd.notna(registro['telefone']):
            dados['cf_telefone1x'] = ''.join(filter(str.isdigit, str(registro['telefone'])))
        if pd.notna(registro['email']):
            dados['cf_email'] = str(registro['email'])
        
        # Preencher com TODOS os eventos necessários
        campos_json = json.dumps(dados)
        self.page.evaluate(f'''(dados) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return 0;
            
            const doc = iframe.contentDocument;
            let preenchidos = 0;
            
            for (let campo in dados) {{
                const input = doc.querySelector('#id_sc_field_' + campo);
                if (input && !input.disabled) {{
                    input.value = dados[campo];
                    
                    // Disparar TODOS os eventos (importante para Octus)
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                    
                    preenchidos++;
                }}
            }}
            
            return preenchidos;
        }}''', dados)
        
        time.sleep(1)
        logger.info(f"  {len(dados)} campos preenchidos")
        return True
    
    def salvar_cadastro(self):
        """Clica em Salvar"""
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const botao = doc.querySelector('#sc_b_upd_t');
            if (botao) botao.click();
        }''')
        time.sleep(3)
        return True
    
    def voltar_listagem(self):
        """Volta para listagem (tratando modal de confirmação)"""
        # 1. Clicar em Voltar
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const botao = doc.querySelector('#sc_b_sai_t');
            if (botao) botao.click();
        }''')
        time.sleep(1)
        
        # 2. Clicar em OK no modal SweetAlert (se aparecer)
        try:
            # Modal pode estar dentro ou fora do iframe
            self.page.evaluate('''() => {
                // Tentar fora do iframe primeiro
                let botaoOk = document.querySelector('button.swal2-confirm') ||
                             document.querySelector('button.scButton_sweetalertok') ||
                             document.querySelector('button:has-text("Ok")');
                
                if (botaoOk && botaoOk.offsetParent !== null) {
                    botaoOk.click();
                    return;
                }
                
                // Tentar dentro do iframe
                const iframe = document.querySelector('#iframe_11');
                if (iframe && iframe.contentDocument) {
                    const doc = iframe.contentDocument;
                    botaoOk = doc.querySelector('button.swal2-confirm') ||
                             doc.querySelector('button.scButton_sweetalertok');
                    
                    if (botaoOk && botaoOk.offsetParent !== null) {
                        botaoOk.click();
                    }
                }
            }''')
            time.sleep(2)
        except:
            pass  # Modal pode não aparecer se não houver alterações
    
    def processar_registro(self, indice, registro):
        """Processa um registro"""
        codigo = registro['pessoa']
        nome = registro['nome']
        
        logger.info(f"[{indice+1}/{self.estatisticas['total']}] Processando: {codigo} - {nome}")
        
        try:
            # Buscar código na página atual
            encontrado, info = self.buscar_codigo_na_pagina(codigo)
            
            # Se não encontrou, tentar próximas páginas (máximo 5 tentativas)
            paginas_tentadas = 0
            while not encontrado and paginas_tentadas < 5:
                logger.info(f"  Codigo {codigo} nao encontrado, tentando proxima pagina...")
                self.proxima_pagina()
                encontrado, info = self.buscar_codigo_na_pagina(codigo)
                paginas_tentadas += 1
            
            if not encontrado:
                raise Exception(f"Codigo {codigo} nao encontrado apos {paginas_tentadas} paginas")
            
            logger.info(f"  Codigo {codigo} encontrado: {info.get('codigo')}")
            
            # Preencher, salvar e voltar
            self.preencher_campos(registro)
            self.salvar_cadastro()
            self.voltar_listagem()
            
            self.estatisticas['sucessos'] += 1
            logger.info(f"  Registro {codigo} atualizado com sucesso")
            
            if (indice + 1) % Config.SALVAR_PROGRESSO_A_CADA == 0:
                self.salvar_progresso(indice + 1, codigo)
            
            return True
            
        except Exception as e:
            self.estatisticas['erros'] += 1
            logger.error(f"  Erro: {e}")
            self.erros.append({'indice': indice, 'codigo': codigo, 'erro': str(e)})
            
            # Voltar para listagem
            try:
                self.voltar_listagem()
            except:
                self.navegar_para_fornecedores()
                self.ordenar_por_codigo()
            
            return False
        
        finally:
            self.estatisticas['processados'] += 1
            time.sleep(Config.DELAY_ENTRE_REGISTROS)
    
    def executar(self):
        """Execução principal"""
        try:
            self.carregar_dados()
            self.iniciar_navegador()
            self.fazer_login()
            self.navegar_para_fornecedores()
            self.ordenar_por_codigo()  # ✅ ORDENAR LOGO NO INÍCIO
            
            logger.info(f"\n{'='*80}")
            logger.info("INICIANDO PROCESSAMENTO V2 (PAGINACAO)")
            logger.info(f"Total: {self.estatisticas['total']}")
            logger.info(f"{'='*80}\n")
            
            inicio = self.progresso['ultimo_indice']
            for idx in range(inicio, len(self.dados)):
                self.processar_registro(idx, self.dados.iloc[idx])
            
            self.finalizar()
            
        except KeyboardInterrupt:
            logger.warning("\nInterrompido pelo usuario")
            self.finalizar()
        except Exception as e:
            logger.error(f"Erro critico: {e}")
            self.finalizar()
    
    def finalizar(self):
        """Finalização"""
        logger.info(f"\n{'='*80}")
        logger.info("FINALIZANDO")
        logger.info(f"{'='*80}")
        
        tempo_total = datetime.now() - self.estatisticas['inicio']
        
        logger.info(f"\nESTATISTICAS:")
        logger.info(f"  Total: {self.estatisticas['total']}")
        logger.info(f"  Processados: {self.estatisticas['processados']}")
        logger.info(f"  Sucessos: {self.estatisticas['sucessos']}")
        logger.info(f"  Erros: {self.estatisticas['erros']}")
        logger.info(f"  Taxa sucesso: {(self.estatisticas['sucessos']/max(self.estatisticas['processados'],1)*100):.1f}%")
        logger.info(f"  Tempo total: {tempo_total}")
        
        if self.erros:
            df_erros = pd.DataFrame(self.erros)
            df_erros.to_csv(Config.ARQUIVO_ERROS, index=False, encoding='utf-8-sig')
        
        self.salvar_progresso(self.estatisticas['processados'], 0)
        logger.info("\nFinalizado!")

if __name__ == "__main__":
    print("="*80)
    print("  ROBO V2 - NAVEGACAO PAGINA POR PAGINA")
    print("  Estrategia: Ordenar + navegar sequencialmente")
    print("="*80)
    
    robo = RoboFornecedoresV2()
    robo.executar()

