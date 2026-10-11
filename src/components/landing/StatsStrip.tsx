const stats = [
  { value: 'Agenda', label: 'Agendamento pelo seu link' },
  { value: 'Equipe', label: 'Gestão por profissional' },
  { value: 'Financeiro', label: 'Comissões e caixa' },
  { value: 'Clientes', label: 'Histórico e fidelidade' },
];

export function StatsStrip() {
  return (
    <section className="py-10 px-4 sm:px-6 border-y border-border/30">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-0.5">{stat.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
