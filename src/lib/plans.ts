export interface Plan {
  id: string;
  name: string;
  barbers: number;
  label: string;
  maxBarbers: number;
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    barbers: 1,
    label: '1 barbeiro',
    maxBarbers: 1,
    features: ['Agenda completa', 'Link de agendamento', 'Relatórios básicos'],
  },
  {
    id: 'plus',
    name: 'Plus',
    barbers: 3,
    label: 'até 3 barbeiros',
    maxBarbers: 3,
    features: ['Tudo do Basic', 'Gestão de equipe', 'Permissões por barbeiro'],
  },
  {
    id: 'pro',
    name: 'Pro',
    barbers: 6,
    label: 'até 6 barbeiros',
    maxBarbers: 6,
    popular: true,
    features: ['Tudo do Plus', 'Relatórios avançados', 'Bloqueios de horário'],
  },
  {
    id: 'studio',
    name: 'Studio',
    barbers: 12,
    label: 'até 12 barbeiros',
    maxBarbers: 12,
    features: ['Tudo do Pro', 'Gestão completa', 'Suporte prioritário'],
  },
  {
    id: 'rede',
    name: 'Rede',
    barbers: 20,
    label: 'acima de 12 barbeiros',
    maxBarbers: 20,
    features: ['Tudo do Studio', 'Múltiplas unidades', 'Dashboard consolidado'],
  },
];
