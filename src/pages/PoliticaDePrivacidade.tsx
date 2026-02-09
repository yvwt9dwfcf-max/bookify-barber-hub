import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft } from 'lucide-react';

const PoliticaDePrivacidade = () => {
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
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Informações que Coletamos</h2>
            <p className="leading-relaxed">Coletamos as seguintes informações:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Proprietários e barbeiros:</strong> nome, e-mail, telefone e dados de acesso</li>
              <li><strong>Clientes:</strong> nome e número de telefone (fornecidos ao agendar)</li>
              <li><strong>Dados de uso:</strong> informações sobre agendamentos e interações com a plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Como Usamos suas Informações</h2>
            <p className="leading-relaxed">Utilizamos os dados coletados para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Gerenciar agendamentos e notificações</li>
              <li>Manter e melhorar a plataforma</li>
              <li>Enviar comunicações relacionadas ao serviço</li>
              <li>Gerar relatórios para os proprietários</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Compartilhamento de Dados</h2>
            <p className="leading-relaxed">
              Seus dados pessoais <strong>não são vendidos</strong> a terceiros. As informações dos clientes 
              (nome e telefone) são compartilhadas apenas com a barbearia onde o agendamento foi realizado. 
              Podemos compartilhar dados com prestadores de serviço essenciais para o funcionamento da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Armazenamento e Segurança</h2>
            <p className="leading-relaxed">
              Os dados são armazenados em servidores seguros com criptografia. Adotamos medidas técnicas 
              e organizacionais para proteger suas informações contra acesso não autorizado, alteração ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Seus Direitos (LGPD)</h2>
            <p className="leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar o consentimento para o uso de seus dados</li>
              <li>Solicitar a portabilidade de seus dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento da plataforma, como autenticação e preferências. 
              Não utilizamos cookies de rastreamento publicitário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
            <p className="leading-relaxed">
              Os dados de agendamento são mantidos pelo período necessário para o funcionamento do serviço. 
              Dados de conta são mantidos enquanto a conta estiver ativa. Após exclusão da conta, os dados 
              são removidos em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Alterações nesta Política</h2>
            <p className="leading-relaxed">
              Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações significativas 
              através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contato</h2>
            <p className="leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato pelo 
              e-mail disponibilizado na plataforma.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PoliticaDePrivacidade;
