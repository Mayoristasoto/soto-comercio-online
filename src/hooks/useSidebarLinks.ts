import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarLink {
  id: string;
  nombre: string;
  path: string;
  icon: string;
  descripcion: string | null;
  orden: number;
  visible: boolean;
  parent_id: string | null;
  tipo: 'link' | 'separator';
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

    // Suscribirse a cambios en tiempo real en app_pages
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
      
      // Leer de app_pages en vez de sidebar_links
      const { data, error } = await supabase
        .from("app_pages")
        .select("*")
        .eq("visible", true)
        .eq("mostrar_en_sidebar", true)
        .contains("roles_permitidos", [userRole])
        .order("orden", { ascending: true });

      if (error) throw error;

      // Transformar a formato SidebarLink
      const transformedData = data?.map((page: any) => ({
        id: page.id,
        nombre: page.nombre,
        path: page.path,
        icon: page.icon,
        descripcion: page.descripcion,
        orden: page.orden,
        visible: page.visible,
        parent_id: page.parent_id,
        tipo: page.tipo || 'link'
      })) || [];

      // Organizar en estructura jerárquica
      const parentLinks = transformedData.filter((link: any) => !link.parent_id);
      const linksWithChildren: SidebarLinkWithChildren[] = parentLinks.map((parent: any) => ({
        ...parent,
        children: transformedData
          .filter((child: any) => child.parent_id === parent.id)
          .sort((a: any, b: any) => a.orden - b.orden),
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
