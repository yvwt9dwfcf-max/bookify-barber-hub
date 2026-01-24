import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Types based on database schema
export interface Barber {
  id: string;
  auth_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  barber_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  barber_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
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
