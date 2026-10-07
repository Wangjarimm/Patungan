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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          bill_date: string
          created_at: string
          discount_type: string
          discount_value: number
          extra_fee: number
          id: string
          join_code: string
          owner_id: string
          payer_participant_id: string | null
          rounding_step: number
          service_pct: number
          tax_after_service: boolean
          tax_pct: number
          title: string
          updated_at: string
        }
        Insert: {
          bill_date?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          extra_fee?: number
          id?: string
          join_code?: string
          owner_id?: string
          payer_participant_id?: string | null
          rounding_step?: number
          service_pct?: number
          tax_after_service?: boolean
          tax_pct?: number
          title: string
          updated_at?: string
        }
        Update: {
          bill_date?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          extra_fee?: number
          id?: string
          join_code?: string
          owner_id?: string
          payer_participant_id?: string | null
          rounding_step?: number
          service_pct?: number
          tax_after_service?: boolean
          tax_pct?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payer_fk"
            columns: ["payer_participant_id", "id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id", "bill_id"]
          },
        ]
      }
      group_members: {
        Row: {
          color: string
          display_name: string
          group_id: string
          id: string
          position: number
          profile_id: string | null
        }
        Insert: {
          color: string
          display_name: string
          group_id: string
          id?: string
          position?: number
          profile_id?: string | null
        }
        Update: {
          color?: string
          display_name?: string
          group_id?: string
          id?: string
          position?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_shares: {
        Row: {
          bill_id: string
          item_id: string
          participant_id: string
        }
        Insert: {
          bill_id: string
          item_id: string
          participant_id: string
        }
        Update: {
          bill_id?: string
          item_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_shares_item_id_bill_id_fkey"
            columns: ["item_id", "bill_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id", "bill_id"]
          },
          {
            foreignKeyName: "item_shares_participant_id_bill_id_fkey"
            columns: ["participant_id", "bill_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id", "bill_id"]
          },
        ]
      }
      items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          name: string
          position: number
          qty: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          qty: number
          unit_price: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          bill_id: string
          color: string
          created_at: string
          display_name: string
          id: string
          paid_at: string | null
          paid_marked_by: string | null
          position: number
          profile_id: string | null
        }
        Insert: {
          bill_id: string
          color: string
          created_at?: string
          display_name: string
          id?: string
          paid_at?: string | null
          paid_marked_by?: string | null
          position?: number
          profile_id?: string | null
        }
        Update: {
          bill_id?: string
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          paid_at?: string | null
          paid_marked_by?: string | null
          position?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_paid_marked_by_fkey"
            columns: ["paid_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_name: string
          account_number: string
          created_at: string
          id: string
          is_primary: boolean
          kind: string
          profile_id: string
          provider: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string
          id?: string
          is_primary?: boolean
          kind: string
          profile_id: string
          provider: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          kind?: string
          profile_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          bill_id: string
          id: string
          participant_id: string
          sent_at: string
        }
        Insert: {
          bill_id: string
          id?: string
          participant_id: string
          sent_at?: string
        }
        Update: {
          bill_id?: string
          id?: string
          participant_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_participant_id_bill_id_fkey"
            columns: ["participant_id", "bill_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id", "bill_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_participant: { Args: { p_participant_id: string }; Returns: string }
      generate_join_code: { Args: never; Returns: string }
      is_bill_member: { Args: { p_bill_id: string }; Returns: boolean }
      is_bill_owner: { Args: { p_bill_id: string }; Returns: boolean }
      is_my_participant: {
        Args: { p_participant_id: string }
        Returns: boolean
      }
      join_as_new_participant: {
        Args: { p_code: string; p_color: string; p_display_name: string }
        Returns: Json
      }
      join_bill: { Args: { p_code: string }; Returns: Json }
      normalize_join_code: { Args: { p_code: string }; Returns: string }
      shares_bill_with: { Args: { p_profile_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
