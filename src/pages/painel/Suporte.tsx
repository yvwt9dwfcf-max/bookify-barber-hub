import { useState } from 'react';
import { Mail, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, Send, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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
  const [reportText, setReportText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendReport = () => {
    if (!reportText.trim()) {
      toast.error('Descreva o problema antes de enviar.');
      return;
    }
    const subject = encodeURIComponent('Relatório de Problema - Bookify');
    const body = encodeURIComponent(reportText);
    window.open(`mailto:suporte.bookifybarber@gmail.com?subject=${subject}&body=${body}`, '_self');
    toast.success('Seu aplicativo de e-mail será aberto para enviar o relatório.');
    setReportText('');
  };

  const handleSendEmail = () => {
    window.open('mailto:suporte.bookifybarber@gmail.com', '_self');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Tire suas dúvidas, encontre soluções ou entre em contato com nossa equipe.
        </p>
      </div>

      {/* Seção 1: Contato por e-mail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Contato por E-mail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Precisa de ajuda com o Bookify? Entre em contato com nossa equipe.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              suporte.bookifybarber@gmail.com
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              bookifybarber@gmail.com
            </div>
          </div>
          <Button onClick={handleSendEmail} className="w-full sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            Enviar e-mail
          </Button>
        </CardContent>
      </Card>

      {/* Seção 2: Problemas frequentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-primary" />
            Problemas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Seção 3: Reportar problema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Reportar Problema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Descreva o problema que você está enfrentando..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={5}
          />
          <Button onClick={handleSendReport} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            Enviar relatório
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Suporte;
