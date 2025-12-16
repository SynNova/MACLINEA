@echo off
cls
echo ===================================================================
echo   ROBO DE ATUALIZACAO COMPLETO (8055 REGISTROS)
echo ===================================================================
echo.
echo ATENCAO: Este processo ira atualizar TODOS os 8055 registros!
echo.
echo Tempo estimado: ~11 horas
echo.
echo Certifique-se de que:
echo  - O teste de 5 registros foi executado com sucesso
echo  - O sistema esta estavel
echo  - Voce tem tempo suficiente para conclusao
echo.
pause

python robo_atualizar_fornecedores_FINAL.py

pause

