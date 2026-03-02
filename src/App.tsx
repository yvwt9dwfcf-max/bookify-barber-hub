import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import EsqueciSenha from "./pages/EsqueciSenha";
import Onboarding from "./pages/Onboarding";
import Painel from "./pages/Painel";
import Agenda from "./pages/painel/Agenda";
import Servicos from "./pages/painel/Servicos";
import Horarios from "./pages/painel/Horarios";
import Bloqueios from "./pages/painel/Bloqueios";
import Barbeiros from "./pages/painel/Barbeiros";
import Configuracoes from "./pages/painel/Configuracoes";
import WhatsAppAtendimento from "./pages/painel/WhatsAppAtendimento";
import Relatorios from "./pages/painel/Relatorios";
import Assinatura from "./pages/painel/Assinatura";
import PerfilPublico from "./pages/painel/PerfilPublico";
import Comissoes from "./pages/painel/Comissoes";
import Fidelidade from "./pages/painel/Fidelidade";

import AgendarBarbearia from "./pages/AgendarBarbearia";
import AgendarBarbeiro from "./pages/AgendarBarbeiro";
import BarbeariaPublica from "./pages/BarbeariaPublica";
import TrialExpirado from "./pages/TrialExpirado";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
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
            
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Public booking routes */}
          <Route path="/agendar/:slugOrId" element={<AgendarBarbearia />} />
          <Route path="/b/:barberId" element={<AgendarBarbeiro />} />
          <Route path="/barbearia/:slug" element={<BarbeariaPublica />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
