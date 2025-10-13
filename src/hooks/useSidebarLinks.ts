import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarLink {
  id: string;
  rol: string;
  label: string;
  path: string;
  icon: string;
  descripcion: string | null;
  orden: number;
  visible: boolean;
  parent_id: string | null;
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
      .channel('sidebar-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sidebar_links',
          filter: `rol=eq.${userRole}`
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
      const { data, error } = await (supabase as any)
        .from("sidebar_links")
        .select("*")
        .eq("rol", userRole)
        .eq("visible", true)
        .order("orden", { ascending: true });

      if (error) throw error;

      // Organizar en estructura jerárquica
      const parentLinks = data?.filter((link: any) => !link.parent_id) || [];
      const linksWithChildren: SidebarLinkWithChildren[] = parentLinks.map((parent: any) => ({
        ...parent,
        children: data
          ?.filter((child: any) => child.parent_id === parent.id)
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
