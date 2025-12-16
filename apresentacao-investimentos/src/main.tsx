import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n/I18nProvider'
import { BancoScopeProvider } from './filters/BancoScopeProvider'
import { CurrencyProvider } from './currency/CurrencyProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <BancoScopeProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </BancoScopeProvider>
    </I18nProvider>
  </React.StrictMode>,
)

