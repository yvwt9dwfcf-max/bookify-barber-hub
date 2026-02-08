import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AgendarBarbearia from "./pages/AgendarBarbearia";
import AgendarBarbeiro from "./pages/AgendarBarbeiro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login initialTab="signup" />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Protected panel routes */}
          <Route path="/painel" element={<Painel />}>
            <Route index element={<Agenda />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="bloqueios" element={<Bloqueios />} />
            <Route path="barbeiros" element={<Barbeiros />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="whatsapp" element={<WhatsAppAtendimento />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Public booking routes */}
          <Route path="/agendar/:slugOrId" element={<AgendarBarbearia />} />
          <Route path="/b/:barberId" element={<AgendarBarbeiro />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
