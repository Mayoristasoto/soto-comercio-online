import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AccesoRapido } from "@/hooks/useAccesosRapidos";

export interface ConfigPerfilVista {
  vistaNavegacion?: "vista1" | "vista2";
  calendarPrefs?: Record<string, boolean>;
  calendariosExternos?: { calendario_id: string; visible: boolean }[];
  tema?: {
    theme_mode?: string;
    custom_colors?: { primary: string; secondary: string; accent: string } | null;
    font_size?: string;
    high_contrast?: boolean;
    reduced_motion?: boolean;
  };
  accesosRapidos?: AccesoRapido[];
  menuOcultos?: string[];
}

export interface PerfilVista {
  id: string;
  user_id: string;
  nombre: string;
  es_default: boolean;
  config: ConfigPerfilVista;
  created_at: string;
  updated_at: string;
}

const keyVista = (userId: string) => `vista_navegacion:${userId}`;
const keyAccesos = (userId: string) => `accesos_rapidos_sidebar:${userId}`;
export const keyMenuOcultos = (userId: string) => `menu_ocultos:${userId}`;
const keyActivo = (userId: string) => `perfil_vista_activo:${userId}`;

export function getMenuOcultos(userId?: string | null): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(keyMenuOcultos(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setMenuOcultosStorage(userId: string, paths: string[]) {
  try {
    localStorage.setItem(keyMenuOcultos(userId), JSON.stringify(paths));
  } catch {
    // ignore
  }
}

async function capturarConfigActual(authUserId: string, storageUserId: string): Promise<ConfigPerfilVista> {
  const config: ConfigPerfilVista = {};

  // Vista de navegación
  try {
    const v = localStorage.getItem(keyVista(storageUserId));
    config.vistaNavegacion = v === "vista2" ? "vista2" : "vista1";
  } catch {
    // ignore
  }

  // Accesos rápidos
  try {
    const raw = localStorage.getItem(keyAccesos(storageUserId));
    config.accesosRapidos = raw ? JSON.parse(raw) : [];
  } catch {
    config.accesosRapidos = [];
  }

  // Menú oculto
  config.menuOcultos = getMenuOcultos(storageUserId);

  // Capas del calendario del dashboard
  const { data: prefRow } = await (supabase as any)
    .from("dashboard_calendar_prefs")
    .select("prefs")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (prefRow?.prefs) config.calendarPrefs = prefRow.prefs;

  // Calendarios externos visibles (por empleado)
  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", authUserId)
    .eq("activo", true)
    .maybeSingle();
  if (emp) {
    const { data: calPrefs } = await (supabase as any)
      .from("calendario_preferencias_usuario")
      .select("calendario_id, visible")
      .eq("empleado_id", emp.id);
    if (calPrefs) config.calendariosExternos = calPrefs;
  }

  // Tema
  const { data: tema } = await (supabase as any)
    .from("user_theme_preferences")
    .select("theme_mode, custom_colors, font_size, high_contrast, reduced_motion")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (tema) config.tema = tema;

  return config;
}

async function aplicarConfig(authUserId: string, storageUserId: string, config: ConfigPerfilVista) {
  // Vista de navegación
  if (config.vistaNavegacion) {
    try {
      localStorage.setItem(keyVista(storageUserId), config.vistaNavegacion);
    } catch {
      // ignore
    }
  }

  // Accesos rápidos
  if (config.accesosRapidos) {
    try {
      localStorage.setItem(keyAccesos(storageUserId), JSON.stringify(config.accesosRapidos));
    } catch {
      // ignore
    }
  }

  // Menú oculto
  setMenuOcultosStorage(storageUserId, config.menuOcultos || []);

  // Capas del calendario
  if (config.calendarPrefs) {
    await (supabase as any)
      .from("dashboard_calendar_prefs")
      .upsert({ user_id: authUserId, prefs: config.calendarPrefs }, { onConflict: "user_id" });
  }

  // Calendarios externos
  if (config.calendariosExternos) {
    const { data: emp } = await supabase
      .from("empleados")
      .select("id")
      .eq("user_id", authUserId)
      .eq("activo", true)
      .maybeSingle();
    if (emp) {
      for (const p of config.calendariosExternos) {
        await (supabase as any)
          .from("calendario_preferencias_usuario")
          .upsert(
            { empleado_id: emp.id, calendario_id: p.calendario_id, visible: p.visible },
            { onConflict: "empleado_id,calendario_id" }
          );
      }
    }
  }

  // Tema
  if (config.tema) {
    await (supabase as any)
      .from("user_theme_preferences")
      .upsert({ user_id: authUserId, ...config.tema, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }
}

export function usePerfilesVista(userId?: string | null) {
  const [perfiles, setPerfiles] = useState<PerfilVista[]>([]);
  const [activoId, setActivoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) {
      setPerfiles([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    // La tabla se keya por auth user id (RLS con auth.uid()); el parámetro
    // userId es el id de empleado y se usa solo para las claves de localStorage.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPerfiles([]);
      setCargando(false);
      return;
    }
    setAuthUserId(user.id);
    const { data, error } = await (supabase as any)
      .from("perfiles_vista_usuario")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error cargando perfiles de vista", error);
      setPerfiles([]);
    } else {
      setPerfiles(data || []);
    }
    try {
      setActivoId(localStorage.getItem(keyActivo(userId)));
    } catch {
      setActivoId(null);
    }
    setCargando(false);
  }, [userId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al iniciar sesión: aplicar el perfil default si no hay uno activo en esta sesión
  useEffect(() => {
    if (!userId || cargando || perfiles.length === 0) return;
    let activo: string | null = null;
    try {
      activo = localStorage.getItem(keyActivo(userId));
    } catch {
      // ignore
    }
    if (activo) return;
    const def = perfiles.find((p) => p.es_default);
    if (def) {
      aplicarPerfil(def.id, { silencioso: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cargando, perfiles]);

  const aplicarPerfil = useCallback(
    async (id: string, opts?: { silencioso?: boolean }) => {
      if (!userId) return;
      const perfil = perfiles.find((p) => p.id === id);
      if (!perfil) return;
      try {
        if (!authUserId) return;
      await aplicarConfig(authUserId, userId, perfil.config || {});
        localStorage.setItem(keyActivo(userId), id);
        setActivoId(id);
        if (!opts?.silencioso) {
          toast.success(`Perfil "${perfil.nombre}" aplicado`);
          window.location.reload();
        }
      } catch (e) {
        console.error("Error aplicando perfil", e);
        toast.error("No se pudo aplicar el perfil");
      }
    },
    [userId, authUserId, perfiles]
  );

  const guardarComoPerfil = useCallback(
    async (nombre: string) => {
      if (!userId) return null;
      if (!authUserId) return null;
      const config = await capturarConfigActual(authUserId, userId);
      const { data, error } = await (supabase as any)
        .from("perfiles_vista_usuario")
        .insert({ user_id: authUserId, nombre, config, es_default: perfiles.length === 0 })
        .select()
        .single();
      if (error) {
        console.error("Error guardando perfil", error);
        toast.error("No se pudo guardar el perfil");
        return null;
      }
      toast.success(`Perfil "${nombre}" guardado`);
      await cargar();
      return data as PerfilVista;
    },
    [userId, authUserId, perfiles.length, cargar]
  );

  const actualizarPerfil = useCallback(
    async (id: string) => {
      if (!userId) return;
      if (!authUserId) return;
      const config = await capturarConfigActual(authUserId, userId);
      const { error } = await (supabase as any)
        .from("perfiles_vista_usuario")
        .update({ config })
        .eq("id", id);
      if (error) {
        toast.error("No se pudo actualizar el perfil");
        return;
      }
      toast.success("Perfil actualizado con tu vista actual");
      await cargar();
    },
    [userId, authUserId, cargar]
  );

  const renombrar = useCallback(
    async (id: string, nombre: string) => {
      const { error } = await (supabase as any)
        .from("perfiles_vista_usuario")
        .update({ nombre })
        .eq("id", id);
      if (error) toast.error("No se pudo renombrar");
      else await cargar();
    },
    [cargar]
  );

  const duplicar = useCallback(
    async (id: string) => {
      const perfil = perfiles.find((p) => p.id === id);
      if (!perfil || !userId) return;
      const { error } = await (supabase as any)
        .from("perfiles_vista_usuario")
        .insert({ user_id: authUserId, nombre: `${perfil.nombre} (copia)`, config: perfil.config, es_default: false });
      if (error) toast.error("No se pudo duplicar");
      else {
        toast.success("Perfil duplicado");
        await cargar();
      }
    },
    [perfiles, userId, authUserId, cargar]
  );

  const borrar = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from("perfiles_vista_usuario").delete().eq("id", id);
      if (error) {
        toast.error("No se pudo borrar el perfil");
        return;
      }
      if (userId && activoId === id) {
        try {
          localStorage.removeItem(keyActivo(userId));
        } catch {
          // ignore
        }
        setActivoId(null);
      }
      toast.success("Perfil borrado");
      await cargar();
    },
    [userId, activoId, cargar]
  );

  const setDefault = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Quitar default anterior y poner el nuevo
      await (supabase as any)
        .from("perfiles_vista_usuario")
        .update({ es_default: false })
        .eq("user_id", authUserId)
        .eq("es_default", true);
      const { error } = await (supabase as any)
        .from("perfiles_vista_usuario")
        .update({ es_default: true })
        .eq("id", id);
      if (error) toast.error("No se pudo marcar como predeterminado");
      else {
        toast.success("Perfil predeterminado actualizado");
        await cargar();
      }
    },
    [userId, authUserId, cargar]
  );

  const activo = useMemo(() => perfiles.find((p) => p.id === activoId) || null, [perfiles, activoId]);

  return {
    perfiles,
    activo,
    activoId,
    cargando,
    aplicarPerfil,
    guardarComoPerfil,
    actualizarPerfil,
    renombrar,
    duplicar,
    borrar,
    setDefault,
    recargar: cargar,
  };
}
