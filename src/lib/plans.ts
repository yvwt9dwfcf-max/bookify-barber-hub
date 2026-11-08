export interface Plan {
  id: string;
  name: string;
  barbers: number;
  label: string;
  maxBarbers: number;
  price: number;
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    barbers: 1,
    label: '1 profissional',
    maxBarbers: 1,
    price: 29.9,
    features: ['Agenda completa', 'Link de agendamento', 'Relatórios básicos', 'Clube de Assinaturas'],
  },
  {
    id: 'plus',
    name: 'Plus',
    barbers: 3,
    label: 'até 3 profissionais',
    maxBarbers: 3,
    price: 59.9,
    features: ['Tudo do Basic', 'Gestão de equipe', 'Permissões por profissional', 'Gestão de Comissões'],
  },
  {
    id: 'pro',
    name: 'Pro',
    barbers: 6,
    label: 'até 6 profissionais',
    maxBarbers: 6,
    price: 89.9,
    popular: true,
    features: ['Tudo do Plus', 'Relatórios avançados', 'Bloqueios de horário', 'Comissões por serviço'],
  },
  {
    id: 'studio',
    name: 'Studio',
    barbers: 12,
    label: 'até 12 profissionais',
    maxBarbers: 12,
    price: 149.9,
    features: ['Tudo do Pro', 'Gestão completa', 'Suporte prioritário'],
  },
  {
    id: 'rede',
    name: 'Rede',
    barbers: 20,
    label: 'até 20 profissionais',
    maxBarbers: 20,
    price: 249.9,
    features: ['Tudo do Studio', 'Equipe de até 20 profissionais'],
  },
];
