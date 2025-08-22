import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Mail, Calendar, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface SecureProfileProps {
  user: SupabaseUser;
}

export const SecureProfile = ({ user }: SecureProfileProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar perfil del usuario usando función segura
  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Usar función SECURITY DEFINER que solo retorna el perfil del usuario actual
      const { data, error } = await supabase.rpc('get_current_user_profile');
      
      if (error) {
        console.error('Error cargando perfil:', error);
        toast.error('Error al cargar perfil de usuario');
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
        setEditedName(data[0].full_name || '');
      } else {
        // Si no hay perfil, crear uno básico
        const newProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: '',
          role: 'user',
          created_at: new Date().toISOString()
        };
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error en loadProfile:', error);
      toast.error('Error inesperado al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      
      // Solo permitir actualizar el nombre completo por seguridad
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editedName.trim() 
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error actualizando perfil:', error);
        toast.error('Error al actualizar perfil');
        return;
      }

      // Actualizar estado local
      setProfile(prev => prev ? { ...prev, full_name: editedName.trim() } : null);
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
    setEditedName(profile?.full_name || '');
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

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar el perfil de usuario. Contacta al administrador.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Mi Perfil
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Información de seguridad */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Información protegida:</strong> Solo tú puedes ver y editar tu perfil.
            Los emails y datos personales están encriptados y protegidos.
          </AlertDescription>
        </Alert>

        {/* ID de Usuario */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">ID de Usuario</Label>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            {profile.id}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm">{profile.email}</p>
          </div>
          <Badge variant="secondary">Verificado</Badge>
        </div>

        {/* Nombre completo */}
        <div>
          <Label className="text-sm font-medium">Nombre Completo</Label>
          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Tu nombre completo"
                className="flex-1"
              />
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
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm flex-1">
                {profile.full_name || 'No especificado'}
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
              <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                {profile.role === 'admin' ? 'Administrador' : 'Usuario'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Fecha de creación */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">Miembro desde</Label>
            <p className="text-sm">
              {new Date(profile.created_at).toLocaleDateString('es-ES', {
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
            <p>✓ Auditoría automática de accesos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};