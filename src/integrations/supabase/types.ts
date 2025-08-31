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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      asignaciones_premio: {
        Row: {
          beneficiario_id: string
          beneficiario_tipo: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url: string | null
          costo_real: number | null
          created_at: string
          estado: Database["public"]["Enums"]["asignacion_estado"]
          fecha_asignacion: string
          id: string
          premio_id: string
          updated_at: string
        }
        Insert: {
          beneficiario_id: string
          beneficiario_tipo: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url?: string | null
          costo_real?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["asignacion_estado"]
          fecha_asignacion?: string
          id?: string
          premio_id: string
          updated_at?: string
        }
        Update: {
          beneficiario_id?: string
          beneficiario_tipo?: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url?: string | null
          costo_real?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["asignacion_estado"]
          fecha_asignacion?: string
          id?: string
          premio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_premio_premio_id_fkey"
            columns: ["premio_id"]
            isOneToOne: false
            referencedRelation: "premios"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_partners: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      desafios: {
        Row: {
          created_at: string
          dependencias: Json | null
          descripcion: string | null
          es_grupal: boolean
          estado: Database["public"]["Enums"]["desafio_estado"]
          fecha_fin: string
          fecha_inicio: string
          id: string
          objetivos: Json
          puntos_por_objetivo: Json
          tipo_periodo: Database["public"]["Enums"]["desafio_tipo_periodo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dependencias?: Json | null
          descripcion?: string | null
          es_grupal?: boolean
          estado?: Database["public"]["Enums"]["desafio_estado"]
          fecha_fin: string
          fecha_inicio: string
          id?: string
          objetivos?: Json
          puntos_por_objetivo?: Json
          tipo_periodo: Database["public"]["Enums"]["desafio_tipo_periodo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dependencias?: Json | null
          descripcion?: string | null
          es_grupal?: boolean
          estado?: Database["public"]["Enums"]["desafio_estado"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          objetivos?: Json
          puntos_por_objetivo?: Json
          tipo_periodo?: Database["public"]["Enums"]["desafio_tipo_periodo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empleados: {
        Row: {
          activo: boolean
          apellido: string
          avatar_url: string | null
          created_at: string
          dni: string | null
          email: string
          fecha_ingreso: string
          grupo_id: string | null
          id: string
          legajo: string | null
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          apellido: string
          avatar_url?: string | null
          created_at?: string
          dni?: string | null
          email: string
          fecha_ingreso?: string
          grupo_id?: string | null
          id?: string
          legajo?: string | null
          nombre: string
          rol?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          avatar_url?: string | null
          created_at?: string
          dni?: string | null
          email?: string
          fecha_ingreso?: string
          grupo_id?: string | null
          id?: string
          legajo?: string | null
          nombre?: string
          rol?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      gondolas: {
        Row: {
          brand: string | null
          category: string
          created_at: string | null
          end_date: string | null
          id: string
          image_url: string | null
          notes: string | null
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string | null
          end_date?: string | null
          id: string
          image_url?: string | null
          notes?: string | null
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          position_height?: number
          position_width?: number
          position_x?: number
          position_y?: number
          section?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gondolas_display: {
        Row: {
          display_category: string | null
          id: string
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          display_category?: string | null
          id: string
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          display_category?: string | null
          id?: string
          position_height?: number
          position_width?: number
          position_x?: number
          position_y?: number
          section?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      graphic_elements: {
        Row: {
          color: string | null
          created_at: string
          fill_color: string | null
          font_family: string | null
          font_size: number | null
          font_style: string | null
          font_weight: string | null
          height: number | null
          id: string
          is_visible: boolean | null
          opacity: number | null
          position_x: number
          position_y: number
          rotation: number | null
          stroke_color: string | null
          stroke_width: number | null
          text_align: string | null
          text_content: string | null
          text_decoration: string | null
          type: string
          updated_at: string
          width: number | null
          z_index: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          fill_color?: string | null
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          height?: number | null
          id?: string
          is_visible?: boolean | null
          opacity?: number | null
          position_x: number
          position_y: number
          rotation?: number | null
          stroke_color?: string | null
          stroke_width?: number | null
          text_align?: string | null
          text_content?: string | null
          text_decoration?: string | null
          type: string
          updated_at?: string
          width?: number | null
          z_index?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          fill_color?: string | null
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          height?: number | null
          id?: string
          is_visible?: boolean | null
          opacity?: number | null
          position_x?: number
          position_y?: number
          rotation?: number | null
          stroke_color?: string | null
          stroke_width?: number | null
          text_align?: string | null
          text_content?: string | null
          text_decoration?: string | null
          type?: string
          updated_at?: string
          width?: number | null
          z_index?: number | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          lider_id: string | null
          nombre: string
          sucursal_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          lider_id?: string | null
          nombre: string
          sucursal_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          lider_id?: string | null
          nombre?: string
          sucursal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grupos_lider"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      insignias: {
        Row: {
          activa: boolean
          created_at: string
          criterio: Json
          descripcion: string | null
          icono: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          criterio: Json
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          criterio?: Json
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      insignias_empleado: {
        Row: {
          created_at: string
          empleado_id: string
          fecha_otorgada: string
          id: string
          insignia_id: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          fecha_otorgada?: string
          id?: string
          insignia_id: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          fecha_otorgada?: string
          id?: string
          insignia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insignias_empleado_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insignias_empleado_insignia_id_fkey"
            columns: ["insignia_id"]
            isOneToOne: false
            referencedRelation: "insignias"
            referencedColumns: ["id"]
          },
        ]
      }
      layout_viewport: {
        Row: {
          created_at: string
          height: number
          id: string
          is_active: boolean
          updated_at: string
          width: number
          x: number
          y: number
          zoom: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          width?: number
          x?: number
          y?: number
          zoom?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          width?: number
          x?: number
          y?: number
          zoom?: number
        }
        Relationships: []
      }
      participaciones: {
        Row: {
          created_at: string
          desafio_id: string
          empleado_id: string | null
          evidencia_url: string | null
          fecha_validacion: string | null
          grupo_id: string | null
          id: string
          progreso: number
          updated_at: string
          validado_por: string | null
        }
        Insert: {
          created_at?: string
          desafio_id: string
          empleado_id?: string | null
          evidencia_url?: string | null
          fecha_validacion?: string | null
          grupo_id?: string | null
          id?: string
          progreso?: number
          updated_at?: string
          validado_por?: string | null
        }
        Update: {
          created_at?: string
          desafio_id?: string
          empleado_id?: string | null
          evidencia_url?: string | null
          fecha_validacion?: string | null
          grupo_id?: string | null
          id?: string
          progreso?: number
          updated_at?: string
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participaciones_desafio_id_fkey"
            columns: ["desafio_id"]
            isOneToOne: false
            referencedRelation: "desafios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      premios: {
        Row: {
          activo: boolean
          created_at: string
          criterios_eligibilidad: Json | null
          depende_de: Json | null
          descripcion: string | null
          id: string
          monto_presupuestado: number
          nombre: string
          participantes: Json | null
          stock: number | null
          tipo: Database["public"]["Enums"]["premio_tipo"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          criterios_eligibilidad?: Json | null
          depende_de?: Json | null
          descripcion?: string | null
          id?: string
          monto_presupuestado?: number
          nombre: string
          participantes?: Json | null
          stock?: number | null
          tipo: Database["public"]["Enums"]["premio_tipo"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          criterios_eligibilidad?: Json | null
          depende_de?: Json | null
          descripcion?: string | null
          id?: string
          monto_presupuestado?: number
          nombre?: string
          participantes?: Json | null
          stock?: number | null
          tipo?: Database["public"]["Enums"]["premio_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      profile_access_audit: {
        Row: {
          action: string | null
          id: string
          ip_address: unknown | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_access_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_log: {
        Row: {
          access_timestamp: string | null
          access_type: string | null
          accessed_profile_id: string | null
          accessor_user_id: string | null
          id: string
        }
        Insert: {
          access_timestamp?: string | null
          access_type?: string | null
          accessed_profile_id?: string | null
          accessor_user_id?: string | null
          id?: string
        }
        Update: {
          access_timestamp?: string | null
          access_type?: string | null
          accessed_profile_id?: string | null
          accessor_user_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_access_log_accessed_profile_id_fkey"
            columns: ["accessed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_access_log_accessor_user_id_fkey"
            columns: ["accessor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_security_log: {
        Row: {
          event_details: Json | null
          event_type: string | null
          id: string
          ip_address: unknown | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_details?: Json | null
          event_type?: string | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_details?: Json | null
          event_type?: string | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      puntos: {
        Row: {
          created_at: string
          desafio_id: string | null
          empleado_id: string
          fecha: string
          id: string
          motivo: string
          puntos: number
        }
        Insert: {
          created_at?: string
          desafio_id?: string | null
          empleado_id: string
          fecha?: string
          id?: string
          motivo: string
          puntos: number
        }
        Update: {
          created_at?: string
          desafio_id?: string | null
          empleado_id?: string
          fecha?: string
          id?: string
          motivo?: string
          puntos?: number
        }
        Relationships: [
          {
            foreignKeyName: "puntos_desafio_id_fkey"
            columns: ["desafio_id"]
            isOneToOne: false
            referencedRelation: "desafios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activa: boolean
          ciudad: string | null
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          provincia: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          provincia?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          provincia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      detect_insecure_views: {
        Args: Record<PropertyKey, never>
        Returns: {
          security_risk: string
          view_name: unknown
        }[]
      }
      get_current_empleado: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_gondolas_public_view: {
        Args: Record<PropertyKey, never>
        Returns: {
          brand: string
          category: string
          end_date: string
          id: string
          image_url: string
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
        }[]
      }
      get_profile_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users: number
          admin_users: number
          total_users: number
        }[]
      }
      get_public_gondolas: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          id: string
          position_height: number
          position_width: number
          position_x: number
          position_y: number
          section: string
          status: string
          type: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_gerente_sucursal: {
        Args: { sucursal_uuid?: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_ip?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      asignacion_estado: "pendiente" | "entregado"
      beneficiario_tipo: "empleado" | "grupo"
      desafio_estado: "borrador" | "activo" | "finalizado"
      desafio_tipo_periodo: "semanal" | "mensual" | "semestral" | "anual"
      movimiento_tipo: "egreso" | "ajuste" | "ingreso"
      premio_tipo: "semanal" | "mensual" | "semestral" | "anual"
      user_role: "admin_rrhh" | "gerente_sucursal" | "lider_grupo" | "empleado"
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
      asignacion_estado: ["pendiente", "entregado"],
      beneficiario_tipo: ["empleado", "grupo"],
      desafio_estado: ["borrador", "activo", "finalizado"],
      desafio_tipo_periodo: ["semanal", "mensual", "semestral", "anual"],
      movimiento_tipo: ["egreso", "ajuste", "ingreso"],
      premio_tipo: ["semanal", "mensual", "semestral", "anual"],
      user_role: ["admin_rrhh", "gerente_sucursal", "lider_grupo", "empleado"],
    },
  },
} as const
