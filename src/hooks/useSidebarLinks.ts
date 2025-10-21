import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarLink {
  id: string;
  nombre: string; // Antes: label
  path: string;
  icon: string;
  descripcion: string | null;
  orden: number;
  visible: boolean;
  parent_id: string | null;
  tipo: string;
}

interface SidebarLinkWithChildren extends SidebarLink {
  children?: SidebarLink[];
}

export function useSidebarLinks(userRole: string | null) {
  const [links, setLinks] = useState<SidebarLinkWithChildren[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userRole) {
      setLoading(false);
      return;
    }

    loadLinks();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('app-pages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_pages'
        },
        () => {
          loadLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const loadLinks = async () => {
    if (!userRole) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_pages")
        .select("*")
        .contains("roles_permitidos", [userRole])
        .eq("visible", true)
        .eq("mostrar_en_sidebar", true)
        .order("orden", { ascending: true });

      if (error) throw error;

      // Organizar en estructura jerárquica
      const parentLinks = data?.filter((link: any) => !link.parent_id) || [];
      const linksWithChildren: SidebarLinkWithChildren[] = parentLinks.map((parent: any) => ({
        id: parent.id,
        nombre: parent.nombre,
        path: parent.path,
        icon: parent.icon,
        descripcion: parent.descripcion,
        orden: parent.orden,
        visible: parent.visible,
        parent_id: parent.parent_id,
        tipo: parent.tipo || 'link',
        children: data
          ?.filter((child: any) => child.parent_id === parent.id)
          .map((child: any) => ({
            id: child.id,
            nombre: child.nombre,
            path: child.path,
            icon: child.icon,
            descripcion: child.descripcion,
            orden: child.orden,
            visible: child.visible,
            parent_id: child.parent_id,
            tipo: child.tipo || 'link',
          }))
          .sort((a: any, b: any) => a.orden - b.orden) || [],
      }));

      setLinks(linksWithChildren);
    } catch (error) {
      console.error("Error loading sidebar links:", error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  return { links, loading };
}
