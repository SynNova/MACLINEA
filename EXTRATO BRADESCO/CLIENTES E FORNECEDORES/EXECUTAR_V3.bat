@echo off
chcp 65001 >nul
cls
echo ========================================================================
echo   ROBO V3 - ATUALIZACAO DE FORNECEDORES OCTUS ERP
echo   Versao completa com todos os campos obrigatorios
echo ========================================================================
echo.
echo   CAMPOS OBRIGATORIOS TRATADOS:
echo   - Data Cadastro (automatico)
echo   - Ativo (Sim/Nao baseado em indativo)
echo   - Tipo Cadastro (Fornecedor)
echo   - Tipo Pessoa (baseado em indfisjur)
echo   - Nome/Razao Social
echo   - CEP
echo   - Endereco
echo   - Numero (S/N padrao)
echo   - Bairro
echo   - Pais (Brasil)
echo   - Telefone 1
echo.
echo ========================================================================
echo.
echo   USO:
echo     EXECUTAR_V3.bat          - Processa todos os registros
echo     EXECUTAR_V3.bat 10       - Processa apenas 10 registros (teste)
echo.
echo ========================================================================
echo.
pause

cd /d "%~dp0"

if "%1"=="" (
    echo Processando TODOS os registros...
    python robo_fornecedores_v3.py
) else (
    echo Processando apenas %1 registros...
    python robo_fornecedores_v3.py %1
)

echo.
echo ========================================================================
echo   FINALIZADO!
echo ========================================================================
pause








