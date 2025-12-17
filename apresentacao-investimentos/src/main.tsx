import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import AnimatedRoutes from './components/AnimatedRoutes'
import './index.css'
import { I18nProvider } from './i18n/I18nProvider'
import { BancoScopeProvider } from './filters/BancoScopeProvider'
import { CurrencyProvider } from './currency/CurrencyProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <I18nProvider>
        <BancoScopeProvider>
          <CurrencyProvider>
            <AnimatedRoutes />
          </CurrencyProvider>
        </BancoScopeProvider>
      </I18nProvider>
    </HashRouter>
  </React.StrictMode>,
)
