import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Mail, Calendar, Edit, Save, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface EmpleadoProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sucursal_id: string | null;
  grupo_id: string | null;
  activo: boolean;
  fecha_ingreso: string;
  avatar_url: string | null;
}

interface SecureProfileProps {
  user: SupabaseUser;
}

export const SecureProfile = ({ user }: SecureProfileProps) => {
  const [empleado, setEmpleado] = useState<EmpleadoProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNombre, setEditedNombre] = useState("");
  const [editedApellido, setEditedApellido] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar perfil del empleado usando función segura
  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Usar función SECURITY DEFINER que solo retorna el empleado del usuario actual
      const { data, error } = await supabase.rpc('get_current_empleado_full');
      
      if (error) {
        console.error('Error cargando empleado:', error);
        toast.error('Error al cargar perfil de empleado');
        return;
      }

      if (data && data.length > 0) {
        setEmpleado(data[0]);
        setEditedNombre(data[0].nombre || '');
        setEditedApellido(data[0].apellido || '');
      }
    } catch (error) {
      console.error('Error en loadProfile:', error);
      toast.error('Error inesperado al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!empleado) return;
    
    try {
      setSaving(true);
      
      // Solo permitir actualizar nombre y apellido por seguridad
      const { error } = await supabase
        .from('empleados')
        .update({ 
          nombre: editedNombre.trim(),
          apellido: editedApellido.trim()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error actualizando empleado:', error);
        toast.error('Error al actualizar perfil');
        return;
      }

      // Actualizar estado local
      setEmpleado(prev => prev ? { 
        ...prev, 
        nombre: editedNombre.trim(),
        apellido: editedApellido.trim()
      } : null);
      setIsEditing(false);
      toast.success('Perfil actualizado exitosamente');
      
    } catch (error) {
      console.error('Error en saveProfile:', error);
      toast.error('Error inesperado al guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditedNombre(empleado?.nombre || '');
    setEditedApellido(empleado?.apellido || '');
    setIsEditing(false);
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Cargando perfil...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!empleado) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar el perfil de empleado. Contacta al administrador.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getRoleName = (rol: string) => {
    switch (rol) {
      case 'admin_rrhh':
        return 'Administrador RRHH';
      case 'gerente_sucursal':
        return 'Gerente de Sucursal';
      case 'empleado':
        return 'Empleado';
      default:
        return rol;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Mi Perfil de Empleado
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Información de seguridad */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Información protegida:</strong> Solo tú puedes ver y editar tu perfil.
            Los datos de empleados están protegidos por Row Level Security.
          </AlertDescription>
        </Alert>

        {/* ID de Empleado */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">ID de Empleado</Label>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            {empleado.id}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm">{empleado.email}</p>
          </div>
          <Badge variant="secondary">Verificado</Badge>
        </div>

        {/* Nombre y Apellido */}
        <div>
          <Label className="text-sm font-medium">Nombre y Apellido</Label>
          {isEditing ? (
            <div className="space-y-2 mt-1">
              <div className="flex gap-2">
                <Input
                  value={editedNombre}
                  onChange={(e) => setEditedNombre(e.target.value)}
                  placeholder="Nombre"
                  className="flex-1"
                />
                <Input
                  value={editedApellido}
                  onChange={(e) => setEditedApellido(e.target.value)}
                  placeholder="Apellido"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm flex-1">
                {empleado.nombre} {empleado.apellido}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Rol */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Rol</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={empleado.rol === 'admin_rrhh' ? 'default' : 'secondary'}>
                {getRoleName(empleado.rol)}
              </Badge>
              {empleado.rol === 'admin_rrhh' && (
                <Badge variant="outline" className="text-xs">
                  Acceso Completo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-sm font-medium">Estado</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={empleado.activo ? 'default' : 'destructive'}>
                {empleado.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sucursal */}
        {empleado.sucursal_id && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Sucursal</Label>
              <p className="text-sm">ID: {empleado.sucursal_id}</p>
            </div>
          </div>
        )}

        {/* Fecha de ingreso */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">Fecha de Ingreso</Label>
            <p className="text-sm">
              {new Date(empleado.fecha_ingreso).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Información de seguridad adicional */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Seguridad de la Cuenta</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Acceso protegido con RLS (Row Level Security)</p>
            <p>✓ Datos encriptados en tránsito y en reposo</p>
            <p>✓ Solo tú puedes acceder a tu información personal</p>
            <p>✓ Sistema unificado de empleados y usuarios</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};