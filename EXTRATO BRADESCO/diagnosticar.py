"""
Script de diagnóstico - Verifica estrutura da página
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

print("Iniciando diagnóstico...")

options = webdriver.ChromeOptions()
options.add_argument('--start-maximized')
driver = webdriver.Chrome(options=options)

driver.get("http://sistema.maclinea.com.br:4586/app/")

input("""
INSTRUÇÕES:
1. Faça LOGIN
2. Vá em: Financeiro > Movimento Financeiro  
3. Pressione ENTER aqui...
""")

print("\n" + "="*60)
print("DIAGNÓSTICO DA PÁGINA")
print("="*60)

# 1. Contar iframes
iframes = driver.find_elements(By.TAG_NAME, "iframe")
print(f"\n1. Total de iframes: {len(iframes)}")

# 2. Procurar botão Novo sem entrar em iframe
print("\n2. Procurando botão 'Novo' no documento principal...")
script_busca = """
var todos = document.querySelectorAll('*');
var encontrados = [];
for (var i = 0; i < todos.length; i++) {
    var texto = todos[i].textContent || '';
    if (texto.includes('Novo') && todos[i].offsetHeight > 0) {
        encontrados.push({
            tag: todos[i].tagName,
            class: todos[i].className,
            id: todos[i].id,
            texto: texto.substring(0, 50)
        });
    }
}
return encontrados.slice(0, 5);
"""
resultado = driver.execute_script(script_busca)
for item in resultado:
    print(f"  - {item['tag']}.{item['class']} → {item['texto']}")

# 3. Tentar em cada iframe
print(f"\n3. Procurando em cada iframe...")
for i, iframe in enumerate(iframes):
    try:
        driver.switch_to.default_content()
        driver.switch_to.frame(iframe)
        resultado = driver.execute_script(script_busca)
        if resultado:
            print(f"\n  ✓ Iframe {i}: Encontrado!")
            for item in resultado[:3]:
                print(f"    - {item['tag']}.{item['class']}")
    except:
        pass

driver.switch_to.default_content()

print("\n" + "="*60)
input("\nPressione ENTER para fechar...")
driver.quit()




