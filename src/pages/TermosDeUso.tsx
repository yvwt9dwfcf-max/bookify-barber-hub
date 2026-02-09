import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft } from 'lucide-react';

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="leading-relaxed">
              Ao acessar e utilizar a plataforma Bookify, você concorda com estes Termos de Uso. 
              Caso não concorde com qualquer parte destes termos, não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p className="leading-relaxed">
              O Bookify é uma plataforma de agendamento online para barbearias que permite o gerenciamento de 
              agendamentos, equipe, serviços e horários. Nossos serviços incluem:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Sistema de agendamento online para clientes</li>
              <li>Gestão de agenda e equipe para proprietários</li>
              <li>Relatórios de faturamento e atendimentos</li>
              <li>Integração com WhatsApp para comunicação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
            <p className="leading-relaxed">
              Para utilizar os serviços como proprietário ou barbeiro, é necessário criar uma conta com 
              informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade 
              de suas credenciais de acesso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Adequado</h2>
            <p className="leading-relaxed">Você concorda em:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Não utilizar a plataforma para fins ilícitos</li>
              <li>Não tentar acessar dados de outros usuários sem autorização</li>
              <li>Fornecer informações verdadeiras nos agendamentos</li>
              <li>Não realizar agendamentos falsos ou spam</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Agendamentos</h2>
            <p className="leading-relaxed">
              Os agendamentos realizados pela plataforma estão sujeitos à disponibilidade do profissional. 
              O Bookify não se responsabiliza por cancelamentos ou alterações feitos pelo estabelecimento. 
              Os clientes podem gerenciar seus agendamentos através do link de autoatendimento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Planos e Pagamentos</h2>
            <p className="leading-relaxed">
              Os planos disponíveis e seus respectivos preços estão descritos na página de preços. 
              O Bookify se reserva o direito de alterar os preços mediante aviso prévio de 30 dias. 
              O cancelamento pode ser feito a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitação de Responsabilidade</h2>
            <p className="leading-relaxed">
              O Bookify não se responsabiliza por danos indiretos, incidentais ou consequenciais 
              decorrentes do uso da plataforma. Nosso serviço é fornecido "como está", sem garantias 
              expressas ou implícitas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Modificações</h2>
            <p className="leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. 
              As alterações serão publicadas nesta página com a data de atualização.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contato</h2>
            <p className="leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato através do e-mail disponibilizado na plataforma.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermosDeUso;
