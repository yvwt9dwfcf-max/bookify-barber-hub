const stats = [
  { value: '3 dias', label: 'Grátis pra testar' },
  { value: '100%', label: 'Online, sem instalar nada' },
  { value: '24h', label: 'Clientes agendam sozinhos' },
  { value: '0', label: 'Cartão necessário' },
];

export function StatsStrip() {
  return (
    <section className="py-8 px-4 sm:px-6 border-y border-border/20 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
