import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Painel = lazy(() => import("./pages/Painel"));
const Agenda = lazy(() => import("./pages/painel/Agenda"));
const Servicos = lazy(() => import("./pages/painel/Servicos"));
const Horarios = lazy(() => import("./pages/painel/Horarios"));
const Bloqueios = lazy(() => import("./pages/painel/Bloqueios"));
const Barbeiros = lazy(() => import("./pages/painel/Barbeiros"));
const Configuracoes = lazy(() => import("./pages/painel/Configuracoes"));
const WhatsAppAtendimento = lazy(() => import("./pages/painel/WhatsAppAtendimento"));
const Relatorios = lazy(() => import("./pages/painel/Relatorios"));
const Assinatura = lazy(() => import("./pages/painel/Assinatura"));
const PerfilPublico = lazy(() => import("./pages/painel/PerfilPublico"));
const Comissoes = lazy(() => import("./pages/painel/Comissoes"));
const Fidelidade = lazy(() => import("./pages/painel/Fidelidade"));
const Clientes = lazy(() => import("./pages/painel/Clientes"));
const Despesas = lazy(() => import("./pages/painel/Despesas"));
const Suporte = lazy(() => import("./pages/painel/Suporte"));
const ExcluirConta = lazy(() => import("./pages/painel/ExcluirConta"));
const AgendarBarbearia = lazy(() => import("./pages/AgendarBarbearia"));
const AgendarBarbeiro = lazy(() => import("./pages/AgendarBarbeiro"));
const BarbeariaPublica = lazy(() => import("./pages/BarbeariaPublica"));
const TrialExpirado = lazy(() => import("./pages/TrialExpirado"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const TermosUso = lazy(() => import("./pages/TermosUso"));

const queryClient = new QueryClient();

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

function AnimatedRoutes() {
  const location = useLocation();
  // Use first path segment as key so panel sub-routes don't trigger full-page transitions
  const routeKey = '/' + (location.pathname.split('/')[1] || '');

  return (
    <AnimatePresence mode="wait">
      <motion.div key={routeKey} {...pageTransition} className="min-h-screen">
        <Routes location={location}>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login initialTab="signup" />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/trial-expirado" element={<TrialExpirado />} />

          {/* Protected panel routes */}
          <Route path="/painel" element={<Painel />}>
            <Route index element={<Agenda />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="bloqueios" element={<Bloqueios />} />
            <Route path="barbeiros" element={<Barbeiros />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="whatsapp" element={<WhatsAppAtendimento />} />
            <Route path="assinatura" element={<Assinatura />} />
            <Route path="perfil-publico" element={<PerfilPublico />} />
            <Route path="comissoes" element={<Comissoes />} />
            <Route path="fidelidade" element={<Fidelidade />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="excluir-conta" element={<ExcluirConta />} />
            <Route path="suporte" element={<Suporte />} />
          </Route>

          {/* Public booking routes */}
          <Route path="/agendar/:slugOrId" element={<AgendarBarbearia />} />
          <Route path="/b/:barberId" element={<AgendarBarbeiro />} />
          <Route path="/barbearia/:slug" element={<BarbeariaPublica />} />

          {/* Legal pages */}
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-de-uso" element={<TermosUso />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
