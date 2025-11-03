import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacialPhotoApproval } from '@/components/admin/FacialPhotoApproval';
import { Loader2 } from 'lucide-react';

const AprobarFotosFaciales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol, activo')
        .eq('user_id', user.id)
        .single();

      if (!empleado || empleado.rol !== 'admin_rrhh' || !empleado.activo) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <FacialPhotoApproval />
    </div>
  );
};

export default AprobarFotosFaciales;
