import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripVertical, Eye, EyeOff, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  children?: SidebarLink[];
}

export function SidebarLinksManager() {
  const [links, setLinks] = useState<Record<string, SidebarLink[]>>({ admin_rrhh: [], gerente_sucursal: [], empleado: [] });
  const [selectedRole, setSelectedRole] = useState<string>("admin_rrhh");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SidebarLink>>({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("sidebar_links")
        .select("*")
        .order("orden", { ascending: true });

      if (error) throw error;

      // Organizar por rol y estructura jerárquica
      const organized: any = {
        admin_rrhh: [],
        gerente_sucursal: [],
        empleado: [],
      };

      data?.forEach((link: any) => {
        if (!link.parent_id) {
          const linkWithChildren = {
            ...link,
            children: data.filter((child: any) => child.parent_id === link.id)
              .sort((a: any, b: any) => a.orden - b.orden),
          };
          organized[link.rol].push(linkWithChildren);
        }
      });

      setLinks(organized);
    } catch (error: any) {
      toast.error("Error al cargar links: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (id: string, currentVisible: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("sidebar_links")
        .update({ visible: !currentVisible })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentVisible ? "Link ocultado" : "Link mostrado");
      loadLinks();
    } catch (error: any) {
      toast.error("Error al actualizar visibilidad: " + error.message);
    }
  };

  const handleStartEdit = (link: SidebarLink) => {
    setEditingId(link.id);
    setEditForm(link);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await (supabase as any)
        .from("sidebar_links")
        .update({
          label: editForm.label,
          descripcion: editForm.descripcion,
          icon: editForm.icon,
          orden: editForm.orden,
        })
        .eq("id", editingId);

      if (error) throw error;
      toast.success("Link actualizado");
      handleCancelEdit();
      loadLinks();
    } catch (error: any) {
      toast.error("Error al actualizar link: " + error.message);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string, targetParentId: string | null) => {
    if (!draggedItem || draggedItem === targetId) return;

    try {
      // Obtener el link arrastrado y el link objetivo
      const allLinks = [...links[selectedRole]];
      const draggedLink = allLinks.find((l) => l.id === draggedItem || l.children?.find((c) => c.id === draggedItem));
      const targetLink = allLinks.find((l) => l.id === targetId || l.children?.find((c) => c.id === targetId));

      if (!targetLink) return;

      // Obtener el nuevo orden basado en el objetivo
      const targetOrden = targetLink.orden;

      // Actualizar el orden del link arrastrado
      const { error } = await (supabase as any)
        .from("sidebar_links")
        .update({ orden: targetOrden })
        .eq("id", draggedItem);

      if (error) throw error;

      // Reordenar los demás links
      const updates = allLinks
        .filter((l) => l.id !== draggedItem && l.parent_id === targetParentId)
        .map((l, index) => ({
          id: l.id,
          orden: l.orden >= targetOrden ? l.orden + 1 : l.orden,
        }));

      for (const update of updates) {
        await (supabase as any)
          .from("sidebar_links")
          .update({ orden: update.orden })
          .eq("id", update.id);
      }

      toast.success("Orden actualizado");
      loadLinks();
    } catch (error: any) {
      toast.error("Error al reordenar: " + error.message);
    } finally {
      setDraggedItem(null);
    }
  };

  const renderLink = (link: SidebarLink, isChild: boolean = false) => {
    const isEditing = editingId === link.id;

    return (
      <div key={link.id} className={isChild ? "ml-8" : ""}>
        <Card
          className={`mb-2 ${!link.visible ? "opacity-50" : ""} ${draggedItem === link.id ? "opacity-50" : ""}`}
          draggable
          onDragStart={() => handleDragStart(link.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(link.id, link.parent_id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              
              {isEditing ? (
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <Input
                    value={editForm.label || ""}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    placeholder="Label"
                  />
                  <Input
                    value={editForm.icon || ""}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    placeholder="Icon"
                  />
                  <Input
                    value={editForm.orden || 0}
                    type="number"
                    onChange={(e) => setEditForm({ ...editForm, orden: parseInt(e.target.value) })}
                    placeholder="Orden"
                  />
                  <Input
                    value={editForm.descripcion || ""}
                    onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                    placeholder="Descripción"
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{link.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {link.icon}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Orden: {link.orden}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{link.path}</p>
                  {link.descripcion && (
                    <p className="text-xs text-muted-foreground mt-1">{link.descripcion}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleVisibility(link.id, link.visible)}
                    >
                      {link.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(link)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {link.children && link.children.length > 0 && (
          <div className="ml-4">
            {link.children.map((child) => renderLink(child, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando configuración...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestión de Links del Sidebar</h2>
        <p className="text-muted-foreground">
          Configura el orden y visibilidad de los links del menú lateral
        </p>
      </div>

      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList>
          <TabsTrigger value="admin_rrhh">Admin RRHH</TabsTrigger>
          <TabsTrigger value="gerente_sucursal">Gerente</TabsTrigger>
          <TabsTrigger value="empleado">Empleado</TabsTrigger>
        </TabsList>

        <TabsContent value="admin_rrhh" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Links de Administrador RRHH</CardTitle>
              <CardDescription>
                Arrastra para reordenar, haz clic en el ojo para ocultar/mostrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {links.admin_rrhh.map((link: SidebarLink) => renderLink(link))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gerente_sucursal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Links de Gerente de Sucursal</CardTitle>
              <CardDescription>
                Arrastra para reordenar, haz clic en el ojo para ocultar/mostrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {links.gerente_sucursal.map((link: SidebarLink) => renderLink(link))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empleado" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Links de Empleado</CardTitle>
              <CardDescription>
                Arrastra para reordenar, haz clic en el ojo para ocultar/mostrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {links.empleado.map((link: SidebarLink) => renderLink(link))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
