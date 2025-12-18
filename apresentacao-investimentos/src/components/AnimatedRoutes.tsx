import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import App from '../App';
import InvestimentoColaboradores from '../pages/InvestimentoColaboradores';
import InvestimentoOperacional from '../pages/InvestimentoOperacional';
import InvestimentoVendas from '../pages/InvestimentoVendas';
import ReducaoDespesasPage from '../pages/ReducaoDespesasPage';
import ReducaoFolhaPage from '../pages/ReducaoFolhaPage';
import VisaoFuturoPage from '../pages/VisaoFuturoPage';
import MetaObjetivoPage from '../pages/MetaObjetivoPage';

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<InvestimentoColaboradores />} />
        <Route path="/investimento-operacional" element={<InvestimentoOperacional />} />
        <Route path="/investimento-vendas" element={<InvestimentoVendas />} />
        <Route path="/reducao-despesas" element={<ReducaoDespesasPage />} />
        <Route path="/reducao-folha" element={<ReducaoFolhaPage />} />
        <Route path="/visao-futuro" element={<VisaoFuturoPage />} />
        <Route path="/meta-objetivo" element={<MetaObjetivoPage />} />
        <Route path="/relatorio-aplicacao" element={<App />} />
      </Routes>
    </AnimatePresence>
  );
}

