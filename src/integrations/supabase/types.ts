export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string
          barbershop_id: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          end_time: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          service_id: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          barbershop_id?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          end_time: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          service_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          end_time?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          service_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_commissions: {
        Row: {
          barber_id: string
          barbershop_id: string
          created_at: string
          default_percentage: number
          id: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          created_at?: string
          default_percentage?: number
          id?: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          created_at?: string
          default_percentage?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commissions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_permissions: {
        Row: {
          barber_id: string
          can_edit_others_schedule: boolean
          can_edit_own_schedule: boolean
          can_view_others_schedule: boolean
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          can_edit_others_schedule?: boolean
          can_edit_own_schedule?: boolean
          can_view_others_schedule?: boolean
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          can_edit_others_schedule?: boolean
          can_edit_own_schedule?: boolean
          can_view_others_schedule?: boolean
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_permissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_service_photos: {
        Row: {
          barber_id: string
          created_at: string
          id: string
          photo_url: string
          service_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          id?: string
          photo_url: string
          service_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          id?: string
          photo_url?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_service_photos_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_services: {
        Row: {
          barber_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_whatsapp: {
        Row: {
          barber_id: string
          created_at: string
          id: string
          message: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_whatsapp_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          auth_id: string
          barbershop_id: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          monthly_goal: number | null
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          barbershop_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          monthly_goal?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          barbershop_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          monthly_goal?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_gallery: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_gallery_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          city: string | null
          closing_time: string | null
          created_at: string
          google_maps_url: string | null
          id: string
          max_barbers: number
          monthly_goal: number | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          photo_url: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          products_monthly_goal: number | null
          slug: string | null
          subscription_active: boolean
          subscription_status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          tutorial_completed: boolean
          updated_at: string
        }
        Insert: {
          city?: string | null
          closing_time?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          max_barbers?: number
          monthly_goal?: number | null
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          photo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          products_monthly_goal?: number | null
          slug?: string | null
          subscription_active?: boolean
          subscription_status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          tutorial_completed?: boolean
          updated_at?: string
        }
        Update: {
          city?: string | null
          closing_time?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          max_barbers?: number
          monthly_goal?: number | null
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          photo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          products_monthly_goal?: number | null
          slug?: string | null
          subscription_active?: boolean
          subscription_status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          tutorial_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          barber_id: string
          barbershop_id: string | null
          created_at: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          barber_id: string
          barbershop_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_overrides: {
        Row: {
          barber_id: string
          barbershop_id: string
          created_at: string
          id: string
          percentage: number
          service_id: string
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          created_at?: string
          id?: string
          percentage: number
          service_id: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          created_at?: string
          id?: string
          percentage?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_overrides_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_overrides_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          barbershop_id: string
          category: string
          created_at: string
          expense_date: string
          id: string
          is_recurring: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          barbershop_id: string
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barbershop_id?: string
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          barbershop_id: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          total_points: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          total_points?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          total_points?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          barbershop_id: string
          created_at: string
          goal_points: number
          id: string
          is_active: boolean
          points_per_visit: number
          reward_name: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          goal_points?: number
          id?: string
          is_active?: boolean
          points_per_visit?: number
          reward_name?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          goal_points?: number
          id?: string
          is_active?: boolean
          points_per_visit?: number
          reward_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_config_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          points_required: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          points_required: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          appointment_id: string | null
          barbershop_id: string
          created_at: string
          description: string | null
          id: string
          loyalty_card_id: string
          points: number
          reward_id: string | null
          type: string
        }
        Insert: {
          appointment_id?: string | null
          barbershop_id: string
          created_at?: string
          description?: string | null
          id?: string
          loyalty_card_id: string
          points: number
          reward_id?: string | null
          type: string
        }
        Update: {
          appointment_id?: string | null
          barbershop_id?: string
          created_at?: string
          description?: string | null
          id?: string
          loyalty_card_id?: string
          points?: number
          reward_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours: {
        Row: {
          barber_id: string
          barbershop_id: string | null
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_open: boolean
          start_time: string
        }
        Insert: {
          barber_id: string
          barbershop_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_open?: boolean
          start_time: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_open?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          appointment_id: string | null
          barber_id: string | null
          barbershop_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          payment_method: string
          product_id: string
          quantity: number
          sold_at: string
          total_amount: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          barber_id?: string | null
          barbershop_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          product_id: string
          quantity?: number
          sold_at?: string
          total_amount?: number
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string | null
          barbershop_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          product_id?: string
          quantity?: number
          sold_at?: string
          total_amount?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          barbershop_id: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          photo_url: string | null
          sale_price: number
          stock: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          photo_url?: string | null
          sale_price?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          photo_url?: string | null
          sale_price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          barbershop_id: string
          cep: string | null
          cidade: string | null
          created_at: string
          descricao: string | null
          endereco: string | null
          estado: string | null
          foto_capa_url: string | null
          id: string
          instagram_url: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          numero: string | null
          slug_personalizado: string | null
          theme_color: string | null
          updated_at: string
          whatsapp_numero: string | null
        }
        Insert: {
          barbershop_id: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          estado?: string | null
          foto_capa_url?: string | null
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          numero?: string | null
          slug_personalizado?: string | null
          theme_color?: string | null
          updated_at?: string
          whatsapp_numero?: string | null
        }
        Update: {
          barbershop_id?: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          estado?: string | null
          foto_capa_url?: string | null
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          numero?: string | null
          slug_personalizado?: string | null
          theme_color?: string | null
          updated_at?: string
          whatsapp_numero?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          barber_id: string
          barbershop_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          is_global: boolean
          name: string
          photo_url: string | null
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          barber_id: string
          barbershop_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_global?: boolean
          name: string
          photo_url?: string | null
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          barber_id?: string
          barbershop_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_global?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          barbershop_id: string
          created_at: string
          global_message: string | null
          global_phone: string | null
          id: string
          mode: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          global_message?: string | null
          global_phone?: string | null
          id?: string
          mode?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          global_message?: string | null
          global_phone?: string | null
          id?: string
          mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_barber: { Args: { _barbershop_id: string }; Returns: boolean }
      can_barber_edit_schedule: {
        Args: { _target_barber_id: string; _user_id: string }
        Returns: boolean
      }
      can_barber_view_schedule: {
        Args: { _target_barber_id: string; _user_id: string }
        Returns: boolean
      }
      count_barbers_in_barbershop: {
        Args: { _barbershop_id: string }
        Returns: number
      }
      generate_slug: { Args: { input_name: string }; Returns: string }
      get_barber_permissions: {
        Args: { _barber_id: string }
        Returns: {
          can_edit_others_schedule: boolean
          can_edit_own_schedule: boolean
          can_view_others_schedule: boolean
        }[]
      }
      get_current_barber_id: { Args: never; Returns: string }
      get_plan_limit: { Args: { plan_name: string }; Returns: number }
      get_user_barbershop_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_barber_owner: { Args: { p_barber_id: string }; Returns: boolean }
      is_master_of_barbershop: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_subscription_active: {
        Args: { _barbershop_id: string }
        Returns: boolean
      }
      materialize_recurring_expenses: {
        Args: { _barbershop_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "master" | "barber"
      plan_type: "basic" | "plus" | "pro" | "studio" | "rede"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["master", "barber"],
      plan_type: ["basic", "plus", "pro", "studio", "rede"],
    },
  },
} as const
