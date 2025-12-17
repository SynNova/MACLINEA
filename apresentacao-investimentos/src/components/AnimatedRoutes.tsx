import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import App from '../App';
import InvestimentoColaboradores from '../pages/InvestimentoColaboradores';
import InvestimentoOperacional from '../pages/InvestimentoOperacional';
import InvestimentoVendas from '../pages/InvestimentoVendas';

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<InvestimentoColaboradores />} />
        <Route path="/investimento-operacional" element={<InvestimentoOperacional />} />
        <Route path="/investimento-vendas" element={<InvestimentoVendas />} />
        <Route path="/relatorio-aplicacao" element={<App />} />
      </Routes>
    </AnimatePresence>
  );
}

