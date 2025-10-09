import { Button } from "@/components/ui/button";

const PrintPreview = () => {
  const empleado = {
    nombre: "Juan",
    apellido: "Pérez García",
    puesto: "Encargado de Almacén"
  };

  const tareas = [
    {
      id: "1",
      titulo: "Revisar inventario de productos refrigerados",
      descripcion: "Verificar stock de lácteos y productos frescos, actualizar sistema con cantidades reales",
      prioridad: "urgente",
      fecha_limite: "2025-10-09"
    },
    {
      id: "2",
      titulo: "Preparar pedido para cliente mayorista #4523",
      descripcion: "Empacar y etiquetar pedido de 150 unidades según especificaciones del cliente",
      prioridad: "alta",
      fecha_limite: "2025-10-10"
    },
    {
      id: "3",
      titulo: "Limpiar y organizar zona de recepción",
      descripcion: "Mantener el área de carga/descarga ordenada y limpia para cumplir con normas de seguridad",
      prioridad: "media",
      fecha_limite: null
    },
    {
      id: "4",
      titulo: "Actualizar registros de temperatura",
      descripcion: "Registrar temperaturas de cámaras frigoríficas en el sistema cada 2 horas",
      prioridad: "baja",
      fecha_limite: "2025-10-09"
    }
  ];

  const fecha = new Date();
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prioridadEmoji = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return '🔴';
      case 'alta': return '🟠';
      case 'media': return '🟡';
      case 'baja': return '🟢';
      default: return '⚪';
    }
  };

  const prioridadTexto = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'URGENTE';
      case 'alta': return 'ALTA';
      case 'media': return 'MEDIA';
      case 'baja': return 'BAJA';
      default: return 'NORMAL';
    }
  };

  const prioridadClass = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-100 text-red-700 border border-red-300';
      case 'alta': return 'bg-orange-100 text-orange-700 border border-orange-300';
      case 'media': return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
      case 'baja': return 'bg-green-100 text-green-700 border border-green-300';
      default: return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg print:shadow-none">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-8 p-8">
            <h1 className="text-3xl font-bold m-0">📋 TAREAS DIARIAS</h1>
            <h2 className="text-xl text-gray-600 mt-2">Plan de Trabajo</h2>
          </div>

          <div className="px-8 pb-8">
            {/* Employee Info */}
            <div className="bg-gray-100 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-bold mb-3">👤 {empleado.nombre} {empleado.apellido}</h3>
              <p><strong>Puesto:</strong> {empleado.puesto}</p>
              <p className="font-bold text-blue-600 text-lg mt-2">📅 {fechaFormateada}</p>
            </div>

            {/* Tasks */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">📝 Tareas Pendientes ({tareas.length})</h3>
              {tareas.map((tarea, index) => (
                <div key={tarea.id} className="border border-gray-300 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                    <div className="font-bold text-base flex-1 mr-4">
                      <span className="inline-block w-4 h-4 border-2 border-black mr-3 align-middle"></span>
                      {index + 1}. {tarea.titulo}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${prioridadClass(tarea.prioridad)}`}>
                      {prioridadEmoji(tarea.prioridad)} {prioridadTexto(tarea.prioridad)}
                    </div>
                  </div>
                  {tarea.descripcion && (
                    <div className="text-gray-600 mb-3 leading-relaxed">
                      <strong>Descripción:</strong> {tarea.descripcion}
                    </div>
                  )}
                  {tarea.fecha_limite && (
                    <div className="text-gray-500 text-sm italic">
                      ⏰ Fecha límite: {new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Completion Section */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <div className="font-bold mb-6 text-base">✅ CONTROL DE FINALIZACIÓN</div>
              <div className="flex justify-between">
                <div className="w-48 text-center">
                  <div className="border-b border-black mb-2 h-12"></div>
                  <p><strong>Empleado</strong><br />Firma y fecha</p>
                </div>
                <div className="w-48 text-center">
                  <div className="border-b border-black mb-2 h-12"></div>
                  <p><strong>Supervisor</strong><br />Firma y fecha</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Documento generado automáticamente el {new Date().toLocaleString('es-ES')}</p>
              <p>Sistema de Gestión de Tareas - Kiosco CheckIn</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex gap-4 justify-center print:hidden">
          <Button onClick={() => window.print()} size="lg">
            🖨️ Imprimir Documento
          </Button>
          <Button onClick={() => window.close()} variant="outline" size="lg">
            Cerrar
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintPreview;
