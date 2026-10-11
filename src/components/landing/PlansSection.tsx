import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/plans';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PlansSection() {
  return (
    <section id="planos" className="px-4 py-20 sm:px-6 md:py-28 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        <p className="font-editorial-mono text-xs uppercase tracking-[0.18em] text-primary mb-5">— Planos</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Um plano para o tamanho da sua equipe.</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mt-4 mb-8">
          Teste por 3 dias sem cartão de crédito. Para continuar depois do teste, escolha uma assinatura mensal.
        </p>
        <ul className="divide-y divide-border border-y border-border">
          {PLANS.map(plan => (
            <li key={plan.id} className="grid grid-cols-[1fr_auto] gap-4 py-5 items-center">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.label}</p>
              </div>
              <p className="text-right tabular-nums">
                <span className="text-lg font-semibold text-foreground">{currency.format(plan.price)}</span>
                <span className="block text-xs text-muted-foreground">por mês</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button asChild className="btn-primary-solid h-12 px-6">
            <Link to="/register">Começar teste grátis</Link>
          </Button>
          <p className="text-sm text-muted-foreground">A assinatura é escolhida dentro do app, após o cadastro.</p>
        </div>
      </div>
    </section>
  );
}