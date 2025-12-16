@echo off
echo ===================================================================
echo   INSTALANDO PLAYWRIGHT PARA AUTOMACAO
echo ===================================================================
echo.

echo Instalando biblioteca Playwright...
pip install playwright

echo.
echo Instalando navegadores do Playwright...
playwright install chromium

echo.
echo ===================================================================
echo   INSTALACAO CONCLUIDA!
echo ===================================================================
pause








