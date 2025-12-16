### Análise de redução de custos recorrentes — Novembro/2025

#### Objetivo
Comparar os **planos de contas** em **Novembro/2025** contra a **média anual** (base histórica do DRE antigo).
- **Média anual (Jan–Set/2025)** vs **Novembro/2025**

#### Dados utilizados
- **DRE antigo**: `JAN - SET 2025.xlsx` (aba `Export`)
- **Novo plano**: `MENSAL NOV - DEZ 2025.xlsx` (aba `Consulta`)
- **Média anual**: média mensal calculada com base em [202501, 202502, 202503, 202504, 202505, 202506, 202507, 202508, 202509] (meses disponíveis no DRE antigo).
- **Gap**: não há dados de **Outubro/2025** no conjunto recebido.

#### Metodologia (Python)
- **Sinal**: despesas vêm negativas nas planilhas; convertemos para **gasto positivo** (gasto = -valor).
- **Mapeamento**: categorias do DRE antigo foram alinhadas ao novo plano via regras por **grupo/conta** e **código**.
- **Recorrência (pessoal)**: separamos **não recorrentes** (13º, rescisões/indenizações, ações trabalhistas) para não distorcer o indicador.

#### Resultado consolidado (plano de contas; recorrente; itens com base mapeada)
- **Média anual (Jan–Set/2025)**: R$ 1.807.753,56
- **Novembro/2025**: R$ 1.260.885,19
- **Diferença (Média − Novembro)**: R$ 546.868,37 (30,3%)

#### Detalhamento no formato do plano de contas (Nov/Dez) — contas analisadas
Tabela organizada pelos **códigos/descrições** do plano de contas (Nov/Dez), com base histórica do DRE antigo quando há mapeamento.

| codigo | desc | tipo | Média anual (Jan–Set/2025) | Novembro | Diferença (Média − Novembro) | % vs Média |
| --- | --- | --- | --- | --- | --- | --- |
| 1.3.01 | FGTS | Recorrente | R$ 45.976,16 | R$ 76.891,48 | R$ -30.915,32 | -67,2% |
| 1.3.01.1 | FGTS Rescisao | Não recorrente | - | R$ 818.898,02 | - | - |
| 1.3.02 | INSS | Recorrente | R$ 127.277,65 | R$ 0,00 | R$ 127.277,65 | 100,0% |
| 1.3.03 | Salarios | Recorrente | R$ 451.342,90 | R$ 385.134,46 | R$ 66.208,44 | 14,7% |
| 1.3.03.1 | Salarios Rescisao | Não recorrente | - | R$ 1.065.450,93 | - | - |
| 1.3.05 | Seguro Funcionarios | Recorrente | R$ 10.841,26 | R$ 1.025,86 | R$ 9.815,40 | 90,5% |
| 1.3.06 | Adiantamento de Salario | Recorrente | - | R$ 155.202,53 | - | - |
| 1.3.09 | 13º Salario | Não recorrente | R$ 39.857,89 | R$ 11.716,10 | R$ 28.141,79 | 70,6% |
| 1.3.10 | Vale Transporte | Recorrente | R$ 719,80 | R$ 2.737,56 | R$ -2.017,76 | -280,3% |
| 1.3.13 | Alimentaçao | Recorrente | R$ 30.667,87 | R$ 53.347,95 | R$ -22.680,08 | -74,0% |
| 1.3.14 | Comissao | Recorrente | R$ 45.360,86 | R$ 0,00 | R$ 45.360,86 | 100,0% |
| 1.3.15 | Ferias 1/3" - 10 Dias | Recorrente | R$ 65.656,97 | R$ 0,00 | R$ 65.656,97 | 100,0% |
| 1.3.17 | Pro Labore | Recorrente | R$ 30.518,11 | R$ 0,00 | R$ 30.518,11 | 100,0% |
| 1.3.18 | Ações Trabalhistas | Não recorrente | - | R$ 200.000,00 | - | - |
| 1.3.19 | PLANO DE SAÚDE | Recorrente | R$ 36.350,91 | R$ 35.204,95 | R$ 1.145,96 | 3,2% |
| 1.4.02 | Despesas Financeiras | Recorrente | R$ 438.046,74 | R$ 515.452,05 | R$ -77.405,31 | -17,7% |
| 1.4.03 | Fretes | Recorrente | R$ 14.979,62 | R$ 251,57 | R$ 14.728,05 | 98,3% |
| 1.4.04 | Sistema Octus | Recorrente | - | R$ 2.000,00 | - | - |
| 1.4.05 | Informatica | Recorrente | - | R$ 1.527,58 | - | - |
| 1.4.06 | Vigilancia | Recorrente | R$ 21.005,86 | R$ 4.550,00 | R$ 16.455,86 | 78,3% |
| 1.4.08 | Pedagio | Recorrente | - | R$ 745,55 | - | - |
| 1.4.10 | Aluguel | Recorrente | R$ 42.488,89 | R$ 52.200,00 | R$ -9.711,11 | -22,9% |
| 1.4.11 | Despesas Administrativas | Recorrente | R$ 124.478,69 | R$ 68.066,00 | R$ 56.412,69 | 45,3% |
| 1.4.12 | Telefonia/Fixa/Movel/Internet | Recorrente | R$ 6.160,19 | R$ 1.599,32 | R$ 4.560,87 | 74,0% |
| 1.4.13 | Agua | Recorrente | R$ 4.612,04 | R$ 6.837,43 | R$ -2.225,39 | -48,3% |
| 1.4.14 | Luz | Recorrente | R$ 18.302,78 | R$ 27.086,89 | R$ -8.784,11 | -48,0% |
| 1.4.15 | Seguros | Recorrente | R$ 1.642,26 | R$ 155,40 | R$ 1.486,86 | 90,5% |
| 1.4.18 | Despesas com Viagem | Recorrente | R$ 65.779,95 | R$ 12.747,96 | R$ 53.031,99 | 80,6% |
| 1.4.22 | Honorários Advocatícios/Consultoria | Recorrente | R$ 176.417,55 | R$ 0,00 | R$ 176.417,55 | 100,0% |
| 1.5.01 | Manutençao Predial | Recorrente | R$ 15.954,21 | R$ 5.709,64 | R$ 10.244,57 | 64,2% |
| 1.5.02 | Manutençao de Veiculos | Recorrente | R$ 0,00 | R$ 0,00 | R$ 0,00 | - |
| 1.5.03 | Manutençao de Maquinas e Equipamentos | Recorrente | R$ 33.153,89 | R$ 11.865,00 | R$ 21.288,89 | 64,2% |
| 2.2.01 | Emprestimos/Parcelas | Fora do escopo | - | R$ 27.996,51 | - | - |
| 2.2.02 | Juros Bancarios | Recorrente | R$ 17,52 | R$ 20,61 | R$ -3,09 | -17,7% |
| 2.2.03 | IOF | Recorrente | R$ 0,90 | R$ 1,06 | R$ -0,16 | -17,7% |

#### Itens não recorrentes (contexto)
Esses valores aparecem no plano em Novembro e **não devem** ser usados como indicador de custo recorrente.
| codigo | desc | tipo | Média anual (Jan–Set/2025) | Novembro | Diferença (Média − Novembro) | % vs Média |
| --- | --- | --- | --- | --- | --- | --- |
| 1.3.01.1 | FGTS Rescisao | Não recorrente | - | R$ 818.898,02 | - | - |
| 1.3.03.1 | Salarios Rescisao | Não recorrente | - | R$ 1.065.450,93 | - | - |
| 1.3.09 | 13º Salario | Não recorrente | R$ 39.857,89 | R$ 11.716,10 | R$ 28.141,79 | 70,6% |
| 1.3.18 | Ações Trabalhistas | Não recorrente | - | R$ 200.000,00 | - | - |

#### Itens fora do escopo (não são custo recorrente)
Itens como **amortização de principal** (empréstimos/parcelas) não representam despesa recorrente e foram excluídos do consolidado.
| codigo | desc | tipo | Média anual (Jan–Set/2025) | Novembro | Diferença (Média − Novembro) | % vs Média |
| --- | --- | --- | --- | --- | --- | --- |
| 2.2.01 | Emprestimos/Parcelas | Fora do escopo | - | R$ 27.996,51 | - | - |

#### Observações
- Algumas linhas podem estar **zeradas** em Novembro por **competência/lançamento** (ex.: consultorias). Recomenda-se validar com o financeiro.
- O mapeamento completo e as regras estão no Excel de saída (aba `mapeamento_regras`).
- **Empréstimos/Parcelas (2.2.01)** foi tratado como **fora do escopo** (amortização de principal), não entra como custo recorrente.

#### Resumo por categoria do plano de contas (no final)
| cat2 | categoria | Média anual (Jan–Set/2025) | Novembro | Diferença (Média − Novembro) | % vs Média |
| --- | --- | --- | --- | --- | --- |
| 1.3 | FUNCIONARIOS | R$ 844.712,47 | R$ 554.342,26 | R$ 290.370,21 | 34,4% |
| 1.4 | DESPESAS | R$ 913.914,57 | R$ 688.946,62 | R$ 224.967,95 | 24,6% |
| 1.5 | MANUTENÇOES | R$ 49.108,10 | R$ 17.574,64 | R$ 31.533,46 | 64,2% |
| 2.2 | ENDIVIDAMENTO | R$ 18,42 | R$ 21,67 | R$ -3,25 | -17,7% |