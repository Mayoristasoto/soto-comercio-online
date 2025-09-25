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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_capacitacion_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
          ip_confirmacion: unknown | null
        }
        Insert: {
          asignacion_id: string
          created_at?: string
          documento_id: string
          empleado_id: string
          fecha_confirmacion?: string
          id?: string
          ip_confirmacion?: unknown | null
        }
        Update: {
          asignacion_id?: string
          created_at?: string
          documento_id?: string
          empleado_id?: string
          fecha_confirmacion?: string
          id?: string
          ip_confirmacion?: unknown | null
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_permisos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_permisos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_turnos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
          email: string
          fecha_ingreso: string
          grupo_id: string | null
          id: string
          legajo: string | null
          nombre: string
          puesto: string | null
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
          email: string
          fecha_ingreso?: string
          grupo_id?: string | null
          id?: string
          legajo?: string | null
          nombre: string
          puesto?: string | null
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
          email?: string
          fecha_ingreso?: string
          grupo_id?: string | null
          id?: string
          legajo?: string | null
          nombre?: string
          puesto?: string | null
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
      empleados_audit_log: {
        Row: {
          datos_accedidos: string[] | null
          empleado_accedido_id: string
          id: string
          ip_address: unknown | null
          timestamp_acceso: string
          tipo_acceso: string
          user_agent: string | null
          usuario_acceso_id: string | null
        }
        Insert: {
          datos_accedidos?: string[] | null
          empleado_accedido_id: string
          id?: string
          ip_address?: unknown | null
          timestamp_acceso?: string
          tipo_acceso: string
          user_agent?: string | null
          usuario_acceso_id?: string | null
        }
        Update: {
          datos_accedidos?: string[] | null
          empleado_accedido_id?: string
          id?: string
          ip_address?: unknown | null
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empleados_audit_empleado"
            columns: ["empleado_accedido_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empleados_datos_sensibles_empleado"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichado_configuracion_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      fichado_turnos: {
        Row: {
          activo: boolean | null
          created_at: string | null
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichaje_incidencias_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichajes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grupos_lider"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insignias_empleado_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
        Relationships: []
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
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
            referencedRelation: "empleados_admin_sensitive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "empleados_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      empleados_admin_sensitive: {
        Row: {
          activo: boolean | null
          apellido: string | null
          avatar_url: string | null
          created_at: string | null
          direccion: string | null
          dni: string | null
          email: string | null
          emergencia_contacto_nombre: string | null
          emergencia_contacto_telefono: string | null
          estado_civil: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          grupo_id: string | null
          has_face_descriptor: boolean | null
          id: string | null
          legajo: string | null
          nombre: string | null
          puesto: string | null
          rol: Database["public"]["Enums"]["user_role"] | null
          salario: number | null
          sucursal_id: string | null
          telefono: string | null
          updated_at: string | null
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
      empleados_safe_view: {
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
      aplicar_redondeo_fichaje: {
        Args: { redondeo_minutos: number; timestamp_real: string }
        Returns: string
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
      get_current_empleado_full: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
      get_manager_employee_view: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
        Returns: {
          anual: number
          disponible_mes: number
          mes_actual: number
          porcentaje_utilizado: number
          utilizado_mes: number
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
      user_has_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validar_geocerca: {
        Args: {
          lat_empleado: number
          lng_empleado: number
          ubicacion_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
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
      solicitud_estado: "pendiente" | "aprobada" | "rechazada" | "cancelada"
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
      solicitud_estado: ["pendiente", "aprobada", "rechazada", "cancelada"],
      tarea_estado: ["pendiente", "en_progreso", "completada", "cancelada"],
      tarea_prioridad: ["baja", "media", "alta", "urgente"],
      turno_tipo: ["normal", "nocturno", "partido", "flexible"],
      user_role: ["admin_rrhh", "gerente_sucursal", "lider_grupo", "empleado"],
    },
  },
} as const
