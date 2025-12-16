"""Extrai texto completo do PDF do sistema"""
import pdfplumber
import re

print("Extraindo texto do PDF...")
print("="*70)

try:
    with pdfplumber.open('Consulta Movimento Financeiro.pdf') as pdf:
        print(f"Total de paginas: {len(pdf.pages)}\n")
        
        texto_completo = ""
        for i, pagina in enumerate(pdf.pages, 1):
            print(f"Pagina {i}...")
            texto = pagina.extract_text()
            if texto:
                texto_completo += texto + "\n"
        
        # Salva o texto extraído
        with open('pdf_extraido.txt', 'w', encoding='utf-8') as f:
            f.write(texto_completo)
        
        print(f"\n✓ Texto extraido salvo em: pdf_extraido.txt")
        print(f"✓ Total de caracteres: {len(texto_completo)}")
        
        # Procura valores de total
        if 'Total Geral' in texto_completo:
            print("\n✓ Encontrou 'Total Geral' no PDF")
            
            # Extrai as linhas com Total Geral
            linhas = texto_completo.split('\n')
            for linha in linhas:
                if 'Total Geral' in linha:
                    print(f"\nLinha Total: {linha}")
                    
                    # Extrai todos os valores dessa linha
                    valores = re.findall(r'(\d{1,3}(?:\.\d{3})*,\d{2})', linha)
                    if valores:
                        print(f"Valores encontrados: {valores}")
        
        # Conta quantos registros
        registros = re.findall(r'\d{2}/\d{2}/\d{4}', texto_completo)
        print(f"\nDatas encontradas: {len(registros)}")
        
except Exception as e:
    print(f"ERRO: {e}")
    import traceback
    traceback.print_exc()




