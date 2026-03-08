import { Mail, HelpCircle, MessageCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: 'Não consigo acessar minha conta',
    answer: 'Tente redefinir sua senha clicando em "Esqueci minha senha" na tela de login. Caso o problema persista, entre em contato com nosso suporte por e-mail informando o endereço cadastrado.',
  },
  {
    question: 'Meu cliente não consegue agendar',
    answer: 'Verifique se você possui horários de atendimento configurados, se os serviços estão ativos e se não há bloqueios cadastrados no período. Confirme também que o link de agendamento está correto.',
  },
  {
    question: 'Como adicionar barbeiros',
    answer: 'Acesse o menu "Equipe" no painel. Clique em "Adicionar barbeiro", preencha os dados e envie o convite. O barbeiro receberá um e-mail para criar sua conta e acessar o sistema.',
  },
  {
    question: 'Como mudar meu plano',
    answer: 'Acesse o menu "Configurações" e clique em "Assinatura". Lá você pode visualizar seu plano atual e fazer upgrade ou downgrade conforme sua necessidade.',
  },
];

const Suporte = () => {
  const handleSendEmail = () => {
    window.open('mailto:suporte.bookifybarber@gmail.com?subject=Suporte%20Bookify', '_self');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Suporte</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Encontre respostas rápidas ou fale com nossa equipe.
        </p>
      </div>

      {/* FAQ Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Problemas Frequentes
          </h2>
        </div>
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b last:border-b-0 px-4"
                >
                  <AccordionTrigger className="text-sm text-left py-4 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* Contact Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contato com Suporte
          </h2>
        </div>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm text-foreground font-medium">
                Precisa de ajuda? Entre em contato com nossa equipe.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Responderemos em até 24 horas úteis.
              </p>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3.5 py-2.5">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">
                suporte.bookifybarber@gmail.com
              </span>
            </div>
            <Button onClick={handleSendEmail} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Enviar e-mail
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Suporte;
