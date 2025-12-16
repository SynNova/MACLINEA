# Configuração de Ambiente (OpenRouter)

Este projeto usa a variável de ambiente `OPENROUTER_API_KEY` para scripts que chamam a API do OpenRouter.

## PowerShell (Windows)

```powershell
$env:OPENROUTER_API_KEY = "sk-or-v1-..."
npm run reescrever
```

## Bash (Linux/macOS/Git Bash)

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
npm run reescrever
```

## Importante

- **Não** salve a chave em arquivos versionados.
- Se uma chave já foi colada em algum arquivo, **revogue/roteie** a chave no OpenRouter e gere uma nova.


