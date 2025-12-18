import type { AppLocale } from './locale';

const GRUPOS_IT: Record<string, string> = {
  // Trabalhista
  'FGTS Rescisão': 'FGTS – liquidazione',
  'Salários Rescisão': 'Salari – liquidazione',
  'Ações Trabalhistas': 'Cause di lavoro',
  'Folha de Pagamento': 'Buste paga',
  '13º Salário': 'Tredicesima',
  'Adiantamento Salário': 'Anticipo stipendio',
  'FGTS Mensal': 'FGTS mensile',
  'Vale Transporte': 'Buono trasporto',
  'Alimentação': 'Buono pasto',
  'Plano de Saúde': 'Piano sanitario',
  'Seguro Funcionários': 'Assicurazione dipendenti',
  'Segurança Trabalho': 'Sicurezza sul lavoro',

  // Financeiro
  'Despesas Financeiras': 'Spese finanziarie',
  'Empréstimos/Parcelas': 'Prestiti / rate',
  'Juros Bancários': 'Interessi bancari',
  'IOF': 'IOF',
  'Retirada Sócios': 'Prelievi dei soci',

  // Compras / fornecedores
  'Matéria Prima': 'Materie prime',
  'Serviços': 'Servizi',
  'Insumos': 'Materiali di consumo',
  'Importação': 'Importazioni',
  'Fretes Compras': 'Trasporti acquisti',
  'Fretes': 'Trasporti',
  'Máquinas/Equipamentos': 'Macchinari / attrezzature',
  'Devoluções': 'Resi',

  // Operacional
  'Manutenção Predial': 'Manutenzione edificio',
  'Manutenção Máquinas': 'Manutenzione macchinari',
  'Aluguel': 'Affitto',
  'Vigilância': 'Vigilanza',
  'Energia Elétrica': 'Energia elettrica',
  'Água': 'Acqua',
  'Telefonia/Internet': 'Telefonia / Internet',
  'Seguros': 'Assicurazioni',
  'Veículos': 'Veicoli',
  'Pedágio': 'Pedaggio',

  // Administrativo
  'Desp. Administrativas': 'Spese amministrative',
  'Contabilidade': 'Contabilità',
  'Honorários/Consultoria': 'Compensi / consulenza',
  'Informática': 'Informatica (IT)',
  'Sistema Octus': 'Sistema Octus',
  'Viagens': 'Viaggi',
  'Custos RJ': 'Costi RJ',

  // Outros / fallback
  'Implantaçao de Saldo': 'Inserimento saldo',
  'Outras Despesas': 'Altre spese',
};

const TIPO_IT: Record<string, string> = {
  Receber: 'Entrata',
  Pagar: 'Uscita',
  'Transferências': 'Trasferimenti',
  'Movto.Financeiro': 'Movimento finanziario',
};

const CLASSE_RECORRENCIA_IT: Record<string, string> = {
  recorrente_forte: 'ricorrente (forte)',
  recorrente_frequente: 'ricorrente (frequente)',
  nao_recorrente: 'non ricorrente',
};

export function translateGrupo(grupo: string, locale: AppLocale): string {
  if (locale !== 'it-IT') return grupo;
  return GRUPOS_IT[grupo] ?? grupo;
}

export function translateTipoMovimento(tipo: string, locale: AppLocale): string {
  if (locale !== 'it-IT') return tipo;
  return TIPO_IT[tipo] ?? tipo;
}

export function translateClasseRecorrencia(classe: string, locale: AppLocale): string {
  if (locale !== 'it-IT') return classe;
  return CLASSE_RECORRENCIA_IT[classe] ?? classe;
}




