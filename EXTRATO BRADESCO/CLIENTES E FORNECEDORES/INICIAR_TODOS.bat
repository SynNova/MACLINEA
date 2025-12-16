@echo off
echo =====================================================
echo   INICIANDO 4 INSTANCIAS DO ROBO EM PARALELO
echo =====================================================
echo.
echo   Instancia 1: Registros 0 - 2000
echo   Instancia 2: Registros 2000 - 4000
echo   Instancia 3: Registros 4000 - 6000
echo   Instancia 4: Registros 6000 - 8055
echo.
echo =====================================================
echo.

start "ROBO 1 (0-2000)" cmd /k "python robo_fornecedores_v4.py 0 2000 --id inst1"
timeout /t 5
start "ROBO 2 (2000-4000)" cmd /k "python robo_fornecedores_v4.py 2000 4000 --id inst2"
timeout /t 5
start "ROBO 3 (4000-6000)" cmd /k "python robo_fornecedores_v4.py 4000 6000 --id inst3"
timeout /t 5
start "ROBO 4 (6000-8055)" cmd /k "python robo_fornecedores_v4.py 6000 8055 --id inst4"

echo.
echo =====================================================
echo   4 JANELAS ABERTAS - VERIFIQUE CADA UMA
echo =====================================================
pause








