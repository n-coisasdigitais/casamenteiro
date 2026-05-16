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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      broadcast_gatilho_execucoes: {
        Row: {
          contexto: Json | null
          enviado_em: string
          gatilho_id: string
          id: string
          user_id: string
        }
        Insert: {
          contexto?: Json | null
          enviado_em?: string
          gatilho_id: string
          id?: string
          user_id: string
        }
        Update: {
          contexto?: Json | null
          enviado_em?: string
          gatilho_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_gatilho_execucoes_gatilho_id_fkey"
            columns: ["gatilho_id"]
            isOneToOne: false
            referencedRelation: "broadcast_gatilhos"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_gatilhos: {
        Row: {
          ativo: boolean
          canais: string[]
          corpo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          dias: number
          id: string
          link: string | null
          nome: string
          publico_alvo: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canais?: string[]
          corpo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dias?: number
          id?: string
          link?: string | null
          nome: string
          publico_alvo: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canais?: string[]
          corpo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dias?: number
          id?: string
          link?: string | null
          nome?: string
          publico_alvo?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_history: {
        Row: {
          admin_id: string
          body: string
          channel: string
          created_at: string
          filters: Json | null
          id: string
          link: string | null
          recipients_count: number
          segment: string
          title: string
        }
        Insert: {
          admin_id: string
          body: string
          channel?: string
          created_at?: string
          filters?: Json | null
          id?: string
          link?: string | null
          recipients_count?: number
          segment: string
          title: string
        }
        Update: {
          admin_id?: string
          body?: string
          channel?: string
          created_at?: string
          filters?: Json | null
          id?: string
          link?: string | null
          recipients_count?: number
          segment?: string
          title?: string
        }
        Relationships: []
      }
      budget_distribution_defaults: {
        Row: {
          category_slug: string
          display_order: number
          essential: boolean
          pct_grande: number
          pct_medio: number
          pct_simples: number
        }
        Insert: {
          category_slug: string
          display_order?: number
          essential?: boolean
          pct_grande: number
          pct_medio: number
          pct_simples: number
        }
        Update: {
          category_slug?: string
          display_order?: number
          essential?: boolean
          pct_grande?: number
          pct_medio?: number
          pct_simples?: number
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          category: string
          couple_id: string
          created_at: string
          description: string
          estimated_cost: number
          final_cost: number | null
          id: string
          notes: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          couple_id: string
          created_at?: string
          description: string
          estimated_cost?: number
          final_cost?: number | null
          id?: string
          notes?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          couple_id?: string
          created_at?: string
          description?: string
          estimated_cost?: number
          final_cost?: number | null
          id?: string
          notes?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_payments: {
        Row: {
          amount: number
          budget_item_id: string
          couple_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          payment_date: string
          status: string
        }
        Insert: {
          amount: number
          budget_item_id: string
          couple_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          payment_date?: string
          status?: string
        }
        Update: {
          amount?: number
          budget_item_id?: string
          couple_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          payment_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_payments_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_payments_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_categoria: {
        Row: {
          ajuda: string | null
          ativo: boolean
          category_id: string
          chave: string
          created_at: string
          grupo: string | null
          id: string
          is_base: boolean
          label: string
          mostrar_no_perfil: boolean
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          placeholder: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ajuda?: string | null
          ativo?: boolean
          category_id: string
          chave: string
          created_at?: string
          grupo?: string | null
          id?: string
          is_base?: boolean
          label: string
          mostrar_no_perfil?: boolean
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ajuda?: string | null
          ativo?: boolean
          category_id?: string
          chave?: string
          created_at?: string
          grupo?: string | null
          id?: string
          is_base?: boolean
          label?: string
          mostrar_no_perfil?: boolean
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_categoria_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cidades_coordenadas: {
        Row: {
          cidade: string
          estado: string
          lat: number
          lng: number
        }
        Insert: {
          cidade: string
          estado: string
          lat: number
          lng: number
        }
        Update: {
          cidade?: string
          estado?: string
          lat?: number
          lng?: number
        }
        Relationships: []
      }
      cidades_interesse: {
        Row: {
          atendida: boolean
          cidade: string
          criado_em: string
          estado: string | null
          id: string
          simulacao_id: string | null
        }
        Insert: {
          atendida?: boolean
          cidade: string
          criado_em?: string
          estado?: string | null
          id?: string
          simulacao_id?: string | null
        }
        Update: {
          atendida?: boolean
          cidade?: string
          criado_em?: string
          estado?: string | null
          id?: string
          simulacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cidades_interesse_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "home_simulacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades_pendentes: {
        Row: {
          cidade: string
          created_at: string
          estado: string | null
          id: string
          notas: string | null
          origem: string
          resolvida: boolean
          supplier_id: string | null
          user_id: string | null
        }
        Insert: {
          cidade: string
          created_at?: string
          estado?: string | null
          id?: string
          notas?: string | null
          origem?: string
          resolvida?: boolean
          supplier_id?: string | null
          user_id?: string | null
        }
        Update: {
          cidade?: string
          created_at?: string
          estado?: string | null
          id?: string
          notas?: string | null
          origem?: string
          resolvida?: boolean
          supplier_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cidades_pendentes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      convite_lembretes: {
        Row: {
          canal: string
          couple_id: string
          created_at: string
          detalhes: Json | null
          enviado_em: string
          id: string
          invite_id: string
          status: string
          tipo: string
        }
        Insert: {
          canal?: string
          couple_id: string
          created_at?: string
          detalhes?: Json | null
          enviado_em?: string
          id?: string
          invite_id: string
          status?: string
          tipo: string
        }
        Update: {
          canal?: string
          couple_id?: string
          created_at?: string
          detalhes?: Json | null
          enviado_em?: string
          id?: string
          invite_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "convite_lembretes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convite_lembretes_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_favorites: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          supplier_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          supplier_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_favorites_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_favorites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_links: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          linked_user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          linked_user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          linked_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_links_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_suppliers: {
        Row: {
          category_id: string | null
          contract_value: number | null
          contracted_at: string | null
          couple_id: string
          created_at: string
          estimated_value: number | null
          external_supplier_category: string | null
          external_supplier_name: string | null
          external_supplier_phone: string | null
          final_value: number | null
          id: string
          is_external: boolean
          kanban_order: number
          kanban_status: string
          notes: string | null
          proposed_value: number | null
          simulation_id: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          contract_value?: number | null
          contracted_at?: string | null
          couple_id: string
          created_at?: string
          estimated_value?: number | null
          external_supplier_category?: string | null
          external_supplier_name?: string | null
          external_supplier_phone?: string | null
          final_value?: number | null
          id?: string
          is_external?: boolean
          kanban_order?: number
          kanban_status?: string
          notes?: string | null
          proposed_value?: number | null
          simulation_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          contract_value?: number | null
          contracted_at?: string | null
          couple_id?: string
          created_at?: string
          estimated_value?: number | null
          external_supplier_category?: string | null
          external_supplier_name?: string | null
          external_supplier_phone?: string | null
          final_value?: number | null
          id?: string
          is_external?: boolean
          kanban_order?: number
          kanban_status?: string
          notes?: string | null
          proposed_value?: number | null
          simulation_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_suppliers_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          budget_mode: string
          ceremony_address: string | null
          ceremony_cep: string | null
          ceremony_lat: number | null
          ceremony_lng: number | null
          ceremony_local_nome: string | null
          ceremony_time: string | null
          contact_phone: string | null
          couple_role: Database["public"]["Enums"]["couple_role"] | null
          created_at: string
          dress_code: string | null
          estimated_budget: number | null
          estimated_guests: number | null
          header_photo_url: string | null
          header_quote: string | null
          id: string
          invite_album: Json
          invite_code: string | null
          invite_message: string | null
          invite_photo_url: string | null
          invite_video_url: string | null
          needed_services: string[] | null
          onboarding_completed: boolean
          partner_name: string | null
          party_duration_hours: number | null
          reception_address: string | null
          reception_cep: string | null
          reception_lat: number | null
          reception_lng: number | null
          reception_local_nome: string | null
          target_budget: number | null
          updated_at: string
          user_id: string
          wedding_city: string | null
          wedding_date: string | null
          wedding_style: string | null
        }
        Insert: {
          budget_mode?: string
          ceremony_address?: string | null
          ceremony_cep?: string | null
          ceremony_lat?: number | null
          ceremony_lng?: number | null
          ceremony_local_nome?: string | null
          ceremony_time?: string | null
          contact_phone?: string | null
          couple_role?: Database["public"]["Enums"]["couple_role"] | null
          created_at?: string
          dress_code?: string | null
          estimated_budget?: number | null
          estimated_guests?: number | null
          header_photo_url?: string | null
          header_quote?: string | null
          id?: string
          invite_album?: Json
          invite_code?: string | null
          invite_message?: string | null
          invite_photo_url?: string | null
          invite_video_url?: string | null
          needed_services?: string[] | null
          onboarding_completed?: boolean
          partner_name?: string | null
          party_duration_hours?: number | null
          reception_address?: string | null
          reception_cep?: string | null
          reception_lat?: number | null
          reception_lng?: number | null
          reception_local_nome?: string | null
          target_budget?: number | null
          updated_at?: string
          user_id: string
          wedding_city?: string | null
          wedding_date?: string | null
          wedding_style?: string | null
        }
        Update: {
          budget_mode?: string
          ceremony_address?: string | null
          ceremony_cep?: string | null
          ceremony_lat?: number | null
          ceremony_lng?: number | null
          ceremony_local_nome?: string | null
          ceremony_time?: string | null
          contact_phone?: string | null
          couple_role?: Database["public"]["Enums"]["couple_role"] | null
          created_at?: string
          dress_code?: string | null
          estimated_budget?: number | null
          estimated_guests?: number | null
          header_photo_url?: string | null
          header_quote?: string | null
          id?: string
          invite_album?: Json
          invite_code?: string | null
          invite_message?: string | null
          invite_photo_url?: string | null
          invite_video_url?: string | null
          needed_services?: string[] | null
          onboarding_completed?: boolean
          partner_name?: string | null
          party_duration_hours?: number | null
          reception_address?: string | null
          reception_cep?: string | null
          reception_lat?: number | null
          reception_lng?: number | null
          reception_local_nome?: string | null
          target_budget?: number | null
          updated_at?: string
          user_id?: string
          wedding_city?: string | null
          wedding_date?: string | null
          wedding_style?: string | null
        }
        Relationships: []
      }
      default_tasks: {
        Row: {
          action_label: string | null
          action_url: string | null
          active: boolean
          category: string
          created_at: string
          due_period: string | null
          id: string
          priority: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          active?: boolean
          category: string
          created_at?: string
          due_period?: string | null
          id?: string
          priority?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          active?: boolean
          category?: string
          created_at?: string
          due_period?: string | null
          id?: string
          priority?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fornecedor_aprovacoes: {
        Row: {
          acao: string
          admin_id: string | null
          created_at: string
          id: string
          motivo: string | null
          supplier_id: string
        }
        Insert: {
          acao: string
          admin_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          supplier_id: string
        }
        Update: {
          acao?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_aprovacoes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_campos: {
        Row: {
          campo_id: string
          created_at: string
          id: string
          supplier_id: string
          updated_at: string
          valor: Json | null
        }
        Insert: {
          campo_id: string
          created_at?: string
          id?: string
          supplier_id: string
          updated_at?: string
          valor?: Json | null
        }
        Update: {
          campo_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
          updated_at?: string
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_campos_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "campos_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_campos_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_landing_config: {
        Row: {
          config: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      frases_home: {
        Row: {
          ativo: boolean
          criado_em: string
          grupo: string
          id: string
          ordem: number
          texto: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          grupo: string
          id?: string
          ordem?: number
          texto: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          grupo?: string
          id?: string
          ordem?: number
          texto?: string
        }
        Relationships: []
      }
      guest_groups: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_invites: {
        Row: {
          couple_id: string
          created_at: string
          guest_id: string
          id: string
          opened_at: string | null
          reminder_sent_at: string | null
          responded_at: string | null
          rsvp_companions: number | null
          rsvp_note: string | null
          rsvp_response: string | null
          sent_at: string | null
          token: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          guest_id: string
          id?: string
          opened_at?: string | null
          reminder_sent_at?: string | null
          responded_at?: string | null
          rsvp_companions?: number | null
          rsvp_note?: string | null
          rsvp_response?: string | null
          sent_at?: string | null
          token?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          opened_at?: string | null
          reminder_sent_at?: string | null
          responded_at?: string | null
          rsvp_companions?: number | null
          rsvp_note?: string | null
          rsvp_response?: string | null
          sent_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_invites_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "wedding_guests"
            referencedColumns: ["id"]
          },
        ]
      }
      home_simulacoes: {
        Row: {
          cidade: string | null
          couple_id: string | null
          criado_em: string
          data_evento: string | null
          estilo: string | null
          id: string
          is_active_plan: boolean
          num_convidados: number
          orcamento_total: number
          prazo_meses: number | null
          resultado: Json | null
          user_id: string | null
        }
        Insert: {
          cidade?: string | null
          couple_id?: string | null
          criado_em?: string
          data_evento?: string | null
          estilo?: string | null
          id?: string
          is_active_plan?: boolean
          num_convidados: number
          orcamento_total: number
          prazo_meses?: number | null
          resultado?: Json | null
          user_id?: string | null
        }
        Update: {
          cidade?: string | null
          couple_id?: string | null
          criado_em?: string
          data_evento?: string | null
          estilo?: string | null
          id?: string
          is_active_plan?: boolean
          num_convidados?: number
          orcamento_total?: number
          prazo_meses?: number | null
          resultado?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_template: boolean
          message: string
          quote_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_template?: boolean
          message: string
          quote_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_template?: boolean
          message?: string
          quote_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_proposals: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          kind: string
          quote_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          quote_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          quote_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          couple_id: string
          created_at: string
          event_date: string | null
          guest_count: number | null
          id: string
          kanban_status: string
          message: string
          phone: string | null
          phone_visible: boolean
          status: string
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          event_date?: string | null
          guest_count?: number | null
          id?: string
          kanban_status?: string
          message: string
          phone?: string | null
          phone_visible?: boolean
          status?: string
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          event_date?: string | null
          guest_count?: number | null
          id?: string
          kanban_status?: string
          message?: string
          phone?: string | null
          phone_visible?: boolean
          status?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          couple_id: string
          created_at: string
          id: string
          rating: number
          supplier_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          couple_id: string
          created_at?: string
          id?: string
          rating: number
          supplier_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          rating?: number
          supplier_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      secoes_home: {
        Row: {
          ativo: boolean
          criado_em: string
          foto_url: string
          frase: string
          id: string
          ordem: number
          subtexto: string | null
          supplier_id: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          foto_url: string
          frase: string
          id?: string
          ordem?: number
          subtexto?: string | null
          supplier_id?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string
          frase?: string
          id?: string
          ordem?: number
          subtexto?: string | null
          supplier_id?: string | null
        }
        Relationships: []
      }
      simulated_budgets: {
        Row: {
          categorias_selecionadas: string[] | null
          cidade: string | null
          couple_id: string | null
          created_at: string
          distribuicao: Json
          estado: string | null
          estilo: string | null
          id: string
          num_convidados: number
          orcamento_total: number
        }
        Insert: {
          categorias_selecionadas?: string[] | null
          cidade?: string | null
          couple_id?: string | null
          created_at?: string
          distribuicao?: Json
          estado?: string | null
          estilo?: string | null
          id?: string
          num_convidados: number
          orcamento_total: number
        }
        Update: {
          categorias_selecionadas?: string[] | null
          cidade?: string | null
          couple_id?: string | null
          created_at?: string
          distribuicao?: Json
          estado?: string | null
          estilo?: string | null
          id?: string
          num_convidados?: number
          orcamento_total?: number
        }
        Relationships: []
      }
      supplier_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          external_event_id: string | null
          id: string
          reason: string | null
          source: string
          supplier_id: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          external_event_id?: string | null
          id?: string
          reason?: string | null
          source?: string
          supplier_id: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          external_event_id?: string | null
          id?: string
          reason?: string | null
          source?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_blocked_dates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_calendar_connections: {
        Row: {
          access_token: string
          account_email: string | null
          calendar_id: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          supplier_id: string
          sync_enabled: boolean
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          account_email?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          supplier_id: string
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_email?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          supplier_id?: string
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supplier_details_beleza: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_beleza_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_buffet: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_buffet_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_cerimonialista: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_cerimonialista_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_convites: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_convites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_decoracao: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_decoracao_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_fotografo: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_fotografo_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_local: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_local_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_musica: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_musica_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_details_trajes: {
        Row: {
          created_at: string
          data: Json
          id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_details_trajes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_leads: {
        Row: {
          cidade_evento: string | null
          comissao_gerada: number | null
          couple_id: string | null
          created_at: string
          data_contato: string
          data_evento: string | null
          email_casal: string | null
          id: string
          nome_casal: string | null
          num_convidados: number | null
          orcamento_total: number | null
          origem: string
          status_lead: string
          supplier_id: string
          updated_at: string
          valor_fechado: number | null
          whatsapp_casal: string | null
        }
        Insert: {
          cidade_evento?: string | null
          comissao_gerada?: number | null
          couple_id?: string | null
          created_at?: string
          data_contato?: string
          data_evento?: string | null
          email_casal?: string | null
          id?: string
          nome_casal?: string | null
          num_convidados?: number | null
          orcamento_total?: number | null
          origem?: string
          status_lead?: string
          supplier_id: string
          updated_at?: string
          valor_fechado?: number | null
          whatsapp_casal?: string | null
        }
        Update: {
          cidade_evento?: string | null
          comissao_gerada?: number | null
          couple_id?: string | null
          created_at?: string
          data_contato?: string
          data_evento?: string | null
          email_casal?: string | null
          id?: string
          nome_casal?: string | null
          num_convidados?: number | null
          orcamento_total?: number | null
          origem?: string
          status_lead?: string
          supplier_id?: string
          updated_at?: string
          valor_fechado?: number | null
          whatsapp_casal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_leads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          photo_url: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_photos_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profile_views: {
        Row: {
          id: string
          supplier_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profile_views_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_promo_dates: {
        Row: {
          created_at: string
          discount_pct: number
          id: string
          note: string | null
          promo_date: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          discount_pct: number
          id?: string
          note?: string | null
          promo_date: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          id?: string
          note?: string | null
          promo_date?: string
          supplier_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          accepts_idle_dates: boolean
          aparece_na_home: boolean
          category_id: string | null
          cidades_atendidas: Json
          city: string | null
          company_name: string
          cover_photo_url: string | null
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          guest_max: number | null
          guest_min: number | null
          id: string
          idle_discount_pct: number | null
          instagram: string | null
          is_demo: boolean
          lat: number | null
          lng: number | null
          onboarding_completed: boolean
          onboarding_step: number
          phone: string | null
          price_max: number | null
          price_min: number | null
          profile_photo_url: string | null
          promo_percentage: number | null
          raio_atendimento_km: number
          rating: number | null
          review_count: number | null
          state: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accepts_idle_dates?: boolean
          aparece_na_home?: boolean
          category_id?: string | null
          cidades_atendidas?: Json
          city?: string | null
          company_name: string
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          guest_max?: number | null
          guest_min?: number | null
          id?: string
          idle_discount_pct?: number | null
          instagram?: string | null
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          profile_photo_url?: string | null
          promo_percentage?: number | null
          raio_atendimento_km?: number
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accepts_idle_dates?: boolean
          aparece_na_home?: boolean
          category_id?: string | null
          cidades_atendidas?: Json
          city?: string | null
          company_name?: string
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          guest_max?: number | null
          guest_min?: number | null
          id?: string
          idle_discount_pct?: number | null
          instagram?: string | null
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          profile_photo_url?: string | null
          promo_percentage?: number | null
          raio_atendimento_km?: number
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wedding_guests: {
        Row: {
          couple_id: string
          created_at: string
          email: string | null
          group_id: string | null
          guest_type: string
          id: string
          max_companions: number
          menu_preference: string | null
          name: string
          notes: string | null
          phone: string | null
          rsvp_status: string
          table_number: number | null
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          email?: string | null
          group_id?: string | null
          guest_type?: string
          id?: string
          max_companions?: number
          menu_preference?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rsvp_status?: string
          table_number?: number | null
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          email?: string | null
          group_id?: string | null
          guest_type?: string
          id?: string
          max_companions?: number
          menu_preference?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rsvp_status?: string
          table_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_guests_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_tasks: {
        Row: {
          action_label: string | null
          action_url: string | null
          auto_completed_at: string | null
          auto_completed_source: string | null
          category: string
          completed_at: string | null
          couple_id: string
          created_at: string
          description: string | null
          due_date: string | null
          due_period: string | null
          id: string
          is_completed: boolean
          is_custom: boolean
          priority: string
          sort_order: number
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          auto_completed_at?: string | null
          auto_completed_source?: string | null
          category?: string
          completed_at?: string | null
          couple_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_period?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          priority?: string
          sort_order?: number
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          auto_completed_at?: string | null
          auto_completed_source?: string | null
          category?: string
          completed_at?: string | null
          couple_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_period?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          priority?: string
          sort_order?: number
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_tasks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_tasks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_broadcast_notification: {
        Args: {
          _body: string
          _link?: string
          _segment: string
          _title: string
        }
        Returns: number
      }
      admin_broadcast_segmented: {
        Args: {
          _body: string
          _category_id?: string
          _city?: string
          _days_to_wedding_max?: number
          _link?: string
          _segment: string
          _title: string
        }
        Returns: number
      }
      admin_mark_commission_paid: {
        Args: { _amount: number; _lead_id: string }
        Returns: undefined
      }
      admin_set_user_suspended: {
        Args: { _reason?: string; _suspended: boolean; _user_id: string }
        Returns: undefined
      }
      admin_toggle_admin_role: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: undefined
      }
      buscar_cidades_brasil: {
        Args: { _prefix: string }
        Returns: {
          cidade: string
          estado: string
          lat: number
          lng: number
        }[]
      }
      cidades_disponiveis: {
        Args: { _prefix: string }
        Returns: {
          cidade: string
          estado: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_couple_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          ceremony_address: string
          ceremony_lat: number
          ceremony_lng: number
          ceremony_local_nome: string
          ceremony_time: string
          contact_phone: string
          dress_code: string
          guest_name: string
          invite_album: Json
          invite_id: string
          invite_message: string
          invite_photo_url: string
          invite_video_url: string
          max_companions: number
          partner_name: string
          reception_address: string
          reception_lat: number
          reception_lng: number
          reception_local_nome: string
          responded_at: string
          rsvp_companions: number
          rsvp_note: string
          rsvp_response: string
          user_full_name: string
          wedding_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_partner_by_invite_code: { Args: { _code: string }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_task_due_dates: {
        Args: { _couple_id: string }
        Returns: undefined
      }
      respond_invite: {
        Args: {
          _companions?: number
          _note?: string
          _response: string
          _token: string
        }
        Returns: boolean
      }
      seed_base_category_fields: {
        Args: { _category_id: string }
        Returns: undefined
      }
      seed_default_tasks: {
        Args: { _couple_id: string; _wedding_date?: string }
        Returns: undefined
      }
      seed_default_tasks_from_table: {
        Args: { _couple_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      couple_role: "noivo" | "noiva"
      supplier_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      couple_role: ["noivo", "noiva"],
      supplier_status: ["pending", "approved", "rejected"],
    },
  },
} as const
