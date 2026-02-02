import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Agendar from "./pages/Agendar";
import AgendarBarbeiro from "./pages/AgendarBarbeiro";
import AgendarBarbearia from "./pages/AgendarBarbearia";
import Login from "./pages/Login";
import EsqueciSenha from "./pages/EsqueciSenha";
import Painel from "./pages/Painel";
import Agenda from "./pages/painel/Agenda";
import Servicos from "./pages/painel/Servicos";
import Horarios from "./pages/painel/Horarios";
import Bloqueios from "./pages/painel/Bloqueios";
import Barbeiros from "./pages/painel/Barbeiros";
import Configuracoes from "./pages/painel/Configuracoes";
import WhatsAppAtendimento from "./pages/painel/WhatsAppAtendimento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/agendar/:barbershopId" element={<AgendarBarbearia />} />
          <Route path="/b/:barberId" element={<AgendarBarbeiro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/painel" element={<Painel />}>
            <Route index element={<Agenda />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="bloqueios" element={<Bloqueios />} />
            <Route path="barbeiros" element={<Barbeiros />} />
            <Route path="whatsapp" element={<WhatsAppAtendimento />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
