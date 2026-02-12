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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
          couple_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          contract_value?: number | null
          couple_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          contract_value?: number | null
          couple_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          supplier_id?: string
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
          couple_role: Database["public"]["Enums"]["couple_role"] | null
          created_at: string
          estimated_budget: number | null
          estimated_guests: number | null
          id: string
          invite_code: string | null
          needed_services: string[] | null
          onboarding_completed: boolean
          partner_name: string | null
          updated_at: string
          user_id: string
          wedding_date: string | null
        }
        Insert: {
          couple_role?: Database["public"]["Enums"]["couple_role"] | null
          created_at?: string
          estimated_budget?: number | null
          estimated_guests?: number | null
          id?: string
          invite_code?: string | null
          needed_services?: string[] | null
          onboarding_completed?: boolean
          partner_name?: string | null
          updated_at?: string
          user_id: string
          wedding_date?: string | null
        }
        Update: {
          couple_role?: Database["public"]["Enums"]["couple_role"] | null
          created_at?: string
          estimated_budget?: number | null
          estimated_guests?: number | null
          id?: string
          invite_code?: string | null
          needed_services?: string[] | null
          onboarding_completed?: boolean
          partner_name?: string | null
          updated_at?: string
          user_id?: string
          wedding_date?: string | null
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
      profiles: {
        Row: {
          account_type: string
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          full_name?: string | null
          id?: string
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
      quotes: {
        Row: {
          couple_id: string
          created_at: string
          event_date: string | null
          guest_count: number | null
          id: string
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
      supplier_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
          supplier_id: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
          supplier_id: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
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
      suppliers: {
        Row: {
          category_id: string | null
          city: string | null
          company_name: string
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          guest_max: number | null
          guest_min: number | null
          id: string
          phone: string | null
          price_max: number | null
          price_min: number | null
          promo_percentage: number | null
          rating: number | null
          review_count: number | null
          state: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          guest_max?: number | null
          guest_min?: number | null
          id?: string
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          promo_percentage?: number | null
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          guest_max?: number | null
          guest_min?: number | null
          id?: string
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          promo_percentage?: number | null
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id?: string
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
          title: string
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
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
          title: string
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_couple_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_default_tasks: {
        Args: { _couple_id: string; _wedding_date?: string }
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
