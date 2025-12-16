@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo           🤖 ROBÔ DE LANÇAMENTO AUTOMÁTICO 🤖
echo.
echo              Instalação e Execução Rápida
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo.

echo [1/3] Verificando Python...
python --version
if errorlevel 1 (
    echo ❌ Python não encontrado! Instale Python 3.8 ou superior.
    pause
    exit /b 1
)
echo ✓ Python encontrado
echo.

echo [2/3] Instalando dependências...
pip install selenium
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências
    pause
    exit /b 1
)
echo ✓ Dependências instaladas
echo.

echo [3/3] Iniciando robô...
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo  👉 IMPORTANTE:
echo.
echo  1. O navegador abrirá automaticamente
echo  2. Faça LOGIN no sistema
echo  3. Vá em: Financeiro ^> Movimento Financeiro
echo  4. Volte aqui e pressione ENTER
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause

python robo_lancamento.py

pause




