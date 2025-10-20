import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Download, Printer, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const PrintPreview = () => {
  const [printerType, setPrinterType] = useState<"termica" | "a4">("a4");
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

  const descargarEjemplo = () => {
    const contenidoHTML = document.querySelector('.documento-impresion')?.innerHTML || '';
    const htmlCompleto = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ejemplo Tareas - ${printerType === 'termica' ? 'Térmica' : 'A4'}</title>
          <style>
            ${printerType === 'termica' ? `
              body { margin: 0; padding: 10mm; font-family: monospace; font-size: 12pt; width: 80mm; }
              h1 { font-size: 16pt; text-align: center; margin: 5mm 0; }
              .task { border: 1px solid #000; padding: 3mm; margin: 2mm 0; }
            ` : `
              body { margin: 0; padding: 20mm; font-family: Arial, sans-serif; }
              .print\\:hidden { display: none; }
            `}
          </style>
        </head>
        <body>${contenidoHTML}</body>
      </html>
    `;
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejemplo-tareas-${printerType}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className={printerType === 'termica' ? 'max-w-xs mx-auto' : 'max-w-4xl mx-auto'}>
        <div className="bg-card shadow-lg print:shadow-none documento-impresion"
             style={printerType === 'termica' ? { width: '80mm' } : {}}>
          {/* Header */}
          <div className={`text-center border-b-2 border-border pb-4 mb-${printerType === 'termica' ? '4' : '8'} p-${printerType === 'termica' ? '4' : '8'}`}>
            <h1 className={`${printerType === 'termica' ? 'text-xl' : 'text-3xl'} font-bold m-0`}>📋 TAREAS DIARIAS</h1>
            {printerType === 'a4' && <h2 className="text-xl text-muted-foreground mt-2">Plan de Trabajo</h2>}
          </div>

          <div className={`px-${printerType === 'termica' ? '4' : '8'} pb-${printerType === 'termica' ? '4' : '8'}`}>
            {/* Employee Info */}
            <div className={`bg-muted p-${printerType === 'termica' ? '3' : '6'} rounded-lg mb-${printerType === 'termica' ? '4' : '8'}`}>
              <h3 className={`${printerType === 'termica' ? 'text-sm' : 'text-lg'} font-bold mb-2`}>👤 {empleado.nombre} {empleado.apellido}</h3>
              <p className={printerType === 'termica' ? 'text-xs' : ''}><strong>Puesto:</strong> {empleado.puesto}</p>
              <p className={`font-bold text-primary ${printerType === 'termica' ? 'text-xs' : 'text-lg'} mt-2`}>📅 {fechaFormateada}</p>
            </div>

            {/* Tasks */}
            <div className={`mb-${printerType === 'termica' ? '4' : '8'}`}>
              <h3 className={`${printerType === 'termica' ? 'text-sm' : 'text-lg'} font-bold mb-${printerType === 'termica' ? '2' : '4'}`}>📝 Tareas Pendientes ({tareas.length})</h3>
              {tareas.map((tarea, index) => (
                <div key={tarea.id} className={`border border-border rounded-lg p-${printerType === 'termica' ? '3' : '6'} mb-${printerType === 'termica' ? '3' : '6'}`}>
                  <div className={`flex ${printerType === 'termica' ? 'flex-col' : 'justify-between items-center'} mb-${printerType === 'termica' ? '2' : '4'} border-b border-border pb-${printerType === 'termica' ? '2' : '3'}`}>
                    <div className={`font-bold ${printerType === 'termica' ? 'text-xs' : 'text-base'} flex-1 ${printerType === 'a4' ? 'mr-4' : ''}`}>
                      <span className={`inline-block ${printerType === 'termica' ? 'w-3 h-3 border' : 'w-4 h-4 border-2'} border-foreground mr-${printerType === 'termica' ? '2' : '3'} align-middle`}></span>
                      {index + 1}. {tarea.titulo}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${prioridadClass(tarea.prioridad)} ${printerType === 'termica' ? 'mt-1' : ''}`}>
                      {prioridadEmoji(tarea.prioridad)} {prioridadTexto(tarea.prioridad)}
                    </div>
                  </div>
                  {tarea.descripcion && (
                    <div className={`text-muted-foreground mb-${printerType === 'termica' ? '2' : '3'} ${printerType === 'termica' ? 'text-xs' : ''} leading-relaxed`}>
                      <strong>Descripción:</strong> {tarea.descripcion}
                    </div>
                  )}
                  {tarea.fecha_limite && (
                    <div className={`text-muted-foreground ${printerType === 'termica' ? 'text-xs' : 'text-sm'} italic`}>
                      ⏰ Fecha límite: {new Date(tarea.fecha_limite).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Completion Section */}
            {printerType === 'a4' && (
              <div className="mt-12 pt-8 border-t-2 border-border">
                <div className="font-bold mb-6 text-base">✅ CONTROL DE FINALIZACIÓN</div>
                <div className="flex justify-between">
                  <div className="w-48 text-center">
                    <div className="border-b border-foreground mb-2 h-12"></div>
                    <p><strong>Empleado</strong><br />Firma y fecha</p>
                  </div>
                  <div className="w-48 text-center">
                    <div className="border-b border-foreground mb-2 h-12"></div>
                    <p><strong>Supervisor</strong><br />Firma y fecha</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className={`mt-${printerType === 'termica' ? '4' : '12'} pt-${printerType === 'termica' ? '4' : '8'} border-t border-border text-center text-xs text-muted-foreground`}>
              <p>Generado: {new Date().toLocaleString('es-ES')}</p>
              {printerType === 'a4' && <p>Sistema de Gestión de Tareas - Kiosco CheckIn</p>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center print:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <Settings2 className="mr-2 h-4 w-4" />
                Configuración
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuración de Impresora</DialogTitle>
                <DialogDescription>
                  Selecciona el tipo de impresora para ajustar el formato del documento
                </DialogDescription>
              </DialogHeader>
              <RadioGroup value={printerType} onValueChange={(value: any) => setPrinterType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a4" id="a4" />
                  <Label htmlFor="a4" className="cursor-pointer">
                    <div className="font-semibold">Impresora A4 (Estándar)</div>
                    <div className="text-sm text-muted-foreground">Formato completo con firmas y detalles</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="termica" id="termica" />
                  <Label htmlFor="termica" className="cursor-pointer">
                    <div className="font-semibold">Impresora Térmica (80mm)</div>
                    <div className="text-sm text-muted-foreground">Formato compacto para tickets</div>
                  </Label>
                </div>
              </RadioGroup>
            </DialogContent>
          </Dialog>

          <Button onClick={() => window.print()} size="lg">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>

          <Button onClick={descargarEjemplo} variant="secondary" size="lg">
            <Download className="mr-2 h-4 w-4" />
            Descargar Ejemplo
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
          ${printerType === 'termica' ? `
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
          ` : ''}
        }
      `}</style>
    </div>
  );
};

export default PrintPreview;
