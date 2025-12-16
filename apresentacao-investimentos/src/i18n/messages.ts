import type { AppLocale } from './locale';

export type MessageDict = Record<string, string>;

export const UI_MESSAGES: Record<AppLocale, MessageDict> = {
  'pt-BR': {
    // App / ações
    'tabs.dashboard': 'Dashboard',
    'tabs.analises': 'Análises',
    'actions.update': 'Atualizar',
    'actions.reload': 'Recarregar',
    'actions.retry': 'Tentar novamente',
    'actions.close': 'Fechar',
    'loading.data': 'Carregando dados financeiros...',
    'loading.analises': 'Carregando análises...',
    'empty.noData': 'Nenhum dado disponível',

    // Erros
    'error.load.title': 'Erro ao carregar dados',
    'error.load.analisesTitle': 'Não foi possível carregar a aba de análises.',
    'error.load.analisesHint':
      'Verifique se existem os arquivos movimentos_classificados.csv e pessoas_rescisao_fgts.csv em public/dados/.',

    // Header
    'header.titlePrefix': 'Relatório de ',
    'header.titleHighlight': 'Aplicação de Recursos',
    'header.subtitle': 'Processo de Recuperação Judicial',
    'header.period': 'Período:',
    'header.banks': 'Bancos: {banks}',
    'filters.banks.coreShort': '3 bancos',
    'filters.banks.allShort': 'Todos',
    'filters.banks.singleShort': 'banco',
    'filters.banks.multipleShort': 'bancos',
    'filters.banks.customShort': 'Filtrar',
    'filters.banks.coreLong': 'Bradesco, Unicredi, Inter',
    'filters.banks.allLong': 'Todos os bancos',
    'filters.banks.customLong': 'Selecionar bancos específicos',
    'filters.banks.selectMultiple': 'Selecione os bancos:',
    'filters.banks.clearSelection': 'Limpar seleção',
    'filters.currency.brlLong': 'Real (BRL)',
    'filters.currency.eurLong': 'Euro (EUR)',
    'filters.currency.rate': 'Taxa: 1 EUR =',

    // Seções principais
    'section.origem.title': 'Origem dos Recursos',
    'section.origem.subtitle': 'Distribuição dos aportes recebidos para o processo de recuperação',
    'section.destino.title': 'Destino dos Recursos',
    'section.destino.subtitle': 'Para onde os recursos foram direcionados (clique nas barras para detalhes)',
    'section.fluxo.title': 'Fluxo Financeiro',
    'section.fluxo.subtitle': 'Evolução diária de entradas e saídas',
    'section.lancamentos.title': 'Lançamentos Detalhados',
    'section.lancamentos.subtitle': 'Todos os movimentos financeiros do período',

    // KPIs
    'kpi.totalAportes': 'Total Aportado',
    'kpi.totalAportes.subtitle': 'Brivio + IANCO',
    'kpi.brivio': 'Aporte Família Brivio',
    'kpi.brivio.subtitle': 'via Câmbio',
    'kpi.ianco': 'Aporte IANCO / Usifix',
    'kpi.ianco.subtitle': 'via PIX',
    'kpi.vendas': 'Vendas no Período',
    'kpi.vendas.subtitle': 'Produtos e Serviços',

    // Origens (labels)
    'origens.brivio.nome': 'Família Brivio',
    'origens.brivio.desc': 'Câmbio Financeiro - Itália',
    'origens.ianco.nome': 'IANCO / Usifix',
    'origens.ianco.desc': 'PIX via Usifix',

    // Charts
    'chart.origem.title': 'Origem dos Recursos',
    'chart.total': 'Total',
    'chart.destino.title': 'Destino dos Recursos por Categoria',
    'chart.destino.topN': 'Top {n} categorias',
    'chart.items': 'itens',
    'chart.fluxo.title': 'Fluxo Financeiro Diário',
    'chart.entradas': 'Entradas',
    'chart.saidas': 'Saídas',
    'chart.totalEntradas': 'Total Entradas',
    'chart.totalSaidas': 'Total Saídas',
    'chart.saldoFinal': 'Saldo Final',
    'chart.saldoConta': 'Saldo em Conta',

    // Tooltip
    'tooltip.clickDetalhes': 'Clique para ver detalhes',
    'tooltip.valor': 'Valor',
    'tooltip.percentual': 'Percentual',
    'tooltip.data': 'Data',
    'tooltip.total': 'Total',
    'tooltip.lancamentos': 'Lançamentos',
    'tooltip.maioresPagamentos': 'Maiores pagamentos:',
    'tooltip.saldo': 'Saldo',

    // Aportes (overlay KPI)
    'aportes.modal.aboutTitle': 'Sobre este KPI',
    'aportes.modal.criteriaTitle': 'Critérios de identificação',
    'aportes.modal.recordsTitle': 'Lançamentos que compõem o valor',
    'aportes.modal.noRecords': 'Nenhum lançamento encontrado com os critérios atuais.',
    'aportes.modal.bankScope': 'Filtro de bancos: {scope}',
    'aportes.modal.total.about':
      'Soma de todos os créditos identificados como aporte de capital no período (Brivio + IANCO/Usifix).',
    'aportes.modal.brivio.about':
      'Entrada de capital da Família Brivio (Itália), registrada no extrato como câmbio/aporte.',
    'aportes.modal.ianco.about':
      'Aportes realizados pela IANCO/Usifix, registrados no extrato como “Usifix”/“Aporte”.',
    'aportes.modal.total.criteria1': 'Considera apenas lançamentos de crédito na categoria de Aporte de Capital (ID 79).',
    'aportes.modal.total.criteria2':
      'Classifica o crédito como Brivio (câmbio/valor alto) ou IANCO/Usifix (Usifix/Aporte).',
    'aportes.modal.brivio.criteria1': 'Categoria de Aporte de Capital (ID 79) e crédito > 0.',
    'aportes.modal.brivio.criteria2': 'Histórico contém “Câmbio” (sem acento) ou crédito > 3.000.000.',
    'aportes.modal.ianco.criteria1': 'Categoria de Aporte de Capital (ID 79) e crédito > 0.',
    'aportes.modal.ianco.criteria2': 'Histórico contém “Usifix” ou “Aporte”.',
    'aportes.modal.ianco.criteria3': 'Exclui lançamentos já identificados como Brivio (evita duplicidade).',

    // Vendas (overlay KPI)
    'vendas.modal.aboutTitle': 'Sobre este KPI',
    'vendas.modal.criteriaTitle': 'Critérios de identificação',
    'vendas.modal.recordsTitle': 'Lançamentos que compõem o valor',
    'vendas.modal.noRecords': 'Nenhum lançamento encontrado com os critérios atuais.',
    'vendas.modal.bankScope': 'Filtro de bancos: {scope}',
    'vendas.modal.about':
      'Entradas de vendas no período, considerando apenas créditos nas categorias Venda de Produtos (ID 3) e Venda de Serviços (ID 4).',
    'vendas.modal.criteria1': 'Categoria: Venda de Produtos (ID 3) ou Venda de Serviços (ID 4).',
    'vendas.modal.criteria2': 'Somente lançamentos com Crédito > 0 (entradas).',
    'vendas.modal.criteria3': 'Não inclui aportes/transferências — apenas vendas.',
    'vendas.modal.produtos': 'Venda de Produtos',
    'vendas.modal.servicos': 'Venda de Serviços',

    // Modal
    'modal.totalCategoria': 'Total da Categoria',
    'modal.lancamentosCount': '{n} lançamentos',
    'modal.fluxo.title': 'Movimentações do Dia',
    'modal.fluxo.movimentos': 'movimentações',
    'modal.fluxo.saldoDia': 'Saldo do Dia',
    'table.tipo.entrada': 'Entrada',
    'table.tipo.saida': 'Saída',

    // Tabela movimentos
    'table.mov.title': 'Todos os Lançamentos',
    'table.search': 'Buscar...',
    'table.showing': 'Mostrando {shown} de {total} lançamentos',
    'table.page': 'Página {page} de {pages}',
    'table.perPage': '{n} por página',
    'table.col.data': 'Data',
    'table.col.tipo': 'Tipo',
    'table.col.credito': 'Crédito',
    'table.col.debito': 'Débito',
    'table.col.categoria': 'Categoria',
    'table.col.historico': 'Histórico',
    'table.col.banco': 'Banco',
    'table.col.valor': 'Valor',
    'table.col.documento': 'Documento',

    // Overlay (controles de lista)
    'overlay.sortBy': 'Ordenar por',
    'overlay.sort.valor': 'Valor',
    'overlay.sort.data': 'Data',
    'overlay.sort.descricao': 'Descrição',
    'overlay.sort.asc': 'Crescente',
    'overlay.sort.desc': 'Decrescente',
    'overlay.results': 'Mostrando {shown} de {total}',
    'overlay.view.list': 'Lista',
    'overlay.view.chart': 'Gráficos',

    // Aba análises
    'analises.title': 'Análises',
    'analises.subtitle':
      'Recorrência, extraordinários, transferências e correlação de pessoas (Rescisão × FGTS)',
    'analises.kpi.saidasOperacionais': 'Saídas Operacionais',
    'analises.kpi.saidasOperacionais.subtitle': 'Custo (exclui transferências/implantação)',
    'analises.kpi.transferencias': 'Transferências Internas',
    'analises.kpi.transferencias.subtitle': 'Débitos (movimentação, não custo)',
    'analises.kpi.implantacaoSaldo': 'Implantação de Saldo',
    'analises.kpi.implantacaoSaldo.subtitle': 'Ajustes (não operacional)',
    'analises.kpi.pessoasComum': 'Pessoas em comum',
    'analises.kpi.pessoasComum.subtitle': 'Rescisão e FGTS identificáveis',
    'analises.resumoRapido': 'Resumo rápido',
    'analises.resumo.entradasTotais': 'Entradas totais',
    'analises.resumo.saidasTotais': 'Saídas totais',
    'analises.resumo.saldoPeriodo': 'Saldo do período',
    'analises.resumo.saldoOperacional': 'Saldo operacional (aprox.)',
    'analises.resumo.transferenciasCredito': 'Transferências (crédito)',
    'analises.dica':
      'Dica: “Saídas operacionais” é o melhor número para estimar o custo do negócio sem ruído de caixa.',
    'analises.topRecorrentes': 'Top recorrentes (operacional)',
    'analises.semRecorrentes': 'Sem recorrentes detectados.',
    'analises.meses': 'meses',

    // Pessoas rescisão
    'pessoas.title': 'Pessoas — Rescisão × FGTS',
    'pessoas.subtitle': 'Correlação por pessoa (quando o nome aparece no lançamento)',
    'pessoas.search': 'Buscar pessoa...',
    'pessoas.onlyCommon': 'Somente em comum',
    'pessoas.col.pessoa': 'Pessoa',
    'pessoas.col.rescisao': 'Rescisão',
    'pessoas.col.fgts': 'FGTS',
    'pessoas.col.acoes': 'Ações',
    'pessoas.col.total': 'Total',
    'pessoas.col.parcelas': 'Parcelas',
    'pessoas.nota':
      'Nota: grande parte do FGTS de rescisão aparece como genérico (“FGTS Rescisão”), sem pessoa identificável no extrato.',

    // Overlay charts
    'overlay.chart.title': 'Visualização Gráfica',
    'overlay.chart.pie': 'Pizza',
    'overlay.chart.bar': 'Barras',
    'overlay.chart.barPercent': 'Barras %',
    'overlay.chart.byDesc': 'Por descrição',
    'overlay.chart.byDay': 'Por dia',
    'overlay.chart.byMonth': 'Por mês',
    'overlay.chart.total': 'Total',
    'overlay.chart.groups': 'grupos',
    'overlay.chart.showing': 'exibindo',
    'chart.outros': 'Outros',

    // Table filters & totals
    'table.filters.title': 'Filtros',
    'table.filters.categoria': 'Categoria',
    'table.filters.banco': 'Banco',
    'table.filters.tipo': 'Tipo',
    'table.filters.valorMin': 'Valor mín',
    'table.filters.valorMax': 'Valor máx',
    'table.filters.dataInicio': 'Data início',
    'table.filters.dataFim': 'Data fim',
    'table.filters.all': 'Todos',
    'table.filters.clear': 'Limpar filtros',
    'table.filters.advanced': 'Filtros avançados',
    'table.contextMenu.dateRange': 'Filtrar por Período',
    'table.contextMenu.valueRange': 'Filtrar por Valor',
    'table.filters.quick': 'Filtros rápidos',
    'table.select.all': 'Selec. todos',
    'table.select.none': 'Desmarcar',
    'table.select.visible': 'Selec. visíveis',
    'table.totals.geral': 'Total Geral',
    'table.totals.exibido': 'Total Exibido',
    'table.totals.selecionado': 'Total Selecionado',
    'table.totals.ofTotal': 'do total',
    'table.totals.ofDisplayed': 'do exibido',
    'table.totals.itens': 'itens',
    'table.totals.selected': 'selecionados',

    // Footer
    'footer.generated': 'Relatório gerado automaticamente • Dados do período {inicio} a {fim}',
  },

  'it-IT': {
    // App / azioni
    'tabs.dashboard': 'Dashboard',
    'tabs.analises': 'Analisi',
    'actions.update': 'Aggiorna',
    'actions.reload': 'Ricarica',
    'actions.retry': 'Riprova',
    'actions.close': 'Chiudi',
    'loading.data': 'Caricamento dei dati finanziari...',
    'loading.analises': 'Caricamento analisi...',
    'empty.noData': 'Nessun dato disponibile',

    // Errori
    'error.load.title': 'Errore nel caricamento dei dati',
    'error.load.analisesTitle': 'Impossibile caricare la sezione analisi.',
    'error.load.analisesHint':
      'Verifica che esistano i file movimentos_classificados.csv e pessoas_rescisao_fgts.csv in public/dados/.',

    // Header
    'header.titlePrefix': 'Report sull’',
    'header.titleHighlight': 'impiego delle risorse',
    'header.subtitle': 'Procedura di Recuperação Judicial (Brasile)',
    'header.period': 'Periodo:',
    'header.banks': 'Banche: {banks}',
    'filters.banks.coreShort': '3 banche',
    'filters.banks.allShort': 'Tutte',
    'filters.banks.singleShort': 'banca',
    'filters.banks.multipleShort': 'banche',
    'filters.banks.customShort': 'Filtra',
    'filters.banks.coreLong': 'Bradesco, Unicredi, Inter',
    'filters.banks.allLong': 'Tutte le banche',
    'filters.banks.customLong': 'Seleziona banche specifiche',
    'filters.banks.selectMultiple': 'Seleziona le banche:',
    'filters.banks.clearSelection': 'Cancella selezione',
    'filters.currency.brlLong': 'Real (BRL)',
    'filters.currency.eurLong': 'Euro (EUR)',
    'filters.currency.rate': 'Tasso: 1 EUR =',

    // Sezioni principali
    'section.origem.title': 'Origine dei fondi',
    'section.origem.subtitle': 'Distribuzione degli apporti ricevuti per la procedura di ristrutturazione',
    'section.destino.title': 'Destinazione dei fondi',
    'section.destino.subtitle': 'Dove sono stati destinati i fondi (clicca sulle barre per i dettagli)',
    'section.fluxo.title': 'Flusso finanziario',
    'section.fluxo.subtitle': 'Andamento giornaliero di entrate e uscite',
    'section.lancamentos.title': 'Movimenti dettagliati',
    'section.lancamentos.subtitle': 'Tutti i movimenti finanziari del periodo',

    // KPI
    'kpi.totalAportes': 'Totale apporti',
    'kpi.totalAportes.subtitle': 'Brivio + IANCO',
    'kpi.brivio': 'Apporto Famiglia Brivio',
    'kpi.brivio.subtitle': 'via cambio',
    'kpi.ianco': 'Apporto IANCO / Usifix',
    'kpi.ianco.subtitle': 'via PIX',
    'kpi.vendas': 'Vendite nel periodo',
    'kpi.vendas.subtitle': 'Prodotti e servizi',

    // Origini (labels)
    'origens.brivio.nome': 'Famiglia Brivio',
    'origens.brivio.desc': 'Cambio finanziario – Italia',
    'origens.ianco.nome': 'IANCO / Usifix',
    'origens.ianco.desc': 'PIX tramite Usifix',

    // Grafici
    'chart.origem.title': 'Origine dei fondi',
    'chart.total': 'Totale',
    'chart.destino.title': 'Destinazione dei fondi per categoria',
    'chart.destino.topN': 'Top {n} categorie',
    'chart.items': 'voci',
    'chart.fluxo.title': 'Flusso finanziario giornaliero',
    'chart.entradas': 'Entrate',
    'chart.saidas': 'Uscite',
    'chart.totalEntradas': 'Totale entrate',
    'chart.totalSaidas': 'Totale uscite',
    'chart.saldoFinal': 'Saldo finale',
    'chart.saldoConta': 'Saldo in conto',

    // Tooltip
    'tooltip.clickDetalhes': 'Clicca per vedere i dettagli',
    'tooltip.valor': 'Valore',
    'tooltip.percentual': 'Percentuale',
    'tooltip.data': 'Data',
    'tooltip.total': 'Totale',
    'tooltip.lancamentos': 'Movimenti',
    'tooltip.maioresPagamentos': 'Pagamenti maggiori:',
    'tooltip.saldo': 'Saldo',

    // Apporti (overlay KPI)
    'aportes.modal.aboutTitle': 'Su questo KPI',
    'aportes.modal.criteriaTitle': 'Criteri di identificazione',
    'aportes.modal.recordsTitle': 'Movimenti che compongono il valore',
    'aportes.modal.noRecords': 'Nessun movimento trovato con i criteri attuali.',
    'aportes.modal.bankScope': 'Filtro banche: {scope}',
    'aportes.modal.total.about':
      'Somma di tutti i crediti identificati come apporto di capitale nel periodo (Brivio + IANCO/Usifix).',
    'aportes.modal.brivio.about':
      'Apporto di capitale della Famiglia Brivio (Italia), registrato nell’estratto come cambio/apporto.',
    'aportes.modal.ianco.about':
      'Apporti effettuati da IANCO/Usifix, registrati nell’estratto come “Usifix”/“Aporte”.',
    'aportes.modal.total.criteria1': 'Considera solo movimenti in credito nella categoria Apporto di capitale (ID 79).',
    'aportes.modal.total.criteria2':
      'Classifica il credito come Brivio (cambio/valore alto) o IANCO/Usifix (Usifix/Aporte).',
    'aportes.modal.brivio.criteria1': 'Categoria Apporto di capitale (ID 79) e credito > 0.',
    'aportes.modal.brivio.criteria2': 'Causale contiene “Câmbio” (senza accenti) o credito > 3.000.000.',
    'aportes.modal.ianco.criteria1': 'Categoria Apporto di capitale (ID 79) e credito > 0.',
    'aportes.modal.ianco.criteria2': 'Causale contiene “Usifix” o “Aporte”.',
    'aportes.modal.ianco.criteria3': 'Esclude i movimenti già identificati come Brivio (evita duplicazioni).',

    // Vendite (overlay KPI)
    'vendas.modal.aboutTitle': 'Su questo KPI',
    'vendas.modal.criteriaTitle': 'Criteri di identificazione',
    'vendas.modal.recordsTitle': 'Movimenti che compongono il valore',
    'vendas.modal.noRecords': 'Nessun movimento trovato con i criteri attuali.',
    'vendas.modal.bankScope': 'Filtro banche: {scope}',
    'vendas.modal.about':
      'Entrate da vendite nel periodo, considerando solo crediti nelle categorie Vendita di prodotti (ID 3) e Vendita di servizi (ID 4).',
    'vendas.modal.criteria1': 'Categoria: Vendita di prodotti (ID 3) o Vendita di servizi (ID 4).',
    'vendas.modal.criteria2': 'Solo movimenti con Credito > 0 (entrate).',
    'vendas.modal.criteria3': 'Esclude apporti/trasferimenti — solo vendite.',
    'vendas.modal.produtos': 'Vendita di prodotti',
    'vendas.modal.servicos': 'Vendita di servizi',

    // Modal
    'modal.totalCategoria': 'Totale categoria',
    'modal.lancamentosCount': '{n} movimenti',
    'modal.fluxo.title': 'Movimenti del Giorno',
    'modal.fluxo.movimentos': 'movimenti',
    'modal.fluxo.saldoDia': 'Saldo del Giorno',
    'table.tipo.entrada': 'Entrata',
    'table.tipo.saida': 'Uscita',

    // Tabella movimenti
    'table.mov.title': 'Tutti i movimenti',
    'table.search': 'Cerca...',
    'table.showing': 'Mostrando {shown} di {total} movimenti',
    'table.page': 'Pagina {page} di {pages}',
    'table.perPage': '{n} per pagina',
    'table.col.data': 'Data',
    'table.col.tipo': 'Tipo',
    'table.col.credito': 'Credito',
    'table.col.debito': 'Debito',
    'table.col.categoria': 'Categoria',
    'table.col.historico': 'Causale',
    'table.col.banco': 'Banca',
    'table.col.valor': 'Valore',
    'table.col.documento': 'Documento',

    // Overlay (controlli lista)
    'overlay.sortBy': 'Ordina per',
    'overlay.sort.valor': 'Valore',
    'overlay.sort.data': 'Data',
    'overlay.sort.descricao': 'Descrizione',
    'overlay.sort.asc': 'Crescente',
    'overlay.sort.desc': 'Decrescente',
    'overlay.results': 'Mostrati {shown} di {total}',
    'overlay.view.list': 'Lista',
    'overlay.view.chart': 'Grafici',

    // Scheda analisi
    'analises.title': 'Analisi',
    'analises.subtitle': 'Ricorrenza, straordinari, trasferimenti e correlazione persone (Liquidazione × FGTS)',
    'analises.kpi.saidasOperacionais': 'Uscite operative',
    'analises.kpi.saidasOperacionais.subtitle': 'Costi (esclude trasferimenti/inserimento saldo)',
    'analises.kpi.transferencias': 'Trasferimenti interni',
    'analises.kpi.transferencias.subtitle': 'Addebiti (movimento di cassa, non costo)',
    'analises.kpi.implantacaoSaldo': 'Inserimento saldo',
    'analises.kpi.implantacaoSaldo.subtitle': 'Rettifiche (non operativo)',
    'analises.kpi.pessoasComum': 'Persone in comune',
    'analises.kpi.pessoasComum.subtitle': 'Liquidazione e FGTS identificabili',
    'analises.resumoRapido': 'Sintesi rapida',
    'analises.resumo.entradasTotais': 'Entrate totali',
    'analises.resumo.saidasTotais': 'Uscite totali',
    'analises.resumo.saldoPeriodo': 'Saldo del periodo',
    'analises.resumo.saldoOperacional': 'Saldo operativo (stima)',
    'analises.resumo.transferenciasCredito': 'Trasferimenti (credito)',
    'analises.dica':
      'Suggerimento: “Uscite operative” è il numero migliore per stimare il costo del business senza rumore di cassa.',
    'analises.topRecorrentes': 'Top ricorrenti (operativo)',
    'analises.semRecorrentes': 'Nessun ricorrente rilevato.',
    'analises.meses': 'mesi',

    // Persone liquidazione
    'pessoas.title': 'Persone — Liquidazione × FGTS',
    'pessoas.subtitle': 'Correlazione per persona (quando il nome appare nel movimento)',
    'pessoas.search': 'Cerca persona...',
    'pessoas.onlyCommon': 'Solo in comune',
    'pessoas.col.pessoa': 'Persona',
    'pessoas.col.rescisao': 'Liquidazione',
    'pessoas.col.fgts': 'FGTS',
    'pessoas.col.acoes': 'Cause',
    'pessoas.col.total': 'Totale',
    'pessoas.col.parcelas': 'Rate',
    'pessoas.nota':
      'Nota: gran parte del FGTS di liquidazione appare come generico (“FGTS Rescisão”), senza persona identificabile nell’estratto.',

    // Overlay charts
    'overlay.chart.title': 'Visualizzazione grafica',
    'overlay.chart.pie': 'Torta',
    'overlay.chart.bar': 'Barre',
    'overlay.chart.barPercent': 'Barre %',
    'overlay.chart.byDesc': 'Per descrizione',
    'overlay.chart.byDay': 'Per giorno',
    'overlay.chart.byMonth': 'Per mese',
    'overlay.chart.total': 'Totale',
    'overlay.chart.groups': 'gruppi',
    'overlay.chart.showing': 'visualizzazione',
    'chart.outros': 'Altri',

    // Table filters & totals
    'table.filters.title': 'Filtri',
    'table.filters.categoria': 'Categoria',
    'table.filters.banco': 'Banca',
    'table.filters.tipo': 'Tipo',
    'table.filters.valorMin': 'Valore min',
    'table.filters.valorMax': 'Valore max',
    'table.filters.dataInicio': 'Data inizio',
    'table.filters.dataFim': 'Data fine',
    'table.filters.all': 'Tutti',
    'table.filters.clear': 'Cancella filtri',
    'table.filters.advanced': 'Filtri avanzati',
    'table.contextMenu.dateRange': 'Filtra per Periodo',
    'table.contextMenu.valueRange': 'Filtra per Valore',
    'table.filters.quick': 'Filtri rapidi',
    'table.select.all': 'Selez. tutti',
    'table.select.none': 'Deseleziona',
    'table.select.visible': 'Selez. visibili',
    'table.totals.geral': 'Totale generale',
    'table.totals.exibido': 'Totale visualizzato',
    'table.totals.selecionado': 'Totale selezionato',
    'table.totals.ofTotal': 'del totale',
    'table.totals.ofDisplayed': 'del visualizzato',
    'table.totals.itens': 'voci',
    'table.totals.selected': 'selezionati',

    // Footer
    'footer.generated': 'Report generato automaticamente • Dati dal {inicio} al {fim}',
  },
};


