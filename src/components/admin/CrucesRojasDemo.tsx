import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Trash2 } from 'lucide-react';

export function CrucesRojasDemo() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const GONZALO_ID = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4';

  const insertarCrucesDemo = async () => {
    setLoading(true);
    try {
      // Primero eliminar cruces demo anteriores
      await supabase
        .from('empleado_cruces_rojas')
        .delete()
        .eq('empleado_id', GONZALO_ID)
        .ilike('observaciones', 'Demo:%');

      // Insertar nuevas cruces rojas demo
      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .insert([
          {
            empleado_id: GONZALO_ID,
            tipo_infraccion: 'pausa_excedida',
            fecha_infraccion: new Date().toISOString().split('T')[0],
            minutos_diferencia: 25,
            observaciones: 'Demo: Pausa excedida 25 minutos'
          },
          {
            empleado_id: GONZALO_ID,
            tipo_infraccion: 'pausa_excedida',
            fecha_infraccion: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            minutos_diferencia: 18,
            observaciones: 'Demo: Pausa excedida 18 minutos'
          },
          {
            empleado_id: GONZALO_ID,
            tipo_infraccion: 'llegada_tarde',
            fecha_infraccion: new Date(Date.now() - 172800000).toISOString().split('T')[0],
            minutos_diferencia: 10,
            observaciones: 'Demo: Llegada 10 minutos tarde'
          }
        ]);

      if (error) throw error;

      toast({
        title: "✅ Cruces rojas demo creadas",
        description: `Se insertaron 3 cruces rojas para Gonzalo Justiniano (2 pausas excedidas + 1 llegada tarde)`,
      });

      // Consultar y mostrar el resumen
      const { data: resumen } = await supabase
        .from('empleado_cruces_rojas_semana_actual')
        .select('*')
        .eq('empleado_id', GONZALO_ID)
        .single();

      if (resumen) {
        console.log('Resumen cruces rojas:', resumen);
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiarCrucesDemo = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .delete()
        .eq('empleado_id', GONZALO_ID)
        .ilike('observaciones', 'Demo:%');

      if (error) throw error;

      toast({
        title: "🧹 Cruces demo eliminadas",
        description: "Se eliminaron todas las cruces rojas demo de Gonzalo Justiniano",
      });

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Demo: Cruces Rojas - Gonzalo Justiniano
        </CardTitle>
        <CardDescription>
          Herramienta de prueba para insertar cruces rojas demo. Estas se mostrarán en el kiosco cuando Gonzalo haga check-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-orange-800">Cruces que se insertarán:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>☕ Pausa excedida: 25 minutos (hoy)</li>
            <li>☕ Pausa excedida: 18 minutos (ayer)</li>
            <li>🕐 Llegada tarde: 10 minutos (hace 2 días)</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={insertarCrucesDemo}
            disabled={loading}
            className="flex-1"
            variant="default"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Insertar Cruces Demo
          </Button>

          <Button 
            onClick={limpiarCrucesDemo}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar Cruces Demo
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">💡 Cómo probar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Haz clic en "Insertar Cruces Demo"</li>
            <li>Ve a <code className="bg-blue-100 px-1 rounded">/kiosco</code></li>
            <li>Haz reconocimiento facial con Gonzalo Justiniano</li>
            <li>Verás la alerta con las 3 cruces rojas antes del check-in</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
