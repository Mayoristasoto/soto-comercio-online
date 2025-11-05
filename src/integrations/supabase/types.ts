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
      app_pages: {
        Row: {
          created_at: string
          descripcion: string | null
          icon: string | null
          id: string
          mostrar_en_sidebar: boolean | null
          nombre: string
          orden: number
          parent_id: string | null
          path: string
          requiere_auth: boolean
          roles_permitidos: string[] | null
          tipo: string | null
          titulo_pagina: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          icon?: string | null
          id?: string
          mostrar_en_sidebar?: boolean | null
          nombre: string
          orden?: number
          parent_id?: string | null
          path: string
          requiere_auth?: boolean
          roles_permitidos?: string[] | null
          tipo?: string | null
          titulo_pagina?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          icon?: string | null
          id?: string
          mostrar_en_sidebar?: boolean | null
          nombre?: string
          orden?: number
          parent_id?: string | null
          path?: string
          requiere_auth?: boolean
          roles_permitidos?: string[] | null
          tipo?: string | null
          titulo_pagina?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "app_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "app_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_capacitacion: {
        Row: {
          capacitacion_id: string
          created_at: string
          empleado_id: string
          estado: string
          fecha_asignacion: string
          fecha_completada: string | null
          id: string
          updated_at: string
        }
        Insert: {
          capacitacion_id: string
          created_at?: string
          empleado_id: string
          estado?: string
          fecha_asignacion?: string
          fecha_completada?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          capacitacion_id?: string
          created_at?: string
          empleado_id?: string
          estado?: string
          fecha_asignacion?: string
          fecha_completada?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_capacitacion_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_capacitacion_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_documentos_obligatorios: {
        Row: {
          activa: boolean
          asignado_por: string | null
          created_at: string
          documento_id: string
          empleado_id: string
          fecha_asignacion: string
          fecha_limite_lectura: string | null
          id: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          asignado_por?: string | null
          created_at?: string
          documento_id: string
          empleado_id: string
          fecha_asignacion?: string
          fecha_limite_lectura?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          asignado_por?: string | null
          created_at?: string
          documento_id?: string
          empleado_id?: string
          fecha_asignacion?: string
          fecha_limite_lectura?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      asignaciones_premio: {
        Row: {
          acreditado_sistema_comercial: boolean | null
          beneficiario_id: string
          beneficiario_tipo: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url: string | null
          costo_real: number | null
          created_at: string
          estado: Database["public"]["Enums"]["asignacion_estado"]
          fecha_acreditacion: string | null
          fecha_asignacion: string
          id: string
          premio_id: string
          respuesta_sistema_comercial: Json | null
          updated_at: string
        }
        Insert: {
          acreditado_sistema_comercial?: boolean | null
          beneficiario_id: string
          beneficiario_tipo: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url?: string | null
          costo_real?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["asignacion_estado"]
          fecha_acreditacion?: string | null
          fecha_asignacion?: string
          id?: string
          premio_id: string
          respuesta_sistema_comercial?: Json | null
          updated_at?: string
        }
        Update: {
          acreditado_sistema_comercial?: boolean | null
          beneficiario_id?: string
          beneficiario_tipo?: Database["public"]["Enums"]["beneficiario_tipo"]
          comprobante_url?: string | null
          costo_real?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["asignacion_estado"]
          fecha_acreditacion?: string | null
          fecha_asignacion?: string
          id?: string
          premio_id?: string
          respuesta_sistema_comercial?: Json | null
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
      ausencias_medicas: {
        Row: {
          certificado_url: string | null
          created_at: string
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          observaciones: string | null
          registrado_por: string | null
          tipo_enfermedad: string | null
          updated_at: string
        }
        Insert: {
          certificado_url?: string | null
          created_at?: string
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          observaciones?: string | null
          registrado_por?: string | null
          tipo_enfermedad?: string | null
          updated_at?: string
        }
        Update: {
          certificado_url?: string | null
          created_at?: string
          empleado_id?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          registrado_por?: string | null
          tipo_enfermedad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_medicas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_medicas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_medicas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_medicas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_logs: {
        Row: {
          created_at: string
          datos_adicionales: Json | null
          email: string
          evento: string
          exitoso: boolean
          id: string
          ip_address: unknown
          mensaje_error: string | null
          metodo: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          datos_adicionales?: Json | null
          email: string
          evento: string
          exitoso?: boolean
          id?: string
          ip_address?: unknown
          mensaje_error?: string | null
          metodo?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          datos_adicionales?: Json | null
          email?: string
          evento?: string
          exitoso?: boolean
          id?: string
          ip_address?: unknown
          mensaje_error?: string | null
          metodo?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      calificaciones_config: {
        Row: {
          clave: string
          descripcion: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      calificaciones_empleados: {
        Row: {
          calificacion: number
          calificacion_servicio: number | null
          cliente_dni: string | null
          cliente_nombre_completo: string | null
          cliente_telefono: string | null
          comentario: string | null
          created_at: string
          empleado_id: string
          fecha_calificacion: string
          id: string
          ip_address: unknown
          participa_sorteo: boolean | null
          sorteo_numero: number | null
          token_usado: string
          venta_id: string | null
        }
        Insert: {
          calificacion: number
          calificacion_servicio?: number | null
          cliente_dni?: string | null
          cliente_nombre_completo?: string | null
          cliente_telefono?: string | null
          comentario?: string | null
          created_at?: string
          empleado_id: string
          fecha_calificacion?: string
          id?: string
          ip_address?: unknown
          participa_sorteo?: boolean | null
          sorteo_numero?: number | null
          token_usado: string
          venta_id?: string | null
        }
        Update: {
          calificacion?: number
          calificacion_servicio?: number | null
          cliente_dni?: string | null
          cliente_nombre_completo?: string | null
          cliente_telefono?: string | null
          comentario?: string | null
          created_at?: string
          empleado_id?: string
          fecha_calificacion?: string
          id?: string
          ip_address?: unknown
          participa_sorteo?: boolean | null
          sorteo_numero?: number | null
          token_usado?: string
          venta_id?: string | null
        }
        Relationships: []
      }
      capacitaciones: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          duracion_estimada: number | null
          id: string
          obligatoria: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          obligatoria?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          obligatoria?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      confirmaciones_lectura: {
        Row: {
          asignacion_id: string
          created_at: string
          documento_id: string
          empleado_id: string
          fecha_confirmacion: string
          id: string
          ip_confirmacion: unknown
        }
        Insert: {
          asignacion_id: string
          created_at?: string
          documento_id: string
          empleado_id: string
          fecha_confirmacion?: string
          id?: string
          ip_confirmacion?: unknown
        }
        Update: {
          asignacion_id?: string
          created_at?: string
          documento_id?: string
          empleado_id?: string
          fecha_confirmacion?: string
          id?: string
          ip_confirmacion?: unknown
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
      dias_feriados: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_firmas: {
        Row: {
          created_at: string
          documento_id: string
          empleado_id: string
          fecha_firma: string
          firma_id: string
          id: string
          ip_address: unknown
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          documento_id: string
          empleado_id: string
          fecha_firma?: string
          firma_id: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          documento_id?: string
          empleado_id?: string
          fecha_firma?: string
          firma_id?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_firmas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_obligatorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_firmas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_firmas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_firmas_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "empleados_firmas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_obligatorios: {
        Row: {
          activo: boolean
          contenido: string | null
          created_at: string
          descripcion: string | null
          fecha_vigencia_desde: string | null
          fecha_vigencia_hasta: string | null
          id: string
          tipo_documento: string
          titulo: string
          updated_at: string
          url_archivo: string | null
        }
        Insert: {
          activo?: boolean
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          id?: string
          tipo_documento?: string
          titulo: string
          updated_at?: string
          url_archivo?: string | null
        }
        Update: {
          activo?: boolean
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          id?: string
          tipo_documento?: string
          titulo?: string
          updated_at?: string
          url_archivo?: string | null
        }
        Relationships: []
      }
      empleado_access_log: {
        Row: {
          access_type: string | null
          accessed_empleado_id: string | null
          id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          access_type?: string | null
          accessed_empleado_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string | null
          accessed_empleado_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      empleado_cruces_rojas: {
        Row: {
          anulada: boolean | null
          anulada_por: string | null
          created_at: string | null
          empleado_id: string
          fecha_infraccion: string
          fichaje_id: string | null
          id: string
          minutos_diferencia: number | null
          motivo_anulacion: string | null
          observaciones: string | null
          tipo_infraccion: string
        }
        Insert: {
          anulada?: boolean | null
          anulada_por?: string | null
          created_at?: string | null
          empleado_id: string
          fecha_infraccion?: string
          fichaje_id?: string | null
          id?: string
          minutos_diferencia?: number | null
          motivo_anulacion?: string | null
          observaciones?: string | null
          tipo_infraccion: string
        }
        Update: {
          anulada?: boolean | null
          anulada_por?: string | null
          created_at?: string | null
          empleado_id?: string
          fecha_infraccion?: string
          fichaje_id?: string | null
          id?: string
          minutos_diferencia?: number | null
          motivo_anulacion?: string | null
          observaciones?: string | null
          tipo_infraccion?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleado_cruces_rojas_anulada_por_fkey"
            columns: ["anulada_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_cruces_rojas_anulada_por_fkey"
            columns: ["anulada_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_cruces_rojas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_cruces_rojas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_cruces_rojas_fichaje_id_fkey"
            columns: ["fichaje_id"]
            isOneToOne: false
            referencedRelation: "fichajes"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_documentos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          empleado_id: string
          fecha_subida: string
          id: string
          nombre_archivo: string
          subido_por: string | null
          tipo_documento: string
          updated_at: string
          url_archivo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          fecha_subida?: string
          id?: string
          nombre_archivo: string
          subido_por?: string | null
          tipo_documento: string
          updated_at?: string
          url_archivo: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          fecha_subida?: string
          id?: string
          nombre_archivo?: string
          subido_por?: string | null
          tipo_documento?: string
          updated_at?: string
          url_archivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleado_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_permisos: {
        Row: {
          asignado_por: string | null
          created_at: string
          empleado_id: string
          fecha_asignacion: string
          habilitado: boolean
          id: string
          modulo: string
          permiso: string
          updated_at: string
        }
        Insert: {
          asignado_por?: string | null
          created_at?: string
          empleado_id: string
          fecha_asignacion?: string
          habilitado?: boolean
          id?: string
          modulo: string
          permiso: string
          updated_at?: string
        }
        Update: {
          asignado_por?: string | null
          created_at?: string
          empleado_id?: string
          fecha_asignacion?: string
          habilitado?: boolean
          id?: string
          modulo?: string
          permiso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleado_permisos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_permisos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_permisos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_permisos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_turnos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empleado_id: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          turno_id: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empleado_id?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          turno_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          empleado_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          turno_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleado_turnos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_turnos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_turnos_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "fichado_turnos"
            referencedColumns: ["id"]
          },
        ]
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
          puesto: string | null
          puesto_id: string | null
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
          puesto?: string | null
          puesto_id?: string | null
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
          puesto?: string | null
          puesto_id?: string | null
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
          {
            foreignKeyName: "fk_empleados_puesto"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_anotaciones: {
        Row: {
          archivos_adjuntos: string[] | null
          categoria: Database["public"]["Enums"]["anotacion_categoria"]
          creado_por: string
          created_at: string
          descripcion: string | null
          empleado_id: string
          es_critica: boolean | null
          fecha_anotacion: string
          fecha_seguimiento: string | null
          id: string
          requiere_seguimiento: boolean | null
          seguimiento_completado: boolean | null
          titulo: string
          updated_at: string
        }
        Insert: {
          archivos_adjuntos?: string[] | null
          categoria: Database["public"]["Enums"]["anotacion_categoria"]
          creado_por: string
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          es_critica?: boolean | null
          fecha_anotacion?: string
          fecha_seguimiento?: string | null
          id?: string
          requiere_seguimiento?: boolean | null
          seguimiento_completado?: boolean | null
          titulo: string
          updated_at?: string
        }
        Update: {
          archivos_adjuntos?: string[] | null
          categoria?: Database["public"]["Enums"]["anotacion_categoria"]
          creado_por?: string
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          es_critica?: boolean | null
          fecha_anotacion?: string
          fecha_seguimiento?: string | null
          id?: string
          requiere_seguimiento?: boolean | null
          seguimiento_completado?: boolean | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_anotaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_anotaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_anotaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_anotaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_audit_log: {
        Row: {
          datos_accedidos: string[] | null
          empleado_accedido_id: string
          id: string
          ip_address: unknown
          timestamp_acceso: string
          tipo_acceso: string
          user_agent: string | null
          usuario_acceso_id: string | null
        }
        Insert: {
          datos_accedidos?: string[] | null
          empleado_accedido_id: string
          id?: string
          ip_address?: unknown
          timestamp_acceso?: string
          tipo_acceso: string
          user_agent?: string | null
          usuario_acceso_id?: string | null
        }
        Update: {
          datos_accedidos?: string[] | null
          empleado_accedido_id?: string
          id?: string
          ip_address?: unknown
          timestamp_acceso?: string
          tipo_acceso?: string
          user_agent?: string | null
          usuario_acceso_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_empleados_audit_empleado"
            columns: ["empleado_accedido_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empleados_audit_empleado"
            columns: ["empleado_accedido_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_datos_sensibles: {
        Row: {
          created_at: string
          direccion: string | null
          dni: string | null
          emergencia_contacto_nombre: string | null
          emergencia_contacto_telefono: string | null
          empleado_id: string
          estado_civil: string | null
          face_descriptor: number[] | null
          fecha_nacimiento: string | null
          id: string
          salario: number | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          dni?: string | null
          emergencia_contacto_nombre?: string | null
          emergencia_contacto_telefono?: string | null
          empleado_id: string
          estado_civil?: string | null
          face_descriptor?: number[] | null
          fecha_nacimiento?: string | null
          id?: string
          salario?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          dni?: string | null
          emergencia_contacto_nombre?: string | null
          emergencia_contacto_telefono?: string | null
          empleado_id?: string
          estado_civil?: string | null
          face_descriptor?: number[] | null
          fecha_nacimiento?: string | null
          id?: string
          salario?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_empleados_datos_sensibles_empleado"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empleados_datos_sensibles_empleado"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_firmas: {
        Row: {
          created_at: string
          empleado_id: string
          es_activa: boolean
          fecha_creacion: string
          firma_data: string
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          es_activa?: boolean
          fecha_creacion?: string
          firma_data: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          es_activa?: boolean
          fecha_creacion?: string
          firma_data?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_firmas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_firmas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_rostros: {
        Row: {
          capture_metadata: Json | null
          confidence_score: number | null
          created_at: string | null
          empleado_id: string
          face_descriptor: number[]
          id: string
          is_active: boolean | null
          updated_at: string | null
          version_name: string
        }
        Insert: {
          capture_metadata?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          empleado_id: string
          face_descriptor: number[]
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version_name?: string
        }
        Update: {
          capture_metadata?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          empleado_id?: string
          face_descriptor?: number[]
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_rostros_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_rostros_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_elementos: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string | null
          empleado_id: string
          entregado_por: string
          estado: string
          fecha_confirmacion: string | null
          fecha_entrega: string
          firma_empleado: string | null
          id: string
          observaciones: string | null
          plantilla_id: string | null
          talla: string | null
          tipo_elemento: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          entregado_por: string
          estado?: string
          fecha_confirmacion?: string | null
          fecha_entrega?: string
          firma_empleado?: string | null
          id?: string
          observaciones?: string | null
          plantilla_id?: string | null
          talla?: string | null
          tipo_elemento: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          entregado_por?: string
          estado?: string
          fecha_confirmacion?: string | null
          fecha_entrega?: string
          firma_empleado?: string | null
          id?: string
          observaciones?: string | null
          plantilla_id?: string | null
          talla?: string | null
          tipo_elemento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_elementos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_elementos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_elementos_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_elementos_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_elementos_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_elementos"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_capacitacion: {
        Row: {
          activa: boolean
          capacitacion_id: string
          created_at: string
          descripcion: string | null
          id: string
          intentos_maximos: number
          puntaje_minimo: number
          tiempo_limite: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          capacitacion_id: string
          created_at?: string
          descripcion?: string | null
          id?: string
          intentos_maximos?: number
          puntaje_minimo?: number
          tiempo_limite?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          capacitacion_id?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          intentos_maximos?: number
          puntaje_minimo?: number
          tiempo_limite?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      evaluaciones_conceptos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      evaluaciones_detalles: {
        Row: {
          comentario: string | null
          concepto_id: string
          created_at: string
          evaluacion_id: string
          id: string
          puntuacion: number
        }
        Insert: {
          comentario?: string | null
          concepto_id: string
          created_at?: string
          evaluacion_id: string
          id?: string
          puntuacion: number
        }
        Update: {
          comentario?: string | null
          concepto_id?: string
          created_at?: string
          evaluacion_id?: string
          id?: string
          puntuacion?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_detalles_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_detalles_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_mensuales: {
        Row: {
          anio: number
          created_at: string
          empleado_id: string
          estado: string
          evaluador_id: string
          fecha_completada: string | null
          id: string
          mes: number
          observaciones: string | null
          puntuacion_promedio: number | null
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          empleado_id: string
          estado?: string
          evaluador_id: string
          fecha_completada?: string | null
          id?: string
          mes: number
          observaciones?: string | null
          puntuacion_promedio?: number | null
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          empleado_id?: string
          estado?: string
          evaluador_id?: string
          fecha_completada?: string | null
          id?: string
          mes?: number
          observaciones?: string | null
          puntuacion_promedio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_mensuales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_mensuales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_mensuales_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_mensuales_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      facial_auth_rate_limit: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: unknown
          last_attempt: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address: unknown
          last_attempt?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          last_attempt?: string
          window_start?: string
        }
        Relationships: []
      }
      facial_photo_uploads: {
        Row: {
          comentarios: string | null
          created_at: string
          empleado_id: string
          estado: string
          fecha_revision: string | null
          id: string
          photo_url: string
          revisado_por: string | null
          updated_at: string
        }
        Insert: {
          comentarios?: string | null
          created_at?: string
          empleado_id: string
          estado?: string
          fecha_revision?: string | null
          id?: string
          photo_url: string
          revisado_por?: string | null
          updated_at?: string
        }
        Update: {
          comentarios?: string | null
          created_at?: string
          empleado_id?: string
          estado?: string
          fecha_revision?: string | null
          id?: string
          photo_url?: string
          revisado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facial_photo_uploads_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_photo_uploads_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_photo_uploads_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_photo_uploads_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      facial_recognition_config: {
        Row: {
          data_type: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          data_type?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          data_type?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      feriado_empleados_asignados: {
        Row: {
          asignado_por: string | null
          created_at: string
          empleado_id: string
          feriado_id: string
          id: string
          sucursal_id: string
        }
        Insert: {
          asignado_por?: string | null
          created_at?: string
          empleado_id: string
          feriado_id: string
          id?: string
          sucursal_id: string
        }
        Update: {
          asignado_por?: string | null
          created_at?: string
          empleado_id?: string
          feriado_id?: string
          id?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriado_empleados_asignados_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feriado_empleados_asignados_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feriado_empleados_asignados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feriado_empleados_asignados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feriado_empleados_asignados_feriado_id_fkey"
            columns: ["feriado_id"]
            isOneToOne: false
            referencedRelation: "dias_feriados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feriado_empleados_asignados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      fichado_configuracion: {
        Row: {
          clave: string
          descripcion: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "fichado_configuracion_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichado_configuracion_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      fichado_turnos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          duracion_pausa_minutos: number | null
          hora_entrada: string
          hora_pausa_fin: string | null
          hora_pausa_inicio: string | null
          hora_salida: string
          id: string
          nombre: string
          permite_extras: boolean | null
          redondeo_minutos: number | null
          sucursal_id: string | null
          tipo: Database["public"]["Enums"]["turno_tipo"] | null
          tolerancia_entrada_minutos: number | null
          tolerancia_salida_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          duracion_pausa_minutos?: number | null
          hora_entrada: string
          hora_pausa_fin?: string | null
          hora_pausa_inicio?: string | null
          hora_salida: string
          id?: string
          nombre: string
          permite_extras?: boolean | null
          redondeo_minutos?: number | null
          sucursal_id?: string | null
          tipo?: Database["public"]["Enums"]["turno_tipo"] | null
          tolerancia_entrada_minutos?: number | null
          tolerancia_salida_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          duracion_pausa_minutos?: number | null
          hora_entrada?: string
          hora_pausa_fin?: string | null
          hora_pausa_inicio?: string | null
          hora_salida?: string
          id?: string
          nombre?: string
          permite_extras?: boolean | null
          redondeo_minutos?: number | null
          sucursal_id?: string | null
          tipo?: Database["public"]["Enums"]["turno_tipo"] | null
          tolerancia_entrada_minutos?: number | null
          tolerancia_salida_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichado_turnos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      fichado_ubicaciones: {
        Row: {
          activa: boolean | null
          created_at: string | null
          direccion: string | null
          id: string
          ip_whitelist: string[] | null
          latitud: number | null
          longitud: number | null
          nombre: string
          radio_metros: number | null
          sucursal_id: string | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          ip_whitelist?: string[] | null
          latitud?: number | null
          longitud?: number | null
          nombre: string
          radio_metros?: number | null
          sucursal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          ip_whitelist?: string[] | null
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          radio_metros?: number | null
          sucursal_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichado_ubicaciones_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      fichaje_auditoria: {
        Row: {
          accion: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          id: string
          ip_address: unknown
          registro_id: string
          tabla_afectada: string
          timestamp_accion: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          ip_address?: unknown
          registro_id: string
          tabla_afectada: string
          timestamp_accion?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          ip_address?: unknown
          registro_id?: string
          tabla_afectada?: string
          timestamp_accion?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichaje_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      fichaje_incidencias: {
        Row: {
          aprobado_por: string | null
          comentarios_aprobador: string | null
          created_at: string | null
          descripcion: string
          documentos_adjuntos: string[] | null
          empleado_id: string | null
          estado: Database["public"]["Enums"]["incidencia_estado"] | null
          fecha_aprobacion: string | null
          fecha_incidencia: string
          fichaje_id: string | null
          hora_propuesta: string | null
          id: string
          tipo: Database["public"]["Enums"]["incidencia_tipo"]
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          comentarios_aprobador?: string | null
          created_at?: string | null
          descripcion: string
          documentos_adjuntos?: string[] | null
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["incidencia_estado"] | null
          fecha_aprobacion?: string | null
          fecha_incidencia: string
          fichaje_id?: string | null
          hora_propuesta?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["incidencia_tipo"]
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          comentarios_aprobador?: string | null
          created_at?: string | null
          descripcion?: string
          documentos_adjuntos?: string[] | null
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["incidencia_estado"] | null
          fecha_aprobacion?: string | null
          fecha_incidencia?: string
          fichaje_id?: string | null
          hora_propuesta?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["incidencia_tipo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichaje_incidencias_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_fichaje_id_fkey"
            columns: ["fichaje_id"]
            isOneToOne: false
            referencedRelation: "fichajes"
            referencedColumns: ["id"]
          },
        ]
      }
      fichajes: {
        Row: {
          confianza_facial: number | null
          created_at: string | null
          datos_adicionales: Json | null
          empleado_id: string | null
          estado: Database["public"]["Enums"]["fichaje_estado"] | null
          id: string
          ip_address: unknown
          latitud: number | null
          longitud: number | null
          metodo: Database["public"]["Enums"]["fichaje_metodo"] | null
          observaciones: string | null
          sincronizado: boolean | null
          timestamp_aplicado: string | null
          timestamp_real: string
          timestamp_teorico: string | null
          tipo: Database["public"]["Enums"]["fichaje_tipo"]
          ubicacion_id: string | null
          updated_at: string | null
        }
        Insert: {
          confianza_facial?: number | null
          created_at?: string | null
          datos_adicionales?: Json | null
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["fichaje_estado"] | null
          id?: string
          ip_address?: unknown
          latitud?: number | null
          longitud?: number | null
          metodo?: Database["public"]["Enums"]["fichaje_metodo"] | null
          observaciones?: string | null
          sincronizado?: boolean | null
          timestamp_aplicado?: string | null
          timestamp_real: string
          timestamp_teorico?: string | null
          tipo: Database["public"]["Enums"]["fichaje_tipo"]
          ubicacion_id?: string | null
          updated_at?: string | null
        }
        Update: {
          confianza_facial?: number | null
          created_at?: string | null
          datos_adicionales?: Json | null
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["fichaje_estado"] | null
          id?: string
          ip_address?: unknown
          latitud?: number | null
          longitud?: number | null
          metodo?: Database["public"]["Enums"]["fichaje_metodo"] | null
          observaciones?: string | null
          sincronizado?: boolean | null
          timestamp_aplicado?: string | null
          timestamp_real?: string
          timestamp_teorico?: string | null
          tipo?: Database["public"]["Enums"]["fichaje_tipo"]
          ubicacion_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichajes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichajes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichajes_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "fichado_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      fichajes_pausas_excedidas: {
        Row: {
          created_at: string | null
          duracion_minutos: number
          duracion_permitida_minutos: number
          empleado_id: string
          fecha_fichaje: string
          hora_fin_pausa: string
          hora_inicio_pausa: string
          id: string
          justificado: boolean | null
          minutos_exceso: number
          observaciones: string | null
          turno_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duracion_minutos: number
          duracion_permitida_minutos: number
          empleado_id: string
          fecha_fichaje: string
          hora_fin_pausa: string
          hora_inicio_pausa: string
          id?: string
          justificado?: boolean | null
          minutos_exceso: number
          observaciones?: string | null
          turno_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duracion_minutos?: number
          duracion_permitida_minutos?: number
          empleado_id?: string
          fecha_fichaje?: string
          hora_fin_pausa?: string
          hora_inicio_pausa?: string
          id?: string
          justificado?: boolean | null
          minutos_exceso?: number
          observaciones?: string | null
          turno_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichajes_pausas_excedidas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichajes_pausas_excedidas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichajes_pausas_excedidas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "fichado_turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      fichajes_tardios: {
        Row: {
          created_at: string
          empleado_id: string
          fecha_fichaje: string
          hora_programada: string
          hora_real: string
          id: string
          justificado: boolean | null
          minutos_retraso: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          fecha_fichaje: string
          hora_programada: string
          hora_real: string
          id?: string
          justificado?: boolean | null
          minutos_retraso: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          fecha_fichaje?: string
          hora_programada?: string
          hora_real?: string
          id?: string
          justificado?: boolean | null
          minutos_retraso?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fichajes_tardios_empleado"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fichajes_tardios_empleado"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
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
            foreignKeyName: "fk_grupos_lider"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
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
          puntos_valor: number | null
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
          puntos_valor?: number | null
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
          puntos_valor?: number | null
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
            foreignKeyName: "insignias_empleado_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
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
      intentos_evaluacion: {
        Row: {
          aprobado: boolean
          created_at: string
          empleado_id: string
          evaluacion_id: string
          fecha_finalizacion: string | null
          fecha_inicio: string
          id: string
          porcentaje: number
          puntaje_obtenido: number
          puntaje_total: number
          respuestas: Json
          tiempo_empleado: number | null
        }
        Insert: {
          aprobado: boolean
          created_at?: string
          empleado_id: string
          evaluacion_id: string
          fecha_finalizacion?: string | null
          fecha_inicio?: string
          id?: string
          porcentaje: number
          puntaje_obtenido: number
          puntaje_total: number
          respuestas: Json
          tiempo_empleado?: number | null
        }
        Update: {
          aprobado?: boolean
          created_at?: string
          empleado_id?: string
          evaluacion_id?: string
          fecha_finalizacion?: string | null
          fecha_inicio?: string
          id?: string
          porcentaje?: number
          puntaje_obtenido?: number
          puntaje_total?: number
          respuestas?: Json
          tiempo_empleado?: number | null
        }
        Relationships: []
      }
      kiosk_devices: {
        Row: {
          allowed_ips: unknown[]
          created_at: string | null
          device_name: string
          device_token: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          sucursal_id: string | null
        }
        Insert: {
          allowed_ips?: unknown[]
          created_at?: string | null
          device_name: string
          device_token: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          sucursal_id?: string | null
        }
        Update: {
          allowed_ips?: unknown[]
          created_at?: string | null
          device_name?: string
          device_token?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          sucursal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_devices_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_rate_limit: {
        Row: {
          empleado_id: string
          fichaje_count: number | null
          id: string
          last_fichaje: string
          window_start: string | null
        }
        Insert: {
          empleado_id: string
          fichaje_count?: number | null
          id?: string
          last_fichaje?: string
          window_start?: string | null
        }
        Update: {
          empleado_id?: string
          fichaje_count?: number | null
          id?: string
          last_fichaje?: string
          window_start?: string | null
        }
        Relationships: []
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
      materiales_capacitacion: {
        Row: {
          capacitacion_id: string
          created_at: string
          id: string
          nombre: string
          tamaño_archivo: number | null
          tipo: string
          url: string
        }
        Insert: {
          capacitacion_id: string
          created_at?: string
          id?: string
          nombre: string
          tamaño_archivo?: number | null
          tipo: string
          url: string
        }
        Update: {
          capacitacion_id?: string
          created_at?: string
          id?: string
          nombre?: string
          tamaño_archivo?: number | null
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      notificaciones_salida: {
        Row: {
          created_at: string
          empleado_id: string
          estado: string
          fecha_fichaje: string
          hora_notificacion: string
          hora_salida_esperada: string
          id: string
          mensaje_enviado: string
          numero_telefono: string
          respuesta_api: Json | null
        }
        Insert: {
          created_at?: string
          empleado_id: string
          estado?: string
          fecha_fichaje: string
          hora_notificacion?: string
          hora_salida_esperada: string
          id?: string
          mensaje_enviado: string
          numero_telefono: string
          respuesta_api?: Json | null
        }
        Update: {
          created_at?: string
          empleado_id?: string
          estado?: string
          fecha_fichaje?: string
          hora_notificacion?: string
          hora_salida_esperada?: string
          id?: string
          mensaje_enviado?: string
          numero_telefono?: string
          respuesta_api?: Json | null
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
            foreignKeyName: "participaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
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
          {
            foreignKeyName: "participaciones_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_elementos: {
        Row: {
          activo: boolean | null
          campos_adicionales: Json | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          template_html: string | null
          tipo_elemento: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          campos_adicionales?: Json | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          template_html?: string | null
          tipo_elemento: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          campos_adicionales?: Json | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          template_html?: string | null
          tipo_elemento?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      preguntas_evaluacion: {
        Row: {
          created_at: string
          evaluacion_id: string
          id: string
          opciones: Json
          orden: number
          pregunta: string
          puntos: number
          respuesta_correcta: number
        }
        Insert: {
          created_at?: string
          evaluacion_id: string
          id?: string
          opciones: Json
          orden?: number
          pregunta: string
          puntos?: number
          respuesta_correcta: number
        }
        Update: {
          created_at?: string
          evaluacion_id?: string
          id?: string
          opciones?: Json
          orden?: number
          pregunta?: string
          puntos?: number
          respuesta_correcta?: number
        }
        Relationships: []
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
      presupuesto_empresa: {
        Row: {
          activo: boolean
          anio: number
          created_at: string
          descripcion: string | null
          id: string
          mes: number
          presupuesto_disponible: number
          presupuesto_inicial: number
          presupuesto_utilizado: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          anio: number
          created_at?: string
          descripcion?: string | null
          id?: string
          mes: number
          presupuesto_disponible?: number
          presupuesto_inicial?: number
          presupuesto_utilizado?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          anio?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          mes?: number
          presupuesto_disponible?: number
          presupuesto_inicial?: number
          presupuesto_utilizado?: number
          updated_at?: string
        }
        Relationships: []
      }
      puesto_documentos: {
        Row: {
          activo: boolean
          archivo_storage_path: string | null
          contenido: string | null
          created_at: string
          descripcion: string | null
          id: string
          obligatorio: boolean | null
          orden: number | null
          puesto_id: string
          tipo_documento: string
          titulo: string
          updated_at: string
          url_archivo: string | null
          url_externo: string | null
        }
        Insert: {
          activo?: boolean
          archivo_storage_path?: string | null
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          obligatorio?: boolean | null
          orden?: number | null
          puesto_id: string
          tipo_documento?: string
          titulo: string
          updated_at?: string
          url_archivo?: string | null
          url_externo?: string | null
        }
        Update: {
          activo?: boolean
          archivo_storage_path?: string | null
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          obligatorio?: boolean | null
          orden?: number | null
          puesto_id?: string
          tipo_documento?: string
          titulo?: string
          updated_at?: string
          url_archivo?: string | null
          url_externo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_puesto_documentos_puesto"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      puestos: {
        Row: {
          activo: boolean
          created_at: string
          departamento: string | null
          descripcion: string | null
          id: string
          nivel_jerarquico: number | null
          nombre: string
          requisitos: string | null
          responsabilidades: string | null
          salario_maximo: number | null
          salario_minimo: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          departamento?: string | null
          descripcion?: string | null
          id?: string
          nivel_jerarquico?: number | null
          nombre: string
          requisitos?: string | null
          responsabilidades?: string | null
          salario_maximo?: number | null
          salario_minimo?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          departamento?: string | null
          descripcion?: string | null
          id?: string
          nivel_jerarquico?: number | null
          nombre?: string
          requisitos?: string | null
          responsabilidades?: string | null
          salario_maximo?: number | null
          salario_minimo?: number | null
          updated_at?: string
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
          {
            foreignKeyName: "puntos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role: Database["public"]["Enums"]["user_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sidebar_links: {
        Row: {
          created_at: string | null
          descripcion: string | null
          icon: string
          id: string
          label: string
          orden: number
          parent_id: string | null
          path: string
          rol: Database["public"]["Enums"]["user_role"]
          tipo: string | null
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          icon: string
          id?: string
          label: string
          orden?: number
          parent_id?: string | null
          path: string
          rol: Database["public"]["Enums"]["user_role"]
          tipo?: string | null
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          icon?: string
          id?: string
          label?: string
          orden?: number
          parent_id?: string | null
          path?: string
          rol?: Database["public"]["Enums"]["user_role"]
          tipo?: string | null
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sidebar_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sidebar_links"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_comercial_config: {
        Row: {
          api_token: string | null
          api_url: string | null
          created_at: string | null
          endpoint_acreditacion: string | null
          habilitado: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          api_token?: string | null
          api_url?: string | null
          created_at?: string | null
          endpoint_acreditacion?: string | null
          habilitado?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          api_token?: string | null
          api_url?: string | null
          created_at?: string | null
          endpoint_acreditacion?: string | null
          habilitado?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      solicitudes: {
        Row: {
          created_at: string
          descripcion: string | null
          empleado_id: string
          estado: string
          fecha_respuesta: string | null
          fecha_solicitud: string
          id: string
          monto_solicitado: number | null
          observaciones: string | null
          respondido_por: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          estado?: string
          fecha_respuesta?: string | null
          fecha_solicitud?: string
          id?: string
          monto_solicitado?: number | null
          observaciones?: string | null
          respondido_por?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          estado?: string
          fecha_respuesta?: string | null
          fecha_solicitud?: string
          id?: string
          monto_solicitado?: number | null
          observaciones?: string | null
          respondido_por?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_configuracion: {
        Row: {
          activo: boolean
          created_at: string
          dias_anticipacion: number
          fecha_fin_ventana: string | null
          fecha_inicio_ventana: string | null
          id: string
          monto_maximo_mes: number | null
          tipo_solicitud: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          dias_anticipacion?: number
          fecha_fin_ventana?: string | null
          fecha_inicio_ventana?: string | null
          id?: string
          monto_maximo_mes?: number | null
          tipo_solicitud: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          dias_anticipacion?: number
          fecha_fin_ventana?: string | null
          fecha_inicio_ventana?: string | null
          id?: string
          monto_maximo_mes?: number | null
          tipo_solicitud?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitudes_generales: {
        Row: {
          aprobado_por: string | null
          archivo_adjunto: string | null
          comentarios_aprobacion: string | null
          created_at: string
          descripcion: string | null
          empleado_id: string
          estado: string
          fecha_aprobacion: string | null
          fecha_solicitud: string
          id: string
          monto: number | null
          tipo_solicitud: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          archivo_adjunto?: string | null
          comentarios_aprobacion?: string | null
          created_at?: string
          descripcion?: string | null
          empleado_id: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_solicitud: string
          id?: string
          monto?: number | null
          tipo_solicitud: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          archivo_adjunto?: string | null
          comentarios_aprobacion?: string | null
          created_at?: string
          descripcion?: string | null
          empleado_id?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_solicitud?: string
          id?: string
          monto?: number | null
          tipo_solicitud?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_generales_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_generales_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_generales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_generales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_vacaciones: {
        Row: {
          aprobado_por: string | null
          comentarios_aprobacion: string | null
          created_at: string
          empleado_id: string
          estado: Database["public"]["Enums"]["solicitud_estado"]
          fecha_aprobacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string | null
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          comentarios_aprobacion?: string | null
          created_at?: string
          empleado_id: string
          estado?: Database["public"]["Enums"]["solicitud_estado"]
          fecha_aprobacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string | null
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          comentarios_aprobacion?: string | null
          created_at?: string
          empleado_id?: string
          estado?: Database["public"]["Enums"]["solicitud_estado"]
          fecha_aprobacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_vacaciones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_vacaciones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_vacaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_vacaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
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
      tareas: {
        Row: {
          asignado_a: string
          asignado_por: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["tarea_estado"]
          fecha_completada: string | null
          fecha_limite: string | null
          fotos_evidencia: string[] | null
          id: string
          prioridad: Database["public"]["Enums"]["tarea_prioridad"]
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a: string
          asignado_por?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["tarea_estado"]
          fecha_completada?: string | null
          fecha_limite?: string | null
          fotos_evidencia?: string[] | null
          id?: string
          prioridad?: Database["public"]["Enums"]["tarea_prioridad"]
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string
          asignado_por?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["tarea_estado"]
          fecha_completada?: string | null
          fecha_limite?: string | null
          fotos_evidencia?: string[] | null
          id?: string
          prioridad?: Database["public"]["Enums"]["tarea_prioridad"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacaciones_bloqueos: {
        Row: {
          activo: boolean
          creado_por: string | null
          created_at: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string
        }
        Insert: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo: string
        }
        Update: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_bloqueos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_bloqueos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      vacaciones_saldo: {
        Row: {
          anio: number
          created_at: string
          dias_acumulados: number
          dias_pendientes: number
          dias_usados: number
          empleado_id: string
          id: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          dias_acumulados?: number
          dias_pendientes?: number
          dias_usados?: number
          empleado_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          dias_acumulados?: number
          dias_pendientes?: number
          dias_usados?: number
          empleado_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_saldo_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_saldo_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      empleado_cruces_rojas_semana_actual: {
        Row: {
          apellido: string | null
          avatar_url: string | null
          detalles: Json | null
          empleado_id: string | null
          llegadas_tarde: number | null
          nombre: string | null
          pausas_excedidas: number | null
          salidas_tempranas: number | null
          total_cruces_rojas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empleado_cruces_rojas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_cruces_rojas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_basic: {
        Row: {
          activo: boolean | null
          apellido: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          fecha_ingreso: string | null
          grupo_id: string | null
          id: string | null
          legajo: string | null
          nombre: string | null
          puesto: string | null
          rol: Database["public"]["Enums"]["user_role"] | null
          sucursal_id: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          grupo_id?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          puesto?: string | null
          rol?: Database["public"]["Enums"]["user_role"] | null
          sucursal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          grupo_id?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          puesto?: string | null
          rol?: Database["public"]["Enums"]["user_role"] | null
          sucursal_id?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      actualizar_vacaciones_gozadas: { Args: never; Returns: undefined }
      admin_update_empleado_rol: {
        Args: {
          p_empleado_id: string
          p_nuevo_rol: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      admin_update_sensitive_data: {
        Args: {
          p_direccion?: string
          p_emergencia_contacto_nombre?: string
          p_emergencia_contacto_telefono?: string
          p_empleado_id: string
          p_estado_civil?: string
          p_fecha_nacimiento?: string
          p_salario?: number
          p_telefono?: string
        }
        Returns: undefined
      }
      aplicar_redondeo_fichaje: {
        Args: { redondeo_minutos: number; timestamp_real: string }
        Returns: string
      }
      authenticate_face_kiosk: {
        Args: { p_face_descriptor: number[]; p_threshold?: number }
        Returns: {
          apellido: string
          confidence_score: number
          email: string
          empleado_id: string
          nombre: string
          user_id: string
        }[]
      }
      calcular_dias_habiles: {
        Args: { fecha_fin: string; fecha_inicio: string }
        Returns: number
      }
      calcular_dias_laborables_antes: {
        Args: { dias_necesarios?: number; fecha_feriado: string }
        Returns: string
      }
      calcular_dias_laborales_antes: {
        Args: { dias_laborales: number; fecha_objetivo: string }
        Returns: string
      }
      calcular_saldo_vacaciones: {
        Args: { p_anio: number; p_empleado_id: string }
        Returns: number
      }
      check_facial_auth_rate_limit: {
        Args: {
          p_block_minutes?: number
          p_ip_address: unknown
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          attempts_remaining: number
          blocked_until: string
        }[]
      }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      crear_tareas_feriados: { Args: never; Returns: undefined }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      evaluar_puntualidad_mensual: { Args: never; Returns: undefined }
      get_current_empleado: { Args: never; Returns: string }
      get_current_empleado_full: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          avatar_url: string
          email: string
          fecha_ingreso: string
          grupo_id: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
        }[]
      }
      get_current_empleado_safe: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          email: string
          fecha_ingreso: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
        }[]
      }
      get_empleado_basic_safe: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          avatar_url: string
          email: string
          fecha_ingreso: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
        }[]
      }
      get_empleado_for_rating: {
        Args: { empleado_uuid: string }
        Returns: {
          apellido: string
          avatar_url: string
          id: string
          nombre: string
          puesto: string
        }[]
      }
      get_empleado_full_admin_only: {
        Args: { empleado_uuid: string }
        Returns: {
          activo: boolean
          apellido: string
          avatar_url: string
          dni: string
          email: string
          face_descriptor: number[]
          fecha_ingreso: string
          grupo_id: string
          id: string
          legajo: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
        }[]
      }
      get_empleado_profile_limited: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          avatar_url: string
          email: string
          fecha_ingreso: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
        }[]
      }
      get_empleado_sensitive_admin_only: {
        Args: { empleado_uuid: string }
        Returns: {
          direccion: string
          dni: string
          emergencia_contacto_nombre: string
          emergencia_contacto_telefono: string
          estado_civil: string
          fecha_nacimiento: string
          id: string
          salario: number
          telefono: string
        }[]
      }
      get_employees_for_kiosk: {
        Args: never
        Returns: {
          apellido: string
          email: string
          id: string
          nombre: string
        }[]
      }
      get_estadisticas_puntualidad: {
        Args: {
          p_empleado_id: string
          p_fecha_fin?: string
          p_fecha_inicio?: string
        }
        Returns: {
          dias_puntuales: number
          porcentaje_puntualidad: number
          puede_obtener_insignia: boolean
          total_dias: number
        }[]
      }
      get_facial_config: { Args: { config_key: string }; Returns: string }
      get_manager_employee_view: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          created_at: string
          fecha_ingreso: string
          grupo_id: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string
          updated_at: string
        }[]
      }
      get_presupuesto_resumen: {
        Args: never
        Returns: {
          anual: number
          disponible_mes: number
          mes_actual: number
          porcentaje_utilizado: number
          utilizado_mes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_demo_cruces_rojas: {
        Args: { p_empleado_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_manager: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_gerente_sucursal: {
        Args: { sucursal_uuid?: string }
        Returns: boolean
      }
      is_manager_of_branch: { Args: { branch_id: string }; Returns: boolean }
      kiosk_get_acciones: {
        Args: { p_empleado_id: string }
        Returns: {
          accion: string
        }[]
      }
      kiosk_insert_fichaje: {
        Args: {
          p_confianza: number
          p_datos?: Json
          p_empleado_id: string
          p_lat?: number
          p_lng?: number
        }
        Returns: string
      }
      kiosk_insert_fichaje_secure: {
        Args: {
          p_confianza: number
          p_datos?: Json
          p_device_token?: string
          p_empleado_id: string
          p_lat?: number
          p_lng?: number
        }
        Returns: string
      }
      log_empleado_access: {
        Args: {
          p_datos_accedidos?: string[]
          p_empleado_id: string
          p_ip?: unknown
          p_tipo_acceso: string
          p_user_agent?: string
        }
        Returns: undefined
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
      recalcular_fichajes_tardios_empleado: {
        Args: { p_empleado_id: string; p_fecha_desde?: string }
        Returns: undefined
      }
      recalcular_incidencias_empleado: {
        Args: { p_empleado_id: string; p_fecha_desde?: string }
        Returns: Json
      }
      recalcular_pausas_excedidas_empleado: {
        Args: { p_empleado_id: string; p_fecha_desde?: string }
        Returns: undefined
      }
      registrar_intento_login:
        | {
            Args: {
              p_datos_adicionales?: Json
              p_email: string
              p_evento: string
              p_exitoso?: boolean
              p_mensaje_error?: string
              p_metodo?: string
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_datos_adicionales?: Json
              p_email: string
              p_evento: string
              p_exitoso: boolean
              p_mensaje_error?: string
              p_metodo: string
              p_user_id?: string
            }
            Returns: undefined
          }
      registrar_intento_login_v2: {
        Args: {
          p_datos_adicionales?: Json
          p_email: string
          p_evento: string
          p_exitoso: boolean
          p_mensaje_error?: string
          p_metodo: string
          p_user_id?: string
        }
        Returns: undefined
      }
      reset_facial_auth_rate_limit: {
        Args: { p_ip_address: unknown }
        Returns: undefined
      }
      user_has_admin_role: { Args: never; Returns: boolean }
      validar_geocerca: {
        Args: {
          lat_empleado: number
          lng_empleado: number
          ubicacion_id: string
        }
        Returns: boolean
      }
      verificar_empleados_sin_salida: {
        Args: never
        Returns: {
          empleado_id: string
          hora_salida_esperada: string
          minutos_retraso: number
          nombre_completo: string
          telefono: string
        }[]
      }
    }
    Enums: {
      anotacion_categoria:
        | "apercibimiento"
        | "llamado_atencion"
        | "orden_no_acatada"
        | "no_uso_uniforme"
        | "uso_celular"
        | "tardanza"
        | "ausencia_injustificada"
        | "actitud_positiva"
        | "mejora_desempeno"
        | "otro"
      asignacion_estado: "pendiente" | "entregado"
      beneficiario_tipo: "empleado" | "grupo"
      desafio_estado: "borrador" | "activo" | "finalizado"
      desafio_tipo_periodo: "semanal" | "mensual" | "semestral" | "anual"
      fichaje_estado: "valido" | "pendiente" | "rechazado" | "corregido"
      fichaje_metodo: "facial" | "manual" | "automatico"
      fichaje_tipo: "entrada" | "salida" | "pausa_inicio" | "pausa_fin"
      incidencia_estado: "pendiente" | "aprobada" | "rechazada"
      incidencia_tipo:
        | "olvido"
        | "error_tecnico"
        | "justificacion"
        | "correccion"
      movimiento_tipo: "egreso" | "ajuste" | "ingreso"
      premio_tipo:
        | "fisico"
        | "digital"
        | "experiencia"
        | "descuento"
        | "reconocimiento"
      solicitud_estado:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "cancelada"
        | "gozadas"
      tarea_estado: "pendiente" | "en_progreso" | "completada" | "cancelada"
      tarea_prioridad: "baja" | "media" | "alta" | "urgente"
      turno_tipo: "normal" | "nocturno" | "partido" | "flexible"
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
      anotacion_categoria: [
        "apercibimiento",
        "llamado_atencion",
        "orden_no_acatada",
        "no_uso_uniforme",
        "uso_celular",
        "tardanza",
        "ausencia_injustificada",
        "actitud_positiva",
        "mejora_desempeno",
        "otro",
      ],
      asignacion_estado: ["pendiente", "entregado"],
      beneficiario_tipo: ["empleado", "grupo"],
      desafio_estado: ["borrador", "activo", "finalizado"],
      desafio_tipo_periodo: ["semanal", "mensual", "semestral", "anual"],
      fichaje_estado: ["valido", "pendiente", "rechazado", "corregido"],
      fichaje_metodo: ["facial", "manual", "automatico"],
      fichaje_tipo: ["entrada", "salida", "pausa_inicio", "pausa_fin"],
      incidencia_estado: ["pendiente", "aprobada", "rechazada"],
      incidencia_tipo: [
        "olvido",
        "error_tecnico",
        "justificacion",
        "correccion",
      ],
      movimiento_tipo: ["egreso", "ajuste", "ingreso"],
      premio_tipo: [
        "fisico",
        "digital",
        "experiencia",
        "descuento",
        "reconocimiento",
      ],
      solicitud_estado: [
        "pendiente",
        "aprobada",
        "rechazada",
        "cancelada",
        "gozadas",
      ],
      tarea_estado: ["pendiente", "en_progreso", "completada", "cancelada"],
      tarea_prioridad: ["baja", "media", "alta", "urgente"],
      turno_tipo: ["normal", "nocturno", "partido", "flexible"],
      user_role: ["admin_rrhh", "gerente_sucursal", "lider_grupo", "empleado"],
    },
  },
} as const
