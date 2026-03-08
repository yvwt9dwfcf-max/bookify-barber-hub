import { CircleHelp as HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Ajuda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Encontre respostas para as dúvidas mais comuns.
        </p>
      </div>

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
    </div>
  );
};

export default Suporte;
