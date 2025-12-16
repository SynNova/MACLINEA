import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  // Para GitHub Pages (project pages), o app roda em `/<repo>/`.
  // No CI, definimos BASE_PATH (ex.: "/MACLINEA/"). Localmente, fica "/".
  const base =
    process.env.BASE_PATH ??
    (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/')

  return {
    base,
    plugins: [react(), tailwindcss()],
  }
})

