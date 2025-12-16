"""
Script unico que roda 4 navegadores em paralelo em um unico console.
Cada navegador processa um range diferente de registros.
"""

import sys
import os
import time
import threading
import logging
from datetime import datetime

# Adicionar diretorio ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar a classe do robo
from robo_fornecedores_v4 import RoboFornecedoresV4, Config

# Configuracao das instancias
INSTANCIAS = [
    {'id': 'inst1', 'inicio': 0,    'fim': 2000},
    {'id': 'inst2', 'inicio': 2000, 'fim': 4000},
    {'id': 'inst3', 'inicio': 4000, 'fim': 6000},
    {'id': 'inst4', 'inicio': 6000, 'fim': 8000},
]

# Lock para print sincronizado
print_lock = threading.Lock()

def log_instancia(instancia_id, mensagem, nivel='INFO'):
    """Log sincronizado para evitar mensagens embaralhadas"""
    with print_lock:
        timestamp = datetime.now().strftime('%H:%M:%S')
        prefixo = f"[{timestamp}] [{instancia_id}]"
        print(f"{prefixo} {mensagem}")

def executar_instancia(config_inst):
    """Executa uma instancia do robo em thread separada"""
    inst_id = config_inst['id']
    inicio = config_inst['inicio']
    fim = config_inst['fim']
    
    log_instancia(inst_id, f"Iniciando - Range: {inicio} a {fim}")
    
    try:
        # Criar instancia do robo
        robo = RoboFornecedoresV4(instancia_id=inst_id)
        
        # Executar
        robo.executar(inicio=inicio, fim=fim)
        
        log_instancia(inst_id, f"CONCLUIDO - Processados: {robo.estatisticas['sucessos']} sucessos, {robo.estatisticas['erros']} erros")
        
    except KeyboardInterrupt:
        log_instancia(inst_id, "Interrompido pelo usuario")
    except Exception as e:
        log_instancia(inst_id, f"ERRO CRITICO: {e}", 'ERROR')
    
    return inst_id

def main():
    print("=" * 80)
    print("  ROBO 4 NAVEGADORES - Console Unico")
    print("=" * 80)
    print()
    print("  Distribuicao de registros:")
    for inst in INSTANCIAS:
        print(f"    {inst['id']}: {inst['inicio']} - {inst['fim']}")
    print()
    print("=" * 80)
    print()
    
    # Criar threads
    threads = []
    
    for config_inst in INSTANCIAS:
        thread = threading.Thread(
            target=executar_instancia,
            args=(config_inst,),
            name=config_inst['id']
        )
        threads.append(thread)
    
    # Iniciar todas as threads com delay entre cada uma
    print("[MAIN] Iniciando 4 navegadores...")
    print()
    
    for i, thread in enumerate(threads):
        thread.start()
        log_instancia('MAIN', f"Navegador {i+1}/4 iniciado ({thread.name})")
        if i < len(threads) - 1:
            time.sleep(5)  # Delay entre inicializacoes
    
    print()
    log_instancia('MAIN', "Todos os 4 navegadores estao rodando!")
    log_instancia('MAIN', "Pressione Ctrl+C para interromper todos")
    print()
    
    # Aguardar todas terminarem
    try:
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        print()
        log_instancia('MAIN', "Ctrl+C detectado - aguardando threads finalizarem...")
        # As threads vao capturar o KeyboardInterrupt internamente
    
    print()
    print("=" * 80)
    print("  EXECUCAO FINALIZADA")
    print("=" * 80)
    print()
    print("  Verifique os arquivos de progresso:")
    for inst in INSTANCIAS:
        print(f"    - progresso_v4_{inst['id']}.json")
    print()

if __name__ == '__main__':
    main()

