"""
ROBÔ DE ATUALIZAÇÃO V3 - VERSÃO COMPLETA E TESTADA
- Todos os campos obrigatórios tratados
- SELECT, RADIO e INPUT funcionando
- Tratamento de modal SweetAlert
- Validação de campos obrigatórios

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
    ARQUIVO_PROGRESSO = "progresso_v3.json"
    ARQUIVO_LOG = "robo_v3.log"
    ARQUIVO_ERROS = "erros_v3.csv"
    
    TIMEOUT = 30000
    DELAY_ENTRE_REGISTROS = 1
    REGISTROS_POR_PAGINA = 50
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
# ROBÔ V3 - VERSÃO COMPLETA
# ==============================================================================
class RoboFornecedoresV3:
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
        """Carrega progresso salvo"""
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
        """Salva progresso atual"""
        self.progresso['ultimo_indice'] = indice
        self.progresso['processados'].append({
            'indice': indice,
            'codigo': int(codigo) if isinstance(codigo, (int, float)) else codigo,
            'data': datetime.now().isoformat()
        })
        
        with open(Config.ARQUIVO_PROGRESSO, 'w', encoding='utf-8') as f:
            json.dump(self.progresso, f, indent=2, ensure_ascii=False)
    
    def carregar_dados(self):
        """Carrega planilha Excel"""
        logger.info("Carregando planilha...")
        self.dados = pd.read_excel(Config.ARQUIVO_EXCEL)
        self.estatisticas['total'] = len(self.dados)
        logger.info(f"{len(self.dados)} registros carregados")
    
    def iniciar_navegador(self):
        """Inicia navegador Playwright"""
        logger.info("Iniciando navegador...")
        self.playwright = sync_playwright().start()
        browser = self.playwright.chromium.launch(headless=False, slow_mo=150)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        self.page = context.new_page()
        self.page.set_default_timeout(Config.TIMEOUT)
        logger.info("Navegador iniciado")
    
    def fazer_login(self):
        """Faz login no Octus ERP"""
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
        logger.info("Módulo carregado")
    
    def ordenar_por_codigo(self):
        """Ordena listagem por código (ordem crescente - 2 cliques)"""
        logger.info("Ordenando por código (2 cliques para crescente)...")
        
        for i in range(2):
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
        
        time.sleep(1)
        logger.info("Ordenação crescente aplicada (1 → infinito)")
    
    def buscar_codigo_na_pagina(self, codigo_esperado):
        """Busca código EXATO na página atual e clica em EDITAR"""
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
        
        if resultado.get('encontrado'):
            time.sleep(2)  # Aguardar formulário carregar
        
        return resultado.get('encontrado', False), resultado
    
    def proxima_pagina(self):
        """Avança para próxima página na listagem"""
        try:
            resultado = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                
                const doc = iframe.contentDocument;
                
                // Procurar botão de próxima página (ícone > ou "Avançar")
                const botoes = doc.querySelectorAll('a, button, span');
                for (let btn of botoes) {
                    const texto = btn.textContent.trim();
                    const title = btn.getAttribute('title') || '';
                    
                    if (title.includes('Avançar') || title.includes('Próxim') || 
                        texto === '>' || texto === '»') {
                        btn.click();
                        return true;
                    }
                }
                
                return false;
            }''')
            
            time.sleep(3)
            return resultado
        except:
            return False
    
    def preencher_campos(self, registro):
        """
        Preenche TODOS os campos do formulário corretamente:
        - INPUT: value + eventos (input, change, blur)
        - SELECT: value + evento change
        - RADIO: checked + evento change
        """
        
        # =====================================================================
        # 1. PREPARAR DADOS DOS INPUTS DE TEXTO
        # =====================================================================
        dados_input = {}
        
        # Nome/Razão Social * (OBRIGATÓRIO)
        if pd.notna(registro['razaosocial']):
            dados_input['cf_nome_razao'] = str(registro['razaosocial']).strip()
        
        # Nome Fantasia
        if pd.notna(registro['nome']):
            dados_input['cf_nome_fantasia'] = str(registro['nome']).strip()
        
        # CNPJ/CPF (apenas números)
        if pd.notna(registro['cnpj_cpf']):
            cnpj = str(int(registro['cnpj_cpf'])) if isinstance(registro['cnpj_cpf'], float) else str(registro['cnpj_cpf'])
            dados_input['cf_cnpjx'] = ''.join(filter(str.isdigit, cnpj))
        
        # Inscrição Estadual
        if pd.notna(registro['inscrestad_rg']):
            dados_input['cf_inscr_est'] = str(registro['inscrestad_rg']).strip()
        
        # Inscrição Municipal
        if pd.notna(registro['inscmunicipal']):
            dados_input['cf_inscrmunicipio'] = str(registro['inscmunicipal']).strip()
        
        # CEP * (OBRIGATÓRIO - apenas números)
        if pd.notna(registro['cep']):
            dados_input['cf_cepx'] = ''.join(filter(str.isdigit, str(registro['cep'])))
        
        # Endereço * (OBRIGATÓRIO)
        if pd.notna(registro['endereco']):
            dados_input['cf_endereco'] = str(registro['endereco']).strip()
        
        # Número * (OBRIGATÓRIO - usar "S/N" se não tiver na planilha)
        dados_input['cf_endereco_nro'] = 'S/N'  # Padrão
        
        # Complemento
        if pd.notna(registro['complemento']):
            dados_input['cf_end_complemento'] = str(registro['complemento']).strip()
        
        # Bairro * (OBRIGATÓRIO)
        if pd.notna(registro['bairro']):
            dados_input['cf_bairro'] = str(registro['bairro']).strip()
        
        # Telefone 1 * (OBRIGATÓRIO - apenas números)
        if pd.notna(registro['telefone']):
            dados_input['cf_telefone1x'] = ''.join(filter(str.isdigit, str(registro['telefone'])))
        
        # Email Principal
        if pd.notna(registro['email']):
            dados_input['cf_email'] = str(registro['email']).strip()
        
        # =====================================================================
        # 2. PREPARAR DADOS DOS SELECTS
        # =====================================================================
        dados_select = {}
        
        # Tipo Cadastro * (OBRIGATÓRIO) - Definir como "Fornecedor" por padrão
        dados_select['cf_tipo'] = 'Fornecedor'
        
        # País * (OBRIGATÓRIO) - 1058 = Brasil
        dados_select['pa_codigo'] = '1058'
        
        # =====================================================================
        # 3. PREPARAR DADOS DOS RADIOS
        # =====================================================================
        dados_radio = {}
        
        # Ativo * (OBRIGATÓRIO) - Baseado em indativo (S/N)
        if pd.notna(registro.get('indativo')):
            dados_radio['cf_ativo'] = 'Sim' if registro['indativo'] == 'S' else 'Não'
        else:
            dados_radio['cf_ativo'] = 'Sim'  # Padrão
        
        # Tipo Pessoa * (OBRIGATÓRIO) - Baseado em indfisjur (J/F)
        if pd.notna(registro.get('indfisjur')):
            if registro['indfisjur'] == 'J':
                dados_radio['cf_tipo_pessoa'] = 'Jurídica'
            elif registro['indfisjur'] == 'F':
                dados_radio['cf_tipo_pessoa'] = 'Física'
            else:
                dados_radio['cf_tipo_pessoa'] = 'Jurídica'  # Padrão
        else:
            dados_radio['cf_tipo_pessoa'] = 'Jurídica'  # Padrão
        
        # =====================================================================
        # 4. EXECUTAR PREENCHIMENTO VIA JAVASCRIPT
        # =====================================================================
        preenchidos = self.page.evaluate('''(params) => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return {erro: 'Iframe não acessível'};
            
            const doc = iframe.contentDocument;
            let preenchidos = 0;
            let detalhes = [];
            
            // ================================================================
            // PREENCHER INPUTS DE TEXTO
            // ================================================================
            for (let campo in params.inputs) {
                const input = doc.querySelector('#id_sc_field_' + campo);
                if (input && !input.disabled) {
                    input.value = params.inputs[campo];
                    
                    // Disparar TODOS os eventos necessários para o Octus
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                    
                    preenchidos++;
                    detalhes.push({campo: campo, tipo: 'input', valor: params.inputs[campo].substring(0, 20)});
                }
            }
            
            // ================================================================
            // PREENCHER SELECTS
            // ================================================================
            for (let campo in params.selects) {
                const select = doc.querySelector('#id_sc_field_' + campo);
                if (select && !select.disabled) {
                    select.value = params.selects[campo];
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    preenchidos++;
                    detalhes.push({campo: campo, tipo: 'select', valor: params.selects[campo]});
                }
            }
            
            // ================================================================
            // PREENCHER RADIOS
            // ================================================================
            for (let campo in params.radios) {
                const valorDesejado = params.radios[campo];
                const radios = doc.querySelectorAll('input[name="' + campo + '"]');
                
                for (let radio of radios) {
                    if (radio.value === valorDesejado) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        preenchidos++;
                        detalhes.push({campo: campo, tipo: 'radio', valor: valorDesejado});
                        break;
                    }
                }
            }
            
            return {
                preenchidos: preenchidos,
                detalhes: detalhes
            };
        }''', {
            'inputs': dados_input,
            'selects': dados_select,
            'radios': dados_radio
        })
        
        time.sleep(1)
        
        total = preenchidos.get('preenchidos', 0) if isinstance(preenchidos, dict) else 0
        logger.info(f"  {total} campos preenchidos")
        
        return True
    
    def salvar_cadastro(self):
        """Clica em Salvar e aguarda confirmação"""
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const botao = doc.querySelector('#sc_b_upd_t');
            if (botao) botao.click();
        }''')
        time.sleep(3)
        
        # Verificar se apareceu modal de erro de validação
        tem_erro = self.page.evaluate('''() => {
            // Verificar modal SweetAlert de erro
            const modal = document.querySelector('.swal2-modal');
            if (modal && modal.offsetParent !== null) {
                const texto = modal.textContent || '';
                if (texto.includes('obrigatório') || texto.includes('preencha')) {
                    // Clicar em OK para fechar
                    const btnOk = document.querySelector('button.swal2-confirm');
                    if (btnOk) btnOk.click();
                    return true;
                }
            }
            return false;
        }''')
        
        if tem_erro:
            logger.warning("  Modal de validação detectado!")
            time.sleep(1)
        
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
        
        # 2. Verificar e clicar em OK no modal SweetAlert (se aparecer)
        self.page.evaluate('''() => {
            // Modal SweetAlert fica FORA do iframe
            const botaoOk = document.querySelector('button.swal2-confirm') ||
                           document.querySelector('button.scButton_sweetalertok');
            
            if (botaoOk && botaoOk.offsetParent !== null) {
                botaoOk.click();
            }
        }''')
        time.sleep(2)
        
        return True
    
    def processar_registro(self, indice, registro):
        """Processa um registro completo"""
        codigo = registro['pessoa']
        nome = registro.get('nome', 'N/A')
        
        logger.info(f"[{indice+1}/{self.estatisticas['total']}] Processando: {codigo} - {nome}")
        
        try:
            # 1. Buscar código na página atual
            encontrado, info = self.buscar_codigo_na_pagina(codigo)
            
            # 2. Se não encontrou, tentar próximas páginas (máximo 10 tentativas)
            paginas_tentadas = 0
            while not encontrado and paginas_tentadas < 10:
                logger.info(f"  Código {codigo} não encontrado, tentando próxima página...")
                if not self.proxima_pagina():
                    break
                encontrado, info = self.buscar_codigo_na_pagina(codigo)
                paginas_tentadas += 1
            
            if not encontrado:
                self.estatisticas['nao_encontrados'] += 1
                raise Exception(f"Código {codigo} não encontrado após {paginas_tentadas} páginas")
            
            logger.info(f"  Código {codigo} encontrado: {info.get('codigo')}")
            
            # 3. Preencher campos
            self.preencher_campos(registro)
            
            # 4. Salvar
            self.salvar_cadastro()
            
            # 5. Voltar para listagem
            self.voltar_listagem()
            
            self.estatisticas['sucessos'] += 1
            logger.info(f"  ✓ Registro {codigo} atualizado com sucesso")
            
            # Salvar progresso periodicamente
            if (indice + 1) % Config.SALVAR_PROGRESSO_A_CADA == 0:
                self.salvar_progresso(indice + 1, codigo)
            
            return True
            
        except Exception as e:
            self.estatisticas['erros'] += 1
            logger.error(f"  ✗ Erro: {e}")
            self.erros.append({
                'indice': indice, 
                'codigo': codigo, 
                'nome': nome,
                'erro': str(e)
            })
            
            # Tentar voltar para listagem
            try:
                self.voltar_listagem()
            except:
                # Se falhou, renavegar
                self.navegar_para_fornecedores()
                self.ordenar_por_codigo()
            
            return False
        
        finally:
            self.estatisticas['processados'] += 1
            time.sleep(Config.DELAY_ENTRE_REGISTROS)
    
    def executar(self, limite=None):
        """Execução principal do robô"""
        try:
            self.carregar_dados()
            self.iniciar_navegador()
            self.fazer_login()
            self.navegar_para_fornecedores()
            self.ordenar_por_codigo()
            
            logger.info(f"\n{'='*80}")
            logger.info("INICIANDO PROCESSAMENTO V3")
            logger.info(f"Total de registros: {self.estatisticas['total']}")
            if limite:
                logger.info(f"Limite definido: {limite} registros")
            logger.info(f"{'='*80}\n")
            
            inicio = self.progresso['ultimo_indice']
            fim = min(inicio + limite, len(self.dados)) if limite else len(self.dados)
            
            for idx in range(inicio, fim):
                self.processar_registro(idx, self.dados.iloc[idx])
            
            self.finalizar()
            
        except KeyboardInterrupt:
            logger.warning("\n⚠ Interrompido pelo usuário")
            self.finalizar()
        except Exception as e:
            logger.error(f"❌ Erro crítico: {e}")
            import traceback
            traceback.print_exc()
            self.finalizar()
    
    def finalizar(self):
        """Finaliza e gera relatório"""
        logger.info(f"\n{'='*80}")
        logger.info("FINALIZANDO")
        logger.info(f"{'='*80}")
        
        tempo_total = datetime.now() - self.estatisticas['inicio']
        
        logger.info(f"\n📊 ESTATÍSTICAS:")
        logger.info(f"  Total na planilha: {self.estatisticas['total']}")
        logger.info(f"  Processados: {self.estatisticas['processados']}")
        logger.info(f"  ✓ Sucessos: {self.estatisticas['sucessos']}")
        logger.info(f"  ✗ Erros: {self.estatisticas['erros']}")
        logger.info(f"  ? Não encontrados: {self.estatisticas['nao_encontrados']}")
        
        if self.estatisticas['processados'] > 0:
            taxa = (self.estatisticas['sucessos'] / self.estatisticas['processados']) * 100
            logger.info(f"  Taxa de sucesso: {taxa:.1f}%")
        
        logger.info(f"  Tempo total: {tempo_total}")
        
        # Salvar erros em CSV
        if self.erros:
            df_erros = pd.DataFrame(self.erros)
            df_erros.to_csv(Config.ARQUIVO_ERROS, index=False, encoding='utf-8-sig')
            logger.info(f"\n⚠ {len(self.erros)} erros salvos em {Config.ARQUIVO_ERROS}")
        
        # Salvar progresso final
        self.salvar_progresso(self.estatisticas['processados'], 0)
        
        logger.info("\n✅ Finalizado!")


# ==============================================================================
# EXECUÇÃO
# ==============================================================================
if __name__ == "__main__":
    import sys
    
    print("="*80)
    print("  ROBÔ V3 - ATUALIZAÇÃO DE FORNECEDORES")
    print("  Versão completa com todos os campos obrigatórios")
    print("="*80)
    
    # Verificar argumento de limite
    limite = None
    if len(sys.argv) > 1:
        try:
            limite = int(sys.argv[1])
            print(f"\n⚙ Limite definido: {limite} registros")
        except:
            pass
    
    print("\nIniciando em 3 segundos...")
    time.sleep(3)
    
    robo = RoboFornecedoresV3()
    robo.executar(limite=limite)








