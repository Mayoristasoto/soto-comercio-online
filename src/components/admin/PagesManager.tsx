import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Pencil, Trash2, Save, X, Plus, GripVertical, FileText, FolderPlus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface AppPage {
  id: string
  path: string
  nombre: string
  titulo_pagina: string | null
  parent_id: string | null
  descripcion: string | null
  icon: string
  orden: number
  visible: boolean
  requiere_auth: boolean
  roles_permitidos: string[]
}

interface AppPageWithChildren extends AppPage {
  children?: AppPage[]
}

export function PagesManager() {
  const [pages, setPages] = useState<AppPageWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AppPage>>({})
  const [newPageForm, setNewPageForm] = useState<Partial<AppPage>>({
    path: "",
    nombre: "",
    titulo_pagina: "",
    descripcion: "",
    icon: "FileText",
    orden: 0,
    visible: true,
    requiere_auth: true,
    roles_permitidos: ["empleado"],
    parent_id: null
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showSubPageForm, setShowSubPageForm] = useState<string | null>(null)

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("app_pages")
        .select("*")
        .order("orden", { ascending: true })

      if (error) throw error

      // Organizar en estructura jerárquica
      const parentPages = data?.filter(page => !page.parent_id) || []
      const pagesWithChildren: AppPageWithChildren[] = parentPages.map(parent => ({
        ...parent,
        children: data
          ?.filter(child => child.parent_id === parent.id)
          .sort((a, b) => a.orden - b.orden) || []
      }))

      setPages(pagesWithChildren)
    } catch (error) {
      console.error("Error loading pages:", error)
      toast.error("Error al cargar las páginas")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("app_pages")
        .update({ visible: !currentValue })
        .eq("id", id)

      if (error) throw error
      
      toast.success("Visibilidad actualizada")
      loadPages()
    } catch (error) {
      console.error("Error updating visibility:", error)
      toast.error("Error al actualizar visibilidad")
    }
  }

  const handleStartEdit = (page: AppPage) => {
    setEditingId(page.id)
    setEditForm(page)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    try {
      if (!editForm.path || !editForm.nombre) {
        toast.error("Path y nombre son obligatorios")
        return
      }

      const { error } = await supabase
        .from("app_pages")
        .update({
          path: editForm.path,
          nombre: editForm.nombre,
          titulo_pagina: editForm.titulo_pagina,
          descripcion: editForm.descripcion,
          icon: editForm.icon,
          parent_id: editForm.parent_id,
          visible: editForm.visible,
          requiere_auth: editForm.requiere_auth,
          roles_permitidos: editForm.roles_permitidos
        })
        .eq("id", editingId)

      if (error) throw error

      toast.success("Página actualizada correctamente")
      setEditingId(null)
      setEditForm({})
      loadPages()
    } catch (error) {
      console.error("Error updating page:", error)
      toast.error("Error al actualizar página")
    }
  }

  const handleAddPage = async (parentId: string | null = null) => {
    try {
      const formToUse = parentId ? newPageForm : newPageForm
      
      if (!formToUse.path || !formToUse.nombre) {
        toast.error("Path y nombre son obligatorios")
        return
      }

      const { error } = await supabase
        .from("app_pages")
        .insert([{
          path: formToUse.path,
          nombre: formToUse.nombre,
          titulo_pagina: formToUse.titulo_pagina || null,
          descripcion: formToUse.descripcion || null,
          icon: formToUse.icon || "FileText",
          orden: formToUse.orden || 0,
          visible: formToUse.visible ?? true,
          requiere_auth: formToUse.requiere_auth ?? true,
          roles_permitidos: formToUse.roles_permitidos || ["empleado"],
          parent_id: parentId || formToUse.parent_id || null
        }])

      if (error) throw error

      toast.success(parentId ? "Sub-página creada" : "Página creada")
      setShowNewForm(false)
      setShowSubPageForm(null)
      setNewPageForm({
        path: "",
        nombre: "",
        titulo_pagina: "",
        descripcion: "",
        icon: "FileText",
        orden: 0,
        visible: true,
        requiere_auth: true,
        roles_permitidos: ["empleado"],
        parent_id: null
      })
      loadPages()
    } catch (error) {
      console.error("Error creating page:", error)
      toast.error("Error al crear página")
    }
  }

  const handleStartAddSubPage = (parentId: string) => {
    setShowSubPageForm(parentId)
    setNewPageForm({
      path: "",
      nombre: "",
      titulo_pagina: "",
      descripcion: "",
      icon: "FileText",
      orden: 0,
      visible: true,
      requiere_auth: true,
      roles_permitidos: ["empleado"],
      parent_id: parentId
    })
  }

  const handleDeleteClick = (id: string) => {
    setPageToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!pageToDelete) return

    try {
      const { error } = await supabase
        .from("app_pages")
        .delete()
        .eq("id", pageToDelete)

      if (error) throw error

      toast.success("Página eliminada")
      setDeleteDialogOpen(false)
      setPageToDelete(null)
      loadPages()
    } catch (error) {
      console.error("Error deleting page:", error)
      toast.error("Error al eliminar página")
    }
  }

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedItem(pageId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    try {
      // Reordenar páginas
      const allPages = pages.reduce((acc, page) => {
        acc.push(page)
        if (page.children) {
          acc.push(...page.children)
        }
        return acc
      }, [] as AppPage[])

      const draggedIndex = allPages.findIndex(p => p.id === draggedItem)
      const targetIndex = allPages.findIndex(p => p.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return

      const newPages = [...allPages]
      const [removed] = newPages.splice(draggedIndex, 1)
      newPages.splice(targetIndex, 0, removed)

      // Actualizar orden
      for (let i = 0; i < newPages.length; i++) {
        await supabase
          .from("app_pages")
          .update({ orden: i })
          .eq("id", newPages[i].id)
      }

      toast.success("Orden actualizado")
      loadPages()
    } catch (error) {
      console.error("Error reordering:", error)
      toast.error("Error al reordenar")
    } finally {
      setDraggedItem(null)
    }
  }

  const renderPage = (page: AppPageWithChildren, level: number = 0) => {
    const isEditing = editingId === page.id
    const indent = level * 24

    return (
      <div key={page.id} className="space-y-2">
        <Card
          draggable
          onDragStart={(e) => handleDragStart(e, page.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, page.id)}
          className={`cursor-move ${draggedItem === page.id ? "opacity-50" : ""}`}
          style={{ marginLeft: `${indent}px` }}
        >
          <CardContent className="p-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Path (Ruta) *</Label>
                    <Input
                      value={editForm.path || ""}
                      onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                      placeholder="/mi-pagina"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cambiar la ruta puede afectar navegación existente
                    </p>
                  </div>
                  <div>
                    <Label>Nombre (Menú) *</Label>
                    <Input
                      value={editForm.nombre || ""}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      placeholder="Mi Página"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nombre que aparece en el menú lateral
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Título de Página (Pestaña del Navegador)</Label>
                  <Input
                    value={editForm.titulo_pagina || ""}
                    onChange={(e) => setEditForm({ ...editForm, titulo_pagina: e.target.value })}
                    placeholder="Título que aparece en la pestaña"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={editForm.descripcion || ""}
                    onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icono</Label>
                    <Input
                      value={editForm.icon || ""}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Página Padre</Label>
                    <Select
                      value={editForm.parent_id || "none"}
                      onValueChange={(value) => setEditForm({ ...editForm, parent_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin padre</SelectItem>
                        {pages.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editForm.visible}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, visible: checked })}
                    />
                    <Label>Visible</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editForm.requiere_auth}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, requiere_auth: checked })}
                    />
                    <Label>Requiere Auth</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{page.nombre}</div>
                    <div className="text-sm text-muted-foreground">{page.path}</div>
                    {page.titulo_pagina && (
                      <div className="text-xs text-muted-foreground">{page.titulo_pagina}</div>
                    )}
                  </div>
                  {page.parent_id && (
                    <Badge variant="outline" className="ml-2">Hijo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!page.parent_id && (
                    <Button 
                      onClick={() => handleStartAddSubPage(page.id)} 
                      variant="outline" 
                      size="sm"
                      title="Agregar sub-página"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  )}
                  <Switch
                    checked={page.visible}
                    onCheckedChange={() => handleToggleVisibility(page.id, page.visible)}
                  />
                  <Button onClick={() => handleStartEdit(page)} variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleDeleteClick(page.id)} variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Formulario de sub-página */}
        {showSubPageForm === page.id && (
          <Card className="border-primary ml-6 mt-2">
            <CardHeader>
              <CardTitle>Nueva Sub-página de "{page.nombre}"</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Path *</Label>
                  <Input
                    placeholder="/mi-subpagina"
                    value={newPageForm.path}
                    onChange={(e) => setNewPageForm({ ...newPageForm, path: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    placeholder="Mi Sub-página"
                    value={newPageForm.nombre}
                    onChange={(e) => setNewPageForm({ ...newPageForm, nombre: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Título de Página</Label>
                <Input
                  placeholder="Título que aparecerá en el navegador"
                  value={newPageForm.titulo_pagina}
                  onChange={(e) => setNewPageForm({ ...newPageForm, titulo_pagina: e.target.value })}
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción de la sub-página"
                  value={newPageForm.descripcion}
                  onChange={(e) => setNewPageForm({ ...newPageForm, descripcion: e.target.value })}
                />
              </div>
              <div>
                <Label>Icono</Label>
                <Input
                  placeholder="FileText"
                  value={newPageForm.icon}
                  onChange={(e) => setNewPageForm({ ...newPageForm, icon: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAddPage(page.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Sub-página
                </Button>
                <Button onClick={() => setShowSubPageForm(null)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {page.children && page.children.map(child => renderPage(child, level + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Páginas</h2>
          <p className="text-muted-foreground">
            Administra las rutas, nombres y jerarquía de las páginas de la aplicación
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Página
        </Button>
      </div>

      {showNewForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Nueva Página</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Path *</Label>
                <Input
                  placeholder="/mi-pagina"
                  value={newPageForm.path}
                  onChange={(e) => setNewPageForm({ ...newPageForm, path: e.target.value })}
                />
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input
                  placeholder="Mi Página"
                  value={newPageForm.nombre}
                  onChange={(e) => setNewPageForm({ ...newPageForm, nombre: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Título de Página</Label>
              <Input
                placeholder="Título que aparecerá en el navegador"
                value={newPageForm.titulo_pagina}
                onChange={(e) => setNewPageForm({ ...newPageForm, titulo_pagina: e.target.value })}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción de la página"
                value={newPageForm.descripcion}
                onChange={(e) => setNewPageForm({ ...newPageForm, descripcion: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icono</Label>
                <Input
                  placeholder="FileText"
                  value={newPageForm.icon}
                  onChange={(e) => setNewPageForm({ ...newPageForm, icon: e.target.value })}
                />
              </div>
              <div>
                <Label>Página Padre</Label>
                <Select
                  value={newPageForm.parent_id || "none"}
                  onValueChange={(value) => setNewPageForm({ ...newPageForm, parent_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre</SelectItem>
                    {pages.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleAddPage()}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Página
              </Button>
              <Button onClick={() => setShowNewForm(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {pages.map(page => renderPage(page))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar página?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la página y todas sus páginas hijas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
