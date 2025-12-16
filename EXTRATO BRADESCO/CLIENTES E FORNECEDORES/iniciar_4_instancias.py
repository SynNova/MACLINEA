"""
Script para iniciar 4 instancias do robo em paralelo.
Cada instancia processa um range diferente de registros.
"""

import subprocess
import sys
import time
import os

# Configuracao das instancias
INSTANCIAS = [
    {'id': 'inst1', 'inicio': 0,    'fim': 2000},
    {'id': 'inst2', 'inicio': 2000, 'fim': 4000},
    {'id': 'inst3', 'inicio': 4000, 'fim': 6000},
    {'id': 'inst4', 'inicio': 6000, 'fim': 8000},
]

def main():
    print("=" * 70)
    print("  INICIANDO 4 INSTANCIAS DO ROBO EM PARALELO")
    print("=" * 70)
    print()
    
    # Diretorio atual
    diretorio = os.path.dirname(os.path.abspath(__file__))
    script_robo = os.path.join(diretorio, 'robo_fornecedores_v4.py')
    
    if not os.path.exists(script_robo):
        print(f"[ERRO] Script nao encontrado: {script_robo}")
        sys.exit(1)
    
    processos = []
    
    for inst in INSTANCIAS:
        cmd = [
            sys.executable,  # Python atual
            script_robo,
            str(inst['inicio']),
            str(inst['fim']),
            '--id', inst['id']
        ]
        
        print(f"[*] Iniciando {inst['id']}: registros {inst['inicio']} a {inst['fim']}")
        
        # Iniciar em novo processo (janela separada no Windows)
        if sys.platform == 'win32':
            # CREATE_NEW_CONSOLE para abrir em janela separada
            processo = subprocess.Popen(
                cmd,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
                cwd=diretorio
            )
        else:
            processo = subprocess.Popen(cmd, cwd=diretorio)
        
        processos.append({
            'id': inst['id'],
            'processo': processo,
            'range': f"{inst['inicio']}-{inst['fim']}"
        })
        
        # Pequeno delay entre inicializacoes para nao sobrecarregar
        time.sleep(3)
    
    print()
    print("=" * 70)
    print("  TODAS AS INSTANCIAS INICIADAS!")
    print("=" * 70)
    print()
    print("  Instancias rodando:")
    for p in processos:
        print(f"    - {p['id']}: registros {p['range']} (PID: {p['processo'].pid})")
    print()
    print("  Cada instancia roda em sua propria janela.")
    print("  Feche esta janela a qualquer momento - as instancias continuarao.")
    print()
    print("  Para acompanhar o progresso, verifique:")
    print("    - progresso_v4_inst1.json")
    print("    - progresso_v4_inst2.json")
    print("    - progresso_v4_inst3.json")
    print("    - progresso_v4_inst4.json")
    print()
    print("=" * 70)
    
    # Opcional: aguardar todos terminarem
    input("\nPressione ENTER para sair (instancias continuarao rodando)...\n")

if __name__ == '__main__':
    main()








