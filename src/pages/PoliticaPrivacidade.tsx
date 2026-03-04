import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto prose prose-invert prose-green">
          <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade – Bookify</h1>
          <p className="text-muted-foreground text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <p className="text-muted-foreground leading-relaxed">
            O Bookify respeita a privacidade dos seus usuários e protege seus dados conforme a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Dados coletados</h2>
          <p className="text-muted-foreground">Coletamos:</p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-6">
            <li>Nome</li>
            <li>E-mail</li>
            <li>Telefone (opcional)</li>
            <li>Senha (armazenada de forma criptografada)</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Finalidade</h2>
          <p className="text-muted-foreground">Os dados são usados para:</p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-6">
            <li>Criar e gerenciar contas</li>
            <li>Permitir uso do sistema</li>
            <li>Processar pagamentos via Stripe</li>
            <li>Comunicação relacionada ao serviço</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Compartilhamento</h2>
          <p className="text-muted-foreground">Não vendemos dados.</p>
          <p className="text-muted-foreground">Pagamentos são processados apenas pela Stripe.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Segurança</h2>
          <p className="text-muted-foreground">As senhas são criptografadas.</p>
          <p className="text-muted-foreground">Adotamos medidas técnicas para proteção das informações.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Direitos do usuário</h2>
          <p className="text-muted-foreground">O usuário pode solicitar:</p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-6">
            <li>Alteração de dados</li>
            <li>Exclusão da conta</li>
            <li>Revogação de consentimento</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Contato</h2>
          <p className="text-muted-foreground">Suporte: contato@bookify.com.br</p>
        </div>
      </main>
    </div>
  );
};

export default PoliticaPrivacidade;
