"""
ROBÔ DE ATUALIZAÇÃO V4 - COM VERIFICAÇÃO DE AUTO-PREENCHIMENTO
- Preenche CNPJ primeiro e aguarda auto-preenchimento do sistema
- NÃO sobrescreve dados de endereço/contato se já preenchidos
- Registra divergências no log para análise posterior
- SUPORTE A MÚLTIPLAS INSTÂNCIAS com ranges diferentes

USO:
  python robo_fornecedores_v4.py                    # Processa todos
  python robo_fornecedores_v4.py 0 2000             # Processa 0-1999
  python robo_fornecedores_v4.py 2000 4000          # Processa 2000-3999
  python robo_fornecedores_v4.py 4000 6000          # Processa 4000-5999
  python robo_fornecedores_v4.py 6000 8055          # Processa 6000-8054

Desenvolvido por: SynNova AI
Data: Novembro/2025
"""

import pandas as pd
import json
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright
import time
import argparse

# ==============================================================================
# CONFIGURAÇÕES
# ==============================================================================
class Config:
    URL_LOGIN = "http://192.168.0.247:4586/login"
    USUARIO = "edilson@synnova.com.br"
    SENHA = "1234"
    
    ARQUIVO_EXCEL = "CLIENTES E FORNECEDORES PROCESSADO MAC.xlsx"
    ARQUIVO_PROGRESSO = "progresso_v4.json"
    ARQUIVO_LOG = "robo_v4.log"
    ARQUIVO_ERROS = "erros_v4.csv"
    ARQUIVO_DIVERGENCIAS = "divergencias_v4.csv"  # NOVO: arquivo de divergências
    
    TIMEOUT = 30000
    DELAY_ENTRE_REGISTROS = 0.1  # TURBO++: de 0.15 para 0.1
    REGISTROS_POR_PAGINA = 50
    SALVAR_PROGRESSO_A_CADA = 10
    
    # Tempo de espera após preencher CNPJ para auto-preenchimento
    AGUARDAR_AUTO_PREENCHIMENTO = 0.8  # TURBO++: de 1 para 0.8
    
    # VALORES PADRÃO para campos obrigatórios vazios
    VALORES_PADRAO = {
        'cf_telefone1x': '4199999999',      # Telefone padrão
        'cf_telefone2x': '',                 # Telefone 2 opcional
        'cf_email': 'naotem@email.com',      # Email padrão
        'cf_cepx': '80000000',               # CEP padrão (Curitiba)
        'cf_endereco': 'NAO INFORMADO',      # Endereço padrão
        'cf_bairro': 'CENTRO',               # Bairro padrão
        'cf_endereco_nro': 'S/N',            # Número padrão
    }

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
# ROBÔ V4 - COM VERIFICAÇÃO DE AUTO-PREENCHIMENTO
# ==============================================================================
class RoboFornecedoresV4:
    def __init__(self, instancia_id=''):
        self.instancia_id = instancia_id
        self.dados = None
        self.progresso = self.carregar_progresso()
        self.erros = []
        self.divergencias = []  # NOVO: lista de divergências
        self.page = None
        self.estatisticas = {
            'total': 0,
            'processados': 0,
            'sucessos': 0,
            'erros': 0,
            'nao_encontrados': 0,
            'divergencias': 0,
            'inicio': datetime.now()
        }
    
    def get_arquivo_progresso(self):
        """Retorna nome do arquivo de progresso para esta instância"""
        if self.instancia_id:
            return f"progresso_v4_{self.instancia_id}.json"
        return Config.ARQUIVO_PROGRESSO
    
    def carregar_progresso(self):
        """Carrega progresso salvo"""
        try:
            arquivo = self.get_arquivo_progresso()
            with open(arquivo, 'r', encoding='utf-8') as f:
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
        # Converter para int Python nativo (evita erro numpy.int64)
        indice_int = int(indice) if hasattr(indice, 'item') else int(indice)
        codigo_int = int(codigo) if isinstance(codigo, (int, float)) or hasattr(codigo, 'item') else str(codigo)
        
        self.progresso['ultimo_indice'] = indice_int
        self.progresso['processados'].append({
            'indice': indice_int,
            'codigo': codigo_int,
            'data': datetime.now().isoformat()
        })
        
        arquivo = self.get_arquivo_progresso()
        with open(arquivo, 'w', encoding='utf-8') as f:
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
        self.browser = self.playwright.chromium.launch(headless=False, slow_mo=150)
        context = self.browser.new_context(viewport={'width': 1920, 'height': 1080})
        self.page = context.new_page()
        self.page.set_default_timeout(Config.TIMEOUT)
        logger.info("Navegador iniciado")
    
    def fechar_navegador(self):
        """Fecha navegador completamente"""
        try:
            if hasattr(self, 'page') and self.page:
                self.page.close()
        except:
            pass
        try:
            if hasattr(self, 'browser') and self.browser:
                self.browser.close()
        except:
            pass
        try:
            if hasattr(self, 'playwright') and self.playwright:
                self.playwright.stop()
        except:
            pass
        self.page = None
        self.browser = None
        self.playwright = None
    
    def reiniciar_navegador(self):
        """Reinicia navegador completamente e refaz login"""
        logger.info("  [REINICIO] Fechando navegador...")
        self.fechar_navegador()
        time.sleep(2)
        
        logger.info("  [REINICIO] Abrindo navegador novamente...")
        self.iniciar_navegador()
        self.fazer_login()
        self.navegar_para_fornecedores()
        self.ordenar_por_codigo()
        logger.info("  [REINICIO] Sistema pronto novamente")
    
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
        logger.info("Abrindo menu Cadastros...")
        
        # Primeiro abre o menu Cadastros
        try:
            # Tentar clicar no menu Cadastros pelo texto
            self.page.click('a.nav-link:has-text("Cadastros")', timeout=5000)
        except:
            # Fallback: tentar pelo span
            try:
                self.page.click('span.menu-text:has-text("Cadastros")', timeout=5000)
            except:
                # Fallback 2: JavaScript
                self.page.evaluate('''() => {
                    const links = document.querySelectorAll('a.nav-link');
                    for (const link of links) {
                        if (link.textContent.includes('Cadastros')) {
                            link.click();
                            return;
                        }
                    }
                }''')
        
        time.sleep(1)  # Aguarda submenu abrir
        
        # Agora clica em Cliente/Fornecedores
        logger.info("Clicando em Cliente/Fornecedores...")
        try:
            self.page.click('text=Cliente/Fornecedores', timeout=5000)
        except:
            # Fallback: JavaScript
            self.page.evaluate('''() => {
                const links = document.querySelectorAll('a');
                for (const link of links) {
                    if (link.textContent.includes('Cliente/Fornecedores')) {
                        link.click();
                        return;
                    }
                }
            }''')
        
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
        logger.info("Ordenacao crescente aplicada (1 a infinito)")
    
    def pesquisar_codigo(self, codigo):
        """
        Usa a busca rapida do ERP para pesquisar o codigo.
        Apos pesquisar, volta para pagina 1 e garante ordenacao crescente.
        """
        logger.debug(f"  Pesquisando codigo: {codigo}")
        
        # Preencher campo de busca e clicar em pesquisar
        self.page.evaluate(f'''(codigo) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            
            // Campo de busca rapida
            const inputBusca = doc.querySelector('#SC_fast_search_top');
            if (inputBusca) {{
                inputBusca.value = codigo;
                inputBusca.dispatchEvent(new Event('input', {{ bubbles: true }}));
                inputBusca.dispatchEvent(new Event('change', {{ bubbles: true }}));
            }}
            
            // Botao de pesquisa (e uma imagem)
            const btnPesquisar = doc.querySelector('#SC_fast_search_submit_top');
            if (btnPesquisar) {{
                btnPesquisar.click();
            }}
        }}''', str(codigo))
        
        # Aguardar codigo aparecer nos resultados
        self.aguardar_mudanca_resultados({}, str(codigo))
        
        # Voltar para pagina 1 e garantir ordenacao crescente
        self.ir_para_pagina_1()
        self.garantir_ordenacao_crescente()
    
    def ir_para_pagina_1(self):
        """Navega para a primeira pagina de resultados"""
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            // Verificar se ja esta na pagina 1
            const inputPagina = doc.querySelector('input[name="nmgp_pag_arg"]') || 
                               doc.querySelector('input[id*="pag"]');
            
            // Clicar no botao de voltar ao inicio (<<)
            const btnInicio = doc.querySelector('[title*="início"], [title*="Retornar ao início"], .scGridNavFirst');
            if (btnInicio && btnInicio.offsetParent !== null) {
                btnInicio.click();
                return;
            }
            
            // Tentar clicar no link da pagina 1
            const links = doc.querySelectorAll('a[href*="nm_gp_submit_rec(1)"], a[href*="submit_rec(1)"]');
            for (let link of links) {
                if (link.offsetParent !== null) {
                    link.click();
                    return;
                }
            }
        }''')
        time.sleep(0.2)
    
    def garantir_ordenacao_crescente(self):
        """Garante que a lista esta ordenada por codigo de forma crescente"""
        # Verificar primeiro codigo visivel
        primeiro_codigo = self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return null;
            const doc = iframe.contentDocument;
            
            const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
            if (spans.length > 0) {
                return spans[0].textContent.trim().replace(/\\s/g, '');
            }
            return null;
        }''')
        
        # Se o primeiro codigo nao e pequeno (ex: maior que 100), provavelmente esta em ordem decrescente
        # Clicar 2x no header para ordenar crescente
        if primeiro_codigo:
            try:
                codigo_num = int(primeiro_codigo)
                if codigo_num > 100:  # Provavelmente ordem decrescente
                    logger.debug(f"  Reordenando (primeiro codigo={primeiro_codigo})")
                    self.ordenar_por_codigo()
            except:
                pass
    
    def aguardar_mudanca_resultados(self, estado_antes, codigo_pesquisado, timeout_ms=5000, intervalo_ms=100):
        """
        Aguarda o codigo pesquisado aparecer nos resultados.
        Estrategia: verifica se o codigo exato esta visivel na tabela.
        """
        inicio = time.time()
        timeout_sec = timeout_ms / 1000
        codigo_str = str(codigo_pesquisado)
        
        while (time.time() - inicio) < timeout_sec:
            # Verificar se apareceu erro
            erro = self.page.evaluate('''() => {
                const swal = document.querySelector('.swal2-popup');
                if (swal && swal.offsetParent !== null) {
                    return {erro: true, texto: swal.innerText || ''};
                }
                const iframe = document.querySelector('#iframe_11');
                if (iframe && iframe.contentDocument) {
                    const swalIframe = iframe.contentDocument.querySelector('.swal2-popup');
                    if (swalIframe && swalIframe.offsetParent !== null) {
                        return {erro: true, texto: swalIframe.innerText || ''};
                    }
                }
                return {erro: false};
            }''')
            
            if erro.get('erro'):
                texto = erro.get('texto', '')[:100]
                logger.warning(f"  !! Modal detectado na pesquisa: {texto}")
                self.clicar_ok_modal()
                time.sleep(0.3)
                return False
            
            # Verificar se o codigo pesquisado esta nos resultados
            resultado = self.page.evaluate(f'''(codigoBuscado) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return {{encontrou: false, codigos: []}};
                const doc = iframe.contentDocument;
                
                // Pegar todos os codigos visiveis
                const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
                const codigos = [];
                let encontrou = false;
                
                for (let span of spans) {{
                    const codigoOriginal = span.textContent.trim().replace(/\\s/g, '');
                    codigos.push(codigoOriginal);
                    // Remover formatacao de milhar (pontos e virgulas) para comparacao
                    const codigoLimpo = codigoOriginal.replace(/[.,]/g, '');
                    if (codigoLimpo === codigoBuscado) {{
                        encontrou = true;
                    }}
                }}
                
                // Verificar mensagem de vazio
                const msgVazio = doc.body.innerText.includes('Nenhum registro') || 
                                 doc.body.innerText.includes('No records');
                
                return {{
                    encontrou: encontrou,
                    codigos: codigos.slice(0, 10),
                    vazio: msgVazio,
                    total: codigos.length
                }};
            }}''', codigo_str)
            
            # Se encontrou o codigo exato, sucesso!
            if resultado.get('encontrou'):
                return True
            
            # Se esta vazio, a pesquisa terminou (codigo nao existe)
            if resultado.get('vazio'):
                logger.debug(f"  Pesquisa retornou vazio para {codigo_pesquisado}")
                return True
            
            # Se tem resultados mas nao encontrou o codigo exato, continua esperando
            # (pode ser que a pagina ainda esta carregando)
            
            time.sleep(intervalo_ms / 1000)
        
        # Timeout - logar os codigos visiveis para debug
        codigos_visiveis = resultado.get('codigos', []) if resultado else []
        logger.warning(f"  Timeout aguardando codigo {codigo_pesquisado}. Codigos visiveis: {codigos_visiveis[:5]}")
        return True  # Continua mesmo assim para tentar encontrar
    
    def aguardar_resultados_pesquisa(self, timeout_ms=3000, intervalo_ms=100):
        """
        Aguarda os resultados da pesquisa carregarem.
        Tambem detecta erros como 'Dados invalidos'.
        """
        inicio = time.time()
        timeout_sec = timeout_ms / 1000
        
        while (time.time() - inicio) < timeout_sec:
            # Verificar se apareceu erro "Dados invalidos"
            erro = self.page.evaluate('''() => {
                // Verificar SweetAlert na pagina principal
                const swal = document.querySelector('.swal2-popup');
                if (swal && swal.offsetParent !== null) {
                    const texto = swal.innerText || '';
                    return {erro: true, texto: texto};
                }
                
                // Verificar no iframe tambem
                const iframe = document.querySelector('#iframe_11');
                if (iframe && iframe.contentDocument) {
                    const swalIframe = iframe.contentDocument.querySelector('.swal2-popup');
                    if (swalIframe && swalIframe.offsetParent !== null) {
                        const texto = swalIframe.innerText || '';
                        return {erro: true, texto: texto};
                    }
                }
                return {erro: false};
            }''')
            
            if erro.get('erro'):
                texto = erro.get('texto', '')[:100]
                logger.warning(f"  !! Modal detectado na pesquisa: {texto}")
                # Fechar o modal de erro
                self.clicar_ok_modal()
                time.sleep(0.3)
                return False
            
            # Verificar estado da tabela
            estado = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return {ok: false, motivo: 'sem_iframe'};
                const doc = iframe.contentDocument;
                
                // Verificar se ha mensagem de "nenhum registro"
                const msgNenhum = doc.querySelector('.scGridNoRecordsMessage, .scGridEmpty, [class*="empty"], [class*="no-record"]');
                if (msgNenhum && msgNenhum.offsetParent !== null) {
                    return {ok: true, vazio: true, msg: msgNenhum.innerText};
                }
                
                // Verificar se ha linhas na tabela
                const linhas = doc.querySelectorAll('tr[id^="SC_ancor"]');
                if (linhas.length > 0) {
                    return {ok: true, linhas: linhas.length};
                }
                
                return {ok: false, motivo: 'carregando'};
            }''')
            
            if estado.get('ok'):
                if estado.get('vazio'):
                    logger.debug(f"  Pesquisa retornou vazio: {estado.get('msg', '')[:50]}")
                return True
            
            time.sleep(intervalo_ms / 1000)
        
        return True  # Timeout, mas continua mesmo assim
    
    def limpar_pesquisa(self):
        """Limpa o campo de busca para mostrar todos os registros"""
        # Verificar se campo ja esta vazio
        campo_vazio = self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return true;
            const doc = iframe.contentDocument;
            const inputBusca = doc.querySelector('#SC_fast_search_top');
            return !inputBusca || inputBusca.value === '';
        }''')
        
        if campo_vazio:
            return  # Ja esta limpo, nao precisa fazer nada
        
        # Capturar estado antes
        estado_antes = self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return {codigos: []};
            const doc = iframe.contentDocument;
            const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
            const codigos = [];
            for (let span of spans) {
                codigos.push(span.textContent.trim().replace(/\\s/g, ''));
            }
            return {codigos: codigos.slice(0, 3)};
        }''')
        
        # Limpar campo e clicar em pesquisar
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            
            // Limpar campo de busca
            const inputBusca = doc.querySelector('#SC_fast_search_top');
            if (inputBusca) {
                inputBusca.value = '';
                inputBusca.dispatchEvent(new Event('input', { bubbles: true }));
                inputBusca.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Clicar em pesquisar (para mostrar todos)
            const btnPesquisar = doc.querySelector('#SC_fast_search_submit_top');
            if (btnPesquisar) {
                btnPesquisar.click();
            }
        }''')
        
        # Aguardar resultados mudarem
        self.aguardar_mudanca_resultados(estado_antes, 'limpar', timeout_ms=3000)
    
    def buscar_codigo_na_pagina(self, codigo_esperado):
        """Busca código EXATO na página atual e clica em EDITAR"""
        resultado = self.page.evaluate(f'''(codigoEsperado) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return {{encontrado: false, codigos_visiveis: []}};
            
            const doc = iframe.contentDocument;
            const spans = doc.querySelectorAll('span[id^="id_sc_field_cf_codigo_"]');
            const codigos_visiveis = [];
            
            for (let span of spans) {{
                const codigoCompleto = span.textContent.trim();
                codigos_visiveis.push(codigoCompleto);
                const codigoLimpo = codigoCompleto.replace(/[.\\s]/g, '');
                const esperadoLimpo = String(codigoEsperado).replace(/[.\\s]/g, '');
                
                if (codigoCompleto === String(codigoEsperado) || codigoLimpo === esperadoLimpo) {{
                    const linha = span.closest('tr');
                    const botaoEditar = linha ? linha.querySelector('a#bedit') : null;
                    
                    if (botaoEditar) {{
                        botaoEditar.click();
                        return {{
                            encontrado: true,
                            codigo: codigoCompleto,
                            span_id: span.id,
                            codigos_visiveis: codigos_visiveis
                        }};
                    }}
                }}
            }}
            
            return {{encontrado: false, codigos_visiveis: codigos_visiveis}};
        }}''', str(codigo_esperado))
        
        if resultado.get('encontrado'):
            # Aguardar formulário de edição carregar
            form_ok = self.aguardar_formulario_edicao()
            
            if not form_ok:
                # Verificar se apareceu erro
                erro = self.detectar_erro_modal()
                if erro:
                    logger.warning(f"  ⚠ Erro ao abrir edição: {erro[:80]}")
                    self.clicar_ok_modal()
                    time.sleep(0.3)
                    return False, {'erro': erro}
        else:
            # Log dos códigos visíveis para debug
            codigos = resultado.get('codigos_visiveis', [])
            if codigos:
                logger.debug(f"  📋 Códigos visíveis: {codigos[:5]}...")
        
        return resultado.get('encontrado', False), resultado
    
    def detectar_erro_modal(self):
        """Detecta se há algum modal de erro visível (Dados inválidos, etc)"""
        return self.page.evaluate('''() => {
            // Verificar SweetAlert na página principal
            const swal = document.querySelector('.swal2-popup');
            if (swal && swal.offsetParent !== null) {
                return swal.innerText || '';
            }
            
            // Verificar no iframe
            const iframe = document.querySelector('#iframe_11');
            if (iframe && iframe.contentDocument) {
                const swalIframe = iframe.contentDocument.querySelector('.swal2-popup');
                if (swalIframe && swalIframe.offsetParent !== null) {
                    return swalIframe.innerText || '';
                }
            }
            
            return null;
        }''')
    
    def aguardar_formulario_edicao(self, timeout_ms=3000, intervalo_ms=100):
        """Aguarda o formulário de edição carregar detectando os campos"""
        inicio = time.time()
        timeout_s = timeout_ms / 1000
        intervalo_s = intervalo_ms / 1000
        
        while (time.time() - inicio) < timeout_s:
            resultado = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                const doc = iframe.contentDocument;
                
                // Verificar se campo de Nome/Razão Social existe (indica formulário carregado)
                const campoNome = doc.querySelector('#id_sc_field_cf_nome_razao');
                const campoCnpj = doc.querySelector('#id_sc_field_cf_cnpjx') || doc.querySelector('#id_sc_field_cf_cpfx');
                
                return !!(campoNome || campoCnpj);
            }''')
            
            if resultado:
                return True
            
            time.sleep(intervalo_s)
        
        return False
    
    def aguardar_campo_cpf_cnpj(self, campo_esperado, timeout_ms=1500, intervalo_ms=50):
        """
        Aguarda o campo CPF ou CNPJ aparecer após mudança de tipo pessoa.
        campo_esperado: 'cf_cpfx' ou 'cf_cnpjx'
        """
        inicio = time.time()
        timeout_s = timeout_ms / 1000
        intervalo_s = intervalo_ms / 1000
        
        while (time.time() - inicio) < timeout_s:
            resultado = self.page.evaluate(f'''(campo) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                const doc = iframe.contentDocument;
                
                const input = doc.querySelector('#id_sc_field_' + campo);
                return !!(input && input.offsetParent !== null);  // Visível
            }}''', campo_esperado)
            
            if resultado:
                return True
            
            time.sleep(intervalo_s)
        
        return False
    
    def proxima_pagina(self):
        """Avança para próxima página na listagem"""
        try:
            resultado = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                
                const doc = iframe.contentDocument;
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
            
            time.sleep(0.8)  # Reduzido de 3s para 0.8s
            return resultado
        except:
            return False
    
    def obter_valores_atuais(self):
        """Obtém valores atuais dos campos do formulário (após auto-preenchimento)"""
        valores = self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return {};
            
            const doc = iframe.contentDocument;
            
            // Todos os campos que podem ser auto-preenchidos via CNPJ ou existentes
            const campos = [
                'cf_nome_razao', 'cf_nome_fantasia',
                'cf_cepx', 'cf_endereco', 'cf_endereco_nro', 'cf_end_complemento',
                'cf_bairro', 'cf_telefone1x', 'cf_telefone2x', 
                'cf_email', 'cf_email_compras'
            ];
            
            const valores = {};
            
            for (let campo of campos) {
                const input = doc.querySelector('#id_sc_field_' + campo);
                if (input) {
                    valores[campo] = input.value ? input.value.trim() : '';
                }
            }
            
            return valores;
        }''')
        
        return valores
    
    def aguardar_auto_preenchimento(self, timeout_ms=2000, intervalo_ms=100):
        """
        Aguarda auto-preenchimento usando polling inteligente ao invés de sleep fixo.
        Verifica se o campo Razão Social foi preenchido (indica que o CNPJ foi consultado).
        Retorna assim que detectar preenchimento ou após timeout.
        """
        import time
        inicio = time.time()
        timeout_s = timeout_ms / 1000
        intervalo_s = intervalo_ms / 1000
        
        # Pequena espera inicial para a requisição iniciar
        time.sleep(0.1)
        
        while (time.time() - inicio) < timeout_s:
            # Verificar se razão social foi preenchida (indica consulta CNPJ concluída)
            razao = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return '';
                const doc = iframe.contentDocument;
                const input = doc.querySelector('#id_sc_field_cf_nome_razao');
                return input ? input.value.trim() : '';
            }''')
            
            if razao:
                # Auto-preenchimento concluído!
                return True
            
            time.sleep(intervalo_s)
        
        # Timeout - continuar mesmo assim (pode não ter dados na Receita)
        return False
    
    def registrar_divergencia(self, codigo, nome, campo, valor_sistema, valor_planilha):
        """Registra uma divergência para análise posterior"""
        divergencia = {
            'codigo': codigo,
            'nome': nome,
            'campo': campo,
            'valor_sistema': valor_sistema,
            'valor_planilha': valor_planilha,
            'data': datetime.now().isoformat()
        }
        
        self.divergencias.append(divergencia)
        self.estatisticas['divergencias'] += 1
        
        logger.warning(f"  ⚠ DIVERGÊNCIA [{campo}]: Sistema='{valor_sistema}' | Planilha='{valor_planilha}'")
    
    def limpar_valor(self, valor, apenas_numeros=False):
        """Limpa valor para comparação"""
        if pd.isna(valor) or valor is None:
            return ''
        
        valor_str = str(valor).strip()
        
        if apenas_numeros:
            return ''.join(filter(str.isdigit, valor_str))
        
        return valor_str
    
    def formatar_cnpj_cpf(self, valor, is_pj=True):
        """
        Formata CNPJ/CPF garantindo zeros à esquerda.
        CNPJ = 14 dígitos (PJ), CPF = 11 dígitos (PF)
        
        Args:
            valor: O número do CNPJ/CPF
            is_pj: True se Pessoa Jurídica (CNPJ), False se Pessoa Física (CPF)
        """
        if pd.isna(valor) or valor is None:
            return ''
        
        # Se for float (número), converter para int primeiro para evitar decimais
        if isinstance(valor, float):
            valor = int(valor)
        
        # Extrair apenas dígitos
        apenas_numeros = ''.join(filter(str.isdigit, str(valor)))
        
        if not apenas_numeros:
            return ''
        
        # Usar o tipo de pessoa para determinar o formato
        if is_pj:
            # CNPJ: SEMPRE 14 dígitos
            return apenas_numeros.zfill(14)
        else:
            # CPF: SEMPRE 11 dígitos
            return apenas_numeros.zfill(11)
    
    def preencher_campos(self, registro):
        """
        LÓGICA V6 - NOVA ORDEM:
        
        1. Limpar CNPJ/CPF (sem preencher ainda)
        2. Preencher TODOS os dados da planilha PRIMEIRO
        3. Preencher CNPJ/CPF por ÚLTIMO (auto-importa e pode sobrescrever - OK)
        4. Verificar campos obrigatórios
        
        Isso garante que os dados da planilha são preenchidos,
        e depois o CNPJ pode sobrescrever com dados importados (que têm prioridade).
        """
        codigo = registro['pessoa']
        nome = registro.get('nome', 'N/A')
        
        # Determinar tipo de pessoa
        is_pj = True
        if pd.notna(registro.get('indfisjur')) and registro['indfisjur'] == 'F':
            is_pj = False
        
        tipo_pessoa_destino = 'Jurídica' if is_pj else 'Física'
        tipo_pessoa_oposto = 'Física' if is_pj else 'Jurídica'
        
        # Campo que será usado
        campo_oposto = 'cf_cnpjx' if not is_pj else 'cf_cpfx'
        campo_destino = 'cf_cnpjx' if is_pj else 'cf_cpfx'
        
        # Obter CNPJ/CPF formatado
        cnpj_cpf = ''
        if pd.notna(registro.get('cnpj_cpf')):
            cnpj_cpf = self.formatar_cnpj_cpf(registro['cnpj_cpf'], is_pj=is_pj)
        
        # =====================================================================
        # FASE 1: LIMPAR CNPJ/CPF (mas ainda NÃO preencher)
        # =====================================================================
        logger.info(f"  Limpando CNPJ/CPF...")
        
        # 1. Mudar para tipo OPOSTO
        self.page.evaluate(f'''(tipoOposto) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const radios = doc.querySelectorAll('input[name="cf_tipo_pessoa"]');
            for (let radio of radios) {{
                if (radio.value === tipoOposto) {{
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    break;
                }}
            }}
        }}''', tipo_pessoa_oposto)
        self.aguardar_campo_cpf_cnpj(campo_oposto)
        
        # 2. Limpar campo do tipo OPOSTO
        self.page.evaluate(f'''(campoOposto) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const input = doc.querySelector('#id_sc_field_' + campoOposto);
            if (input) {{
                input.value = '';
                input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
            }}
        }}''', campo_oposto)
        time.sleep(0.1)
        
        # 3. Voltar para tipo CORRETO
        self.page.evaluate(f'''(tipoDestino) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const radios = doc.querySelectorAll('input[name="cf_tipo_pessoa"]');
            for (let radio of radios) {{
                if (radio.value === tipoDestino) {{
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    break;
                }}
            }}
        }}''', tipo_pessoa_destino)
        self.aguardar_campo_cpf_cnpj(campo_destino)
        
        # =====================================================================
        # FASE 2: PREPARAR E PREENCHER TODOS OS DADOS DA PLANILHA (ANTES DO CNPJ)
        # =====================================================================
        
        # Ler dados da planilha (colunas já processadas)
        endereco_planilha = self.limpar_valor(registro.get('endereco_separado'))
        numero_planilha = self.limpar_valor(registro.get('numero_endereco'))
        
        # Montar campos para preencher
        campos_para_preencher = {}
        
        # Nome Fantasia
        if pd.notna(registro.get('nome')):
            campos_para_preencher['cf_nome_fantasia'] = str(registro['nome']).strip()
        
        # Razão Social (se tiver na planilha)
        if pd.notna(registro.get('razaosocial')):
            campos_para_preencher['cf_nome_razao'] = str(registro['razaosocial']).strip()
        
        # Endereço
        if endereco_planilha:
            campos_para_preencher['cf_endereco'] = endereco_planilha
        
        # Número
        if numero_planilha:
            campos_para_preencher['cf_endereco_nro'] = numero_planilha
        else:
            campos_para_preencher['cf_endereco_nro'] = 'S/N'
        
        # Complemento
        complemento = self.limpar_valor(registro.get('complemento'))
        if complemento:
            campos_para_preencher['cf_end_complemento'] = complemento
        
        # Bairro
        bairro = self.limpar_valor(registro.get('bairro'))
        if bairro:
            campos_para_preencher['cf_bairro'] = bairro
        
        # CEP
        cep = self.limpar_valor(registro.get('cep'), apenas_numeros=True)
        if cep:
            campos_para_preencher['cf_cepx'] = cep
        
        # Telefone
        telefone = self.limpar_valor(registro.get('telefone'), apenas_numeros=True)
        if telefone:
            campos_para_preencher['cf_telefone1x'] = telefone
        
        # Email
        email = self.limpar_valor(registro.get('email'))
        if email:
            campos_para_preencher['cf_email'] = email
        
        # Inscrições
        if pd.notna(registro.get('inscrestad_rg')):
            inscricao_valor = str(registro['inscrestad_rg']).strip()
            if is_pj:
                campos_para_preencher['cf_inscr_est'] = inscricao_valor
            else:
                campos_para_preencher['cf_ci'] = inscricao_valor
        
        if pd.notna(registro.get('inscmunicipal')):
            campos_para_preencher['cf_inscrmunicipio'] = str(registro['inscmunicipal']).strip()
        
        # Aplicar valores padrão para campos obrigatórios vazios
        campos_obrigatorios = ['cf_telefone1x', 'cf_email', 'cf_cepx', 'cf_endereco', 'cf_bairro', 'cf_endereco_nro']
        for campo in campos_obrigatorios:
            if campo not in campos_para_preencher or not campos_para_preencher[campo]:
                valor_padrao = Config.VALORES_PADRAO.get(campo, '')
                if valor_padrao:
                    campos_para_preencher[campo] = valor_padrao
        
        # Dados de SELECT e RADIO
        dados_select = {
            'cf_tipo': 'Fornecedor',
            'pa_codigo': '1058'
        }
        
        # Verifica se deve marcar como INATIVO (indAtivoSimNao = "Não")
        ind_ativo = registro.get('indAtivoSimNao', 'Sim')
        esta_ativo = 'Sim' if (not pd.notna(ind_ativo) or str(ind_ativo).strip().upper() != 'NÃO') else 'Não'
        
        dados_radio = {
            'cf_ativo': esta_ativo,
            'cf_tipo_pessoa': tipo_pessoa_destino
        }
        
        # =====================================================================
        # FASE 2.1: EXECUTAR PREENCHIMENTO DOS DADOS DA PLANILHA
        # =====================================================================
        if esta_ativo == 'Não':
            logger.info(f"  ⛔ Marcando como INATIVO (indAtivoSimNao={ind_ativo})")
        logger.info(f"  Preenchendo {len(campos_para_preencher)} campos da planilha...")
        
        self.page.evaluate('''(params) => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            // INPUTS
            for (let campo in params.inputs) {
                const input = doc.querySelector('#id_sc_field_' + campo);
                if (input && !input.disabled) {
                    input.value = params.inputs[campo];
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }
            
            // SELECTS
            for (let campo in params.selects) {
                const select = doc.querySelector('#id_sc_field_' + campo);
                if (select && !select.disabled) {
                    select.value = params.selects[campo];
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            
            // RADIOS
            for (let campo in params.radios) {
                const radios = doc.querySelectorAll('input[name="' + campo + '"]');
                for (let radio of radios) {
                    if (radio.value === params.radios[campo]) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            }
        }''', {
            'inputs': campos_para_preencher,
            'selects': dados_select,
            'radios': dados_radio
        })
        
        time.sleep(0.2)  # Pequena pausa para garantir que os campos foram preenchidos
        
        # =====================================================================
        # FASE 3: PREENCHER CNPJ/CPF POR ÚLTIMO (auto-importa e pode sobrescrever)
        # =====================================================================
        if cnpj_cpf:
            logger.info(f"  Preenchendo {'CNPJ' if is_pj else 'CPF'}: {cnpj_cpf} (pode sobrescrever com importados)")
            
            self.page.evaluate(f'''(params) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return;
                const doc = iframe.contentDocument;
                
                const input = doc.querySelector('#id_sc_field_' + params.campo);
                if (input && !input.disabled) {{
                    input.value = params.valor;
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                }}
            }}''', {'campo': campo_destino, 'valor': cnpj_cpf})
            
            # Aguardar auto-preenchimento
            self.aguardar_auto_preenchimento()
        
        # =====================================================================
        # FASE 4: VERIFICAR CAMPOS OBRIGATÓRIOS (após auto-preenchimento)
        # =====================================================================
        # FASE 5: VERIFICAR E PREENCHER CAMPOS OBRIGATÓRIOS VAZIOS
        # =====================================================================
        valores_atuais = self.obter_valores_atuais()
        
        campos_vazios = []
        for campo in campos_obrigatorios:
            valor = valores_atuais.get(campo, '').strip()
            if not valor:
                campos_vazios.append(campo)
                valor_padrao = Config.VALORES_PADRAO.get(campo, '')
                if valor_padrao:
                    # Preencher campo vazio com valor padrão
                    self.page.evaluate(f'''(params) => {{
                        const iframe = document.querySelector('#iframe_11');
                        if (!iframe || !iframe.contentDocument) return;
                        const doc = iframe.contentDocument;
                        const input = doc.querySelector('#id_sc_field_' + params.campo);
                        if (input && !input.disabled) {{
                            input.value = params.valor;
                            input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                            input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                            input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                        }}
                    }}''', {'campo': campo, 'valor': valor_padrao})
        
        if campos_vazios:
            logger.info(f"  Campos obrigatorios preenchidos com padrao: {campos_vazios}")
        
        logger.info(f"  Preenchimento concluido")
        return True
    
    def clicar_ok_modal(self):
        """Clica em OK em qualquer modal SweetAlert que aparecer - VERSÃO RÁPIDA"""
        # Tentar apenas 2 vezes para não demorar
        for tentativa in range(2):
            resultado = self.page.evaluate('''() => {
                // Tentar vários seletores para o botão OK na página principal
                const seletores = [
                    'button.swal2-confirm',
                    'button.scButton_sweetalertok', 
                    '.swal2-actions button',
                    'button[class*="swal"]'
                ];
                
                for (let seletor of seletores) {
                    const botoes = document.querySelectorAll(seletor);
                    for (let botao of botoes) {
                        if (botao && botao.offsetParent !== null) {
                            botao.click();
                            return {clicou: true, local: 'pagina'};
                        }
                    }
                }
                
                // Também tentar no iframe
                const iframe = document.querySelector('#iframe_11');
                if (iframe && iframe.contentDocument) {
                    const doc = iframe.contentDocument;
                    for (let seletor of seletores) {
                        const botoes = doc.querySelectorAll(seletor);
                        for (let botao of botoes) {
                            if (botao && botao.offsetParent !== null) {
                                botao.click();
                                return {clicou: true, local: 'iframe'};
                            }
                        }
                    }
                }
                
                return {clicou: false};
            }''')
            
            if resultado.get('clicou'):
                time.sleep(0.2)  # TURBO
                return True
            
            time.sleep(0.15)  # TURBO
        
        return False
    
    def detectar_erro_cpf_invalido(self):
        """Detecta se apareceu erro de CPF/CNPJ ou Dados inválidos"""
        resultado = self.page.evaluate('''() => {
            // Verificar modal SweetAlert
            const modal = document.querySelector('.swal2-popup:not(.swal2-toast)');
            if (modal) {
                const textoModal = modal.innerText || '';
                const temErro = modal.querySelector('.swal2-error');
                
                if (temErro || textoModal.toLowerCase().includes('inválido') || 
                    textoModal.toLowerCase().includes('erro')) {
                    return {
                        erro: true, 
                        tipo: 'modal_erro',
                        texto: textoModal.substring(0, 200)
                    };
                }
            }
            
            // Verificar texto geral da página
            const textoBody = document.body.innerText || '';
            
            if (textoBody.includes('CPF') && textoBody.includes('inválido')) {
                return {erro: true, tipo: 'cpf_invalido', texto: 'CPF inválido'};
            }
            if (textoBody.includes('CNPJ') && textoBody.includes('inválido')) {
                return {erro: true, tipo: 'cnpj_invalido', texto: 'CNPJ inválido'};
            }
            if (textoBody.includes('Dados inválidos')) {
                return {erro: true, tipo: 'dados_invalidos', texto: 'Dados inválidos'};
            }
            
            return {erro: false};
        }''')
        
        if resultado.get('erro'):
            logger.warning(f"  🔴 ERRO DETECTADO: {resultado.get('tipo')} - {resultado.get('texto', '')[:100]}")
        
        return resultado.get('erro', False), resultado.get('tipo', '')
    
    def corrigir_erro_cpf_pj(self, registro):
        """
        Corrige erro de CPF/CNPJ inválido:
        1. Mudar para tipo OPOSTO
        2. Limpar campo (cf_cpfx ou cf_cnpjx)
        3. Voltar para tipo CORRETO
        4. Preencher campo correto novamente
        
        IMPORTANTE: O ID do campo muda conforme o tipo de pessoa:
          - Pessoa Física: cf_cpfx
          - Pessoa Jurídica: cf_cnpjx
        """
        logger.warning("  🔄 Corrigindo erro CPF/CNPJ inválido...")
        
        # Determinar tipo de pessoa
        is_pj = True
        if pd.notna(registro.get('indfisjur')) and registro['indfisjur'] == 'F':
            is_pj = False
        
        tipo_pessoa_destino = 'Jurídica' if is_pj else 'Física'
        tipo_pessoa_oposto = 'Física' if is_pj else 'Jurídica'
        campo_destino = 'cf_cnpjx' if is_pj else 'cf_cpfx'
        campo_oposto = 'cf_cpfx' if is_pj else 'cf_cnpjx'
        
        # 1. Clicar OK no modal de erro
        self.clicar_ok_modal()
        time.sleep(0.3)  # TURBO
        
        # 2. Mudar para tipo OPOSTO
        self.page.evaluate(f'''(tipoOposto) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const radios = doc.querySelectorAll('input[name="cf_tipo_pessoa"]');
            for (let radio of radios) {{
                if (radio.value === tipoOposto) {{
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    break;
                }}
            }}
        }}''', tipo_pessoa_oposto)
        # Aguardar campo oposto aparecer
        self.aguardar_campo_cpf_cnpj(campo_oposto)
        
        # 3. Limpar o campo do tipo OPOSTO (que agora está visível)
        self.page.evaluate(f'''(campoOposto) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const input = doc.querySelector('#id_sc_field_' + campoOposto);
            if (input) {{
                input.value = '';
                input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
            }}
        }}''', campo_oposto)
        time.sleep(0.1)  # Pequena pausa após limpar

        # 4. Voltar para tipo CORRETO (destino)
        self.page.evaluate(f'''(tipoDestino) => {{
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            const doc = iframe.contentDocument;
            
            const radios = doc.querySelectorAll('input[name="cf_tipo_pessoa"]');
            for (let radio of radios) {{
                if (radio.value === tipoDestino) {{
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    break;
                }}
            }}
        }}''', tipo_pessoa_destino)
        # Aguardar campo destino aparecer
        self.aguardar_campo_cpf_cnpj(campo_destino)
        
        # 5. Preencher o campo CORRETO novamente
        cnpj_formatado = self.formatar_cnpj_cpf(registro.get('cnpj_cpf'), is_pj=is_pj)
        if cnpj_formatado:
            self.page.evaluate(f'''(params) => {{
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return;
                const doc = iframe.contentDocument;
                
                const input = doc.querySelector('#id_sc_field_' + params.campo);
                if (input && !input.disabled) {{
                    input.value = params.valor;
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                }}
            }}''', {'campo': campo_destino, 'valor': cnpj_formatado})
        time.sleep(0.3)  # TURBO
        
        logger.info("  🔄 Correção aplicada, tentando salvar novamente...")
        return True
    
    def aguardar_toast_sucesso(self, timeout_ms=3000, intervalo_ms=100):
        """
        Aguarda o toast de sucesso aparecer após salvar.
        Detecta: 'swal2-toast' com 'swal2-success' ou texto 'sucesso'
        Retorna True se encontrou, False se timeout.
        """
        inicio = time.time()
        timeout_s = timeout_ms / 1000
        intervalo_s = intervalo_ms / 1000
        
        while (time.time() - inicio) < timeout_s:
            resultado = self.page.evaluate('''() => {
                // Procurar toast de sucesso do SweetAlert2
                const toast = document.querySelector('.swal2-toast');
                if (toast) {
                    const temSucesso = toast.querySelector('.swal2-success');
                    const texto = toast.textContent || '';
                    if (temSucesso || texto.toLowerCase().includes('sucesso')) {
                        return { encontrado: true, tipo: 'sucesso' };
                    }
                }
                
                // Verificar se há erro
                const erroModal = document.querySelector('.swal2-popup:not(.swal2-toast)');
                if (erroModal) {
                    const temErro = erroModal.querySelector('.swal2-error');
                    const texto = erroModal.textContent || '';
                    if (temErro || texto.toLowerCase().includes('inválido')) {
                        return { encontrado: true, tipo: 'erro', texto: texto };
                    }
                }
                
                return { encontrado: false };
            }''')
            
            if resultado.get('encontrado'):
                if resultado.get('tipo') == 'sucesso':
                    return True, None
                else:
                    erro_texto = resultado.get('texto', 'Erro desconhecido')
                    logger.error(f"  🔴 ERRO AO SALVAR: {erro_texto[:150]}")
                    return False, erro_texto
            
            time.sleep(intervalo_s)
        
        # Timeout - assumir sucesso (o toast pode ter desaparecido rápido)
        return True, None
    
    def salvar_cadastro(self, registro=None):
        """Clica em Salvar e aguarda toast de sucesso - VERSÃO COM EVENTOS"""
        # Clicar em Salvar
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const botao = doc.querySelector('#sc_b_upd_t');
            if (botao) botao.click();
        }''')
        
        # Aguardar toast de sucesso ou erro (ao invés de sleep fixo)
        sucesso, erro = self.aguardar_toast_sucesso()
        
        if not sucesso and erro and registro is not None:
            # Verificar se é erro de CPF/CNPJ
            if 'cpf' in erro.lower() or 'cnpj' in erro.lower() or 'inválido' in erro.lower():
                logger.warning(f"  ⚠ Erro detectado: {erro[:50]}")
                
                # Tentar corrigir
                self.corrigir_erro_cpf_pj(registro)
                
                # Salvar novamente
                self.page.evaluate('''() => {
                    const iframe = document.querySelector('#iframe_11');
                    if (!iframe || !iframe.contentDocument) return;
                    
                    const doc = iframe.contentDocument;
                    const botao = doc.querySelector('#sc_b_upd_t');
                    if (botao) botao.click();
                }''')
                
                # Aguardar novamente
                self.aguardar_toast_sucesso()
        
        return True
    
    def voltar_listagem(self):
        """Volta para listagem (tratando modal de confirmacao) - VERSAO COM EVENTOS"""
        # 1. Clicar em Voltar
        self.page.evaluate('''() => {
            const iframe = document.querySelector('#iframe_11');
            if (!iframe || !iframe.contentDocument) return;
            
            const doc = iframe.contentDocument;
            const botao = doc.querySelector('#sc_b_sai_t');
            if (botao) botao.click();
        }''')
        
        # 2. Pequena espera e tentar clicar no OK do modal
        time.sleep(0.15)
        self.clicar_ok_modal()
        
        # 3. Aguardar lista aparecer (ao inves de sleep fixo)
        self.aguardar_lista_aparecer()
        return True
    
    def aguardar_lista_aparecer(self, timeout_ms=2000, intervalo_ms=100):
        """Aguarda a listagem de registros aparecer"""
        inicio = time.time()
        timeout_s = timeout_ms / 1000
        intervalo_s = intervalo_ms / 1000
        
        while (time.time() - inicio) < timeout_s:
            resultado = self.page.evaluate('''() => {
                const iframe = document.querySelector('#iframe_11');
                if (!iframe || !iframe.contentDocument) return false;
                const doc = iframe.contentDocument;
                
                // Verificar se a tabela de listagem está visível
                const tabela = doc.querySelector('.scGridTabela, table.scGridTabela, #grid_row_0');
                return !!tabela;
            }''')
            
            if resultado:
                return True
            
            time.sleep(intervalo_s)
        
        return False
    
    def processar_registro(self, indice, registro):
        """Processa um registro completo - VERSÃO COM PESQUISA DIRETA"""
        codigo = registro['pessoa']
        nome = registro.get('nome', 'N/A')
        
        logger.info(f"[{indice+1}/{self.estatisticas['total']}] Processando: {codigo} - {nome}")
        
        try:
            # 1. Pesquisar o código diretamente (muito mais rápido que paginação)
            self.pesquisar_codigo(codigo)
            
            # Verificar se houve erro na pesquisa
            erro_pesquisa = self.detectar_erro_modal()
            if erro_pesquisa:
                logger.warning(f"  ⚠ Erro na pesquisa: {erro_pesquisa[:80]}")
                self.clicar_ok_modal()
                time.sleep(0.3)
                # Tentar pesquisar novamente
                self.pesquisar_codigo(codigo)
            
            # 2. Verificar se o código EXATO está nos resultados e clicar em Editar
            encontrado, info = self.buscar_codigo_na_pagina(codigo)
            
            # Verificar se houve erro ao clicar em editar
            if info.get('erro'):
                logger.warning(f"  !! Erro ao editar: {info['erro'][:80]}")
                raise Exception(f"Erro ao abrir edicao: {info['erro'][:50]}")
            
            # 3. Se não encontrou, tentar paginação como fallback (pode ter muitos resultados)
            paginas_tentadas = 0
            while not encontrado and paginas_tentadas < 3:
                if not self.proxima_pagina():
                    break
                encontrado, info = self.buscar_codigo_na_pagina(codigo)
                paginas_tentadas += 1
            
            if not encontrado:
                self.estatisticas['nao_encontrados'] += 1
                raise Exception(f"Codigo {codigo} nao encontrado na pesquisa")
            
            logger.info(f"  Código {codigo} encontrado")
            
            self.preencher_campos(registro)
            self.salvar_cadastro(registro)  # Passa registro para tratar erro CPF
            self.voltar_listagem()
            
            self.estatisticas['sucessos'] += 1
            logger.info(f"  ✓ Registro {codigo} atualizado com sucesso")
            
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
            
            # Tentar fechar modal de erro se houver
            try:
                self.clicar_ok_modal()
            except:
                pass
            
            try:
                self.voltar_listagem()
            except:
                pass  # Sera tratado pelo retry
            
            return False
        
        finally:
            self.estatisticas['processados'] += 1
            time.sleep(Config.DELAY_ENTRE_REGISTROS)
    
    def processar_registro_com_retry(self, indice, registro, max_tentativas=3):
        """
        Processa registro com retry e reinicializacao completa do navegador.
        Tenta ate 3 vezes antes de desistir.
        """
        codigo = registro['pessoa']
        nome = registro.get('nome', 'N/A')
        
        # Guardar estatisticas antes para restaurar em caso de retry
        erros_antes = self.estatisticas['erros']
        processados_antes = self.estatisticas['processados']
        
        for tentativa in range(1, max_tentativas + 1):
            if tentativa > 1:
                # Restaurar estatisticas para evitar contagem duplicada
                self.estatisticas['erros'] = erros_antes
                self.estatisticas['processados'] = processados_antes
            
            try:
                sucesso = self.processar_registro(indice, registro)
                
                if sucesso:
                    return True
                else:
                    # Falhou mas sem exception - tentar novamente
                    if tentativa < max_tentativas:
                        logger.warning(f"  [RETRY {tentativa}/{max_tentativas}] Falha no registro {codigo}, reiniciando navegador...")
                        self.reiniciar_navegador()
                    else:
                        logger.error(f"  [DESISTINDO] Registro {codigo} falhou apos {max_tentativas} tentativas")
                        return False
                        
            except Exception as e:
                if tentativa < max_tentativas:
                    logger.warning(f"  [RETRY {tentativa}/{max_tentativas}] Erro: {str(e)[:50]}, reiniciando navegador...")
                    try:
                        self.reiniciar_navegador()
                    except Exception as reinit_error:
                        logger.error(f"  [ERRO REINICIO] {reinit_error}")
                        # Tentar fechar e reabrir completamente
                        self.fechar_navegador()
                        time.sleep(3)
                        self.iniciar_navegador()
                        self.fazer_login()
                        self.navegar_para_fornecedores()
                        self.ordenar_por_codigo()
                else:
                    logger.error(f"  [DESISTINDO] Registro {codigo} falhou apos {max_tentativas} tentativas: {e}")
                    return False
        
        return False
    
    def executar(self, inicio=0, fim=None):
        """
        Execução principal do robô.
        
        Args:
            inicio: Índice inicial (0-based)
            fim: Índice final (exclusivo), None = até o final
        """
        try:
            self.carregar_dados()
            self.iniciar_navegador()
            self.fazer_login()
            self.navegar_para_fornecedores()
            self.ordenar_por_codigo()
            
            # Definir range de processamento
            idx_inicio = max(inicio, self.progresso['ultimo_indice'])
            idx_fim = fim if fim is not None else len(self.dados)
            idx_fim = min(idx_fim, len(self.dados))
            
            logger.info(f"\n{'='*80}")
            logger.info(f"INICIANDO PROCESSAMENTO V4 - INSTÂNCIA [{self.instancia_id or 'principal'}]")
            logger.info(f"Total de registros na planilha: {len(self.dados)}")
            logger.info(f"Range desta instância: {inicio} - {idx_fim}")
            logger.info(f"Iniciando do índice: {idx_inicio}")
            logger.info(f"Registros a processar: {idx_fim - idx_inicio}")
            logger.info(f"{'='*80}\n")
            
            for idx in range(idx_inicio, idx_fim):
                self.processar_registro_com_retry(idx, self.dados.iloc[idx], max_tentativas=3)
            
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
        logger.info(f"  ⚠ Divergências: {self.estatisticas['divergencias']}")
        
        if self.estatisticas['processados'] > 0:
            taxa = (self.estatisticas['sucessos'] / self.estatisticas['processados']) * 100
            logger.info(f"  Taxa de sucesso: {taxa:.1f}%")
        
        logger.info(f"  Tempo total: {tempo_total}")
        
        # Salvar erros
        if self.erros:
            df_erros = pd.DataFrame(self.erros)
            df_erros.to_csv(Config.ARQUIVO_ERROS, index=False, encoding='utf-8-sig')
            logger.info(f"\n⚠ {len(self.erros)} erros salvos em {Config.ARQUIVO_ERROS}")
        
        # Salvar divergências
        if self.divergencias:
            df_diverg = pd.DataFrame(self.divergencias)
            df_diverg.to_csv(Config.ARQUIVO_DIVERGENCIAS, index=False, encoding='utf-8-sig')
            logger.info(f"\n⚠ {len(self.divergencias)} divergências salvas em {Config.ARQUIVO_DIVERGENCIAS}")
            logger.info("  > Analise este arquivo para verificar dados conflitantes!")
        
        self.salvar_progresso(self.estatisticas['processados'], 0)
        
        logger.info("\n✅ Finalizado!")


# ==============================================================================
# EXECUÇÃO
# ==============================================================================
if __name__ == "__main__":
    import sys
    
    # Parser de argumentos para suportar múltiplas instâncias
    parser = argparse.ArgumentParser(description='Robô de atualização de fornecedores')
    parser.add_argument('inicio', type=int, nargs='?', default=0, help='Índice inicial (0-based)')
    parser.add_argument('fim', type=int, nargs='?', default=None, help='Índice final (exclusivo)')
    parser.add_argument('--id', type=str, default='', help='ID da instância (para logs)')
    args = parser.parse_args()
    
    # Gerar ID da instância baseado no range
    instancia_id = args.id or f"{args.inicio}-{args.fim or 'fim'}"
    
    print("="*80)
    print(f"  ROBÔ V4 - INSTÂNCIA [{instancia_id}]")
    print("="*80)
    print()
    print("  MODO PARALELO:")
    print(f"  - Range: {args.inicio} até {args.fim or 'final'}")
    print(f"  - Arquivos: progresso_v4_{instancia_id}.json")
    print()
    print("  LÓGICA:")
    print("  1. Preenche CNPJ e aguarda auto-preenchimento do sistema")
    print("  2. Se o sistema JA preencheu endereco/contato > NAO sobrescreve")
    print("  3. Se os dados forem DIFERENTES > registra em divergencias_v4.csv")
    print("  4. Se estiver vazio > preenche com dados da planilha")
    print()
    print("="*80)
    
    print("\nIniciando em 3 segundos...")
    time.sleep(3)
    
    robo = RoboFornecedoresV4(instancia_id=instancia_id)
    robo.executar(inicio=args.inicio, fim=args.fim)

