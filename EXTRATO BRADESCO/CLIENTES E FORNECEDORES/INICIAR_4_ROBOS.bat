@echo off
chcp 65001 >nul
title Iniciador de 4 Robos

echo ======================================================================
echo   INICIANDO 4 INSTANCIAS DO ROBO EM PARALELO
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Iniciando instancia 1: registros 0 a 2000
start "ROBO inst1 (0-2000)" cmd /k python robo_fornecedores_v4.py 0 2000 --id inst1

timeout /t 3 /nobreak >nul

echo [*] Iniciando instancia 2: registros 2000 a 4000
start "ROBO inst2 (2000-4000)" cmd /k python robo_fornecedores_v4.py 2000 4000 --id inst2

timeout /t 3 /nobreak >nul

echo [*] Iniciando instancia 3: registros 4000 a 6000
start "ROBO inst3 (4000-6000)" cmd /k python robo_fornecedores_v4.py 4000 6000 --id inst3

timeout /t 3 /nobreak >nul

echo [*] Iniciando instancia 4: registros 6000 a 8000
start "ROBO inst4 (6000-8000)" cmd /k python robo_fornecedores_v4.py 6000 8000 --id inst4

echo.
echo ======================================================================
echo   TODAS AS 4 INSTANCIAS FORAM INICIADAS!
echo ======================================================================
echo.
echo   Cada robo esta rodando em sua propria janela.
echo   Voce pode fechar esta janela - os robos continuarao.
echo.
echo   Arquivos de progresso:
echo     - progresso_v4_inst1.json
echo     - progresso_v4_inst2.json
echo     - progresso_v4_inst3.json
echo     - progresso_v4_inst4.json
echo.
pause








