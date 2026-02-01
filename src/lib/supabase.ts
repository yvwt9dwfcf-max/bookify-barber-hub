import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Role types
export type AppRole = 'master' | 'barber';
export type PlanType = 'basic' | 'pro' | 'advanced';

// Types based on database schema
export interface Barbershop {
  id: string;
  name: string;
  slug: string | null;
  plan: PlanType;
  max_barbers: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  barbershop_id: string;
  created_at: string;
}

export interface BarberPermissions {
  id: string;
  barber_id: string;
  can_edit_own_schedule: boolean;
  can_view_others_schedule: boolean;
  can_edit_others_schedule: boolean;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  auth_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  barbershop_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: BarberPermissions;
}

export interface Service {
  id: string;
  barber_id: string;
  barbershop_id: string | null;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Tabela de junção entre barbeiros e serviços
export interface BarberService {
  id: string;
  barber_id: string;
  service_id: string;
  created_at: string;
}

export interface OpeningHours {
  id: string;
  barber_id: string;
  barbershop_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  barber_id: string;
  barbershop_id: string | null;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
  barbershop_id: string | null;
  service_id: string | null;
  customer_name: string;
  customer_phone: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
  barber?: Barber;
}

export const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const PLAN_LIMITS: Record<PlanType, number> = {
  basic: 3,
  pro: 10,
  advanced: 50,
};

export const PLAN_NAMES: Record<PlanType, string> = {
  basic: 'Básico',
  pro: 'Profissional',
  advanced: 'Avançado',
};
