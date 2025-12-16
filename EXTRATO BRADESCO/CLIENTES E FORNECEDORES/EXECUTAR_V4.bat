@echo off
chcp 65001 >nul
cls
echo ========================================================================
echo   ROBO V4 - COM VERIFICACAO DE AUTO-PREENCHIMENTO
echo ========================================================================
echo.
echo   CORRECOES IMPLEMENTADAS:
echo.
echo   [X] CNPJ/CPF com zeros a esquerda (01367615000113)
echo   [X] Email divergente vai para "E-mail Compras"
echo   [X] Respeita auto-preenchimento do sistema (Receita Federal)
echo.
echo   LOGICA DO ROBO:
echo.
echo   1. Preenche CNPJ (com zeros a esquerda) e AGUARDA auto-preenchimento
echo   2. Verifica se o sistema JA preencheu endereco/contato
echo   3. Se JA preencheu:
echo      - NAO sobrescreve os dados
echo      - Se for DIFERENTE da planilha: registra em divergencias_v4.csv
echo      - EMAIL DIVERGENTE: planilha vai para "E-mail Compras"
echo   4. Se estiver VAZIO: preenche com dados da planilha
echo.
echo   ARQUIVOS GERADOS:
echo   - divergencias_v4.csv : Divergencias para analise
echo   - erros_v4.csv        : Registros com erro
echo   - robo_v4.log         : Log detalhado
echo.
echo ========================================================================
echo.
echo   USO:
echo     EXECUTAR_V4.bat          - Processa todos os registros
echo     EXECUTAR_V4.bat 10       - Processa apenas 10 registros (teste)
echo.
echo ========================================================================
echo.
pause

cd /d "%~dp0"

if "%1"=="" (
    echo Processando TODOS os registros...
    python robo_fornecedores_v4.py
) else (
    echo Processando apenas %1 registros...
    python robo_fornecedores_v4.py %1
)

echo.
echo ========================================================================
echo   FINALIZADO!
echo.
echo   VERIFIQUE:
echo   - divergencias_v4.csv para analise de dados conflitantes
echo   - erros_v4.csv para registros com erro
echo ========================================================================
pause

