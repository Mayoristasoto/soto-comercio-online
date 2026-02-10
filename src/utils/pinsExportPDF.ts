import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PinGenerado {
  empleado_id: string
  nombre: string
  apellido: string
  legajo: string | null
  pin_generado: string
  ya_tenia_pin: boolean
}

interface PinBlanqueado {
  empleado_id: string
  nombre: string
  apellido: string
  legajo: string | null
  dni: string
  pin_asignado: string
  email: string
}

export const exportarPinsPDF = (pins: PinGenerado[]): string => {
  const doc = new jsPDF()
  const fechaGeneracion = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  
  // Título
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Listado de PINs de Empleados', 105, 20, { align: 'center' })
  
  // Subtítulo con fecha
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado el ${fechaGeneracion}`, 105, 28, { align: 'center' })
  
  // Advertencia de confidencialidad
  doc.setFontSize(9)
  doc.setTextColor(200, 0, 0)
  doc.text('⚠️ DOCUMENTO CONFIDENCIAL - Destruir después de entregar los PINs a los empleados', 105, 36, { align: 'center' })
  
  // Resetear color
  doc.setTextColor(0)
  
  // Estadísticas
  const nuevos = pins.filter(p => !p.ya_tenia_pin).length
  const actualizados = pins.filter(p => p.ya_tenia_pin).length
  
  doc.setFontSize(10)
  doc.text(`Total: ${pins.length} empleados | Nuevos: ${nuevos} | Actualizados: ${actualizados}`, 14, 45)
  
  // Tabla de PINs
  const tableData = pins.map((pin, index) => [
    (index + 1).toString(),
    `${pin.apellido}, ${pin.nombre}`,
    pin.legajo || 'N/A',
    pin.pin_generado,
    pin.ya_tenia_pin ? 'Actualizado' : 'Nuevo'
  ])
  
  autoTable(doc, {
    startY: 52,
    head: [['#', 'Empleado', 'Legajo', 'PIN', 'Estado']],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 25, halign: 'center', fontStyle: 'bold', fontSize: 12 },
      4: { cellWidth: 30, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    didDrawPage: (data: any) => {
      // Pie de página con número de página
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
  })
  
  // Nombre del archivo
  const fechaArchivo = format(new Date(), 'yyyy-MM-dd_HHmm')
  const filename = `PINs_Empleados_${fechaArchivo}.pdf`
  
  // Guardar
  doc.save(filename)
  
  return filename
}

interface EmpleadoCredencial {
  nombre: string
  apellido: string
  legajo: string | null
  email: string
  dni: string
}

export const exportarCredencialesEmpleadosPDF = (empleados: EmpleadoCredencial[]): string => {
  const doc = new jsPDF()
  const fechaGeneracion = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Credenciales de Acceso - Sistema SOTO', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado el ${fechaGeneracion}`, 105, 28, { align: 'center' })
  
  doc.setFontSize(9)
  doc.setTextColor(200, 0, 0)
  doc.text('⚠️ DOCUMENTO CONFIDENCIAL - Destruir después de entregar las credenciales', 105, 36, { align: 'center' })
  
  doc.setTextColor(0)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Instrucciones de primer acceso:', 14, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('1. Ingresar el email en la pantalla de login', 14, 52)
  doc.text('2. Usar los últimos 4 dígitos del DNI como contraseña', 14, 57)
  doc.text('3. El sistema pedirá crear una contraseña nueva en el primer ingreso', 14, 62)
  
  doc.setFontSize(10)
  doc.text(`Total: ${empleados.length} empleados`, 14, 72)
  
  const tableData = empleados.map((emp, index) => [
    (index + 1).toString(),
    `${emp.apellido}, ${emp.nombre}`,
    emp.legajo || 'N/A',
    emp.email,
    emp.dni.slice(-4)
  ])
  
  autoTable(doc, {
    startY: 78,
    head: [['#', 'Empleado', 'Legajo', 'Email', 'PIN']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 60 },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 11 }
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
  })
  
  const fechaArchivo = format(new Date(), 'yyyy-MM-dd_HHmm')
  const filename = `Credenciales_Empleados_${fechaArchivo}.pdf`
  doc.save(filename)
  return filename
}

export const exportarPinsBlanqueadosPDF = (pins: PinBlanqueado[]): string => {
  const doc = new jsPDF()
  const fechaGeneracion = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  
  // Título
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Credenciales de Acceso - Sistema SOTO', 105, 20, { align: 'center' })
  
  // Subtítulo con fecha
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado el ${fechaGeneracion}`, 105, 28, { align: 'center' })
  
  // Advertencia de confidencialidad
  doc.setFontSize(9)
  doc.setTextColor(200, 0, 0)
  doc.text('⚠️ DOCUMENTO CONFIDENCIAL - Destruir después de entregar las credenciales', 105, 36, { align: 'center' })
  
  // Resetear color
  doc.setTextColor(0)
  
  // Instrucciones
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Instrucciones de primer acceso:', 14, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('1. Ingresar a la página de login y seleccionar "Acceso con PIN"', 14, 52)
  doc.text('2. Buscar su nombre e ingresar el PIN (últimos 4 dígitos de su DNI)', 14, 57)
  doc.text('3. El sistema le pedirá crear una contraseña para acceso web', 14, 62)
  
  // Estadísticas
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total: ${pins.length} empleados con credenciales generadas`, 14, 72)
  
  // Tabla de credenciales
  const tableData = pins.map((pin, index) => [
    (index + 1).toString(),
    `${pin.apellido}, ${pin.nombre}`,
    pin.legajo || 'N/A',
    pin.email,
    pin.pin_asignado
  ])
  
  autoTable(doc, {
    startY: 78,
    head: [['#', 'Empleado', 'Legajo', 'Email', 'PIN']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 60 },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 11 }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    didDrawPage: (data: any) => {
      // Pie de página con número de página
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
  })
  
  // Nombre del archivo
  const fechaArchivo = format(new Date(), 'yyyy-MM-dd_HHmm')
  const filename = `Credenciales_Acceso_${fechaArchivo}.pdf`
  
  // Guardar
  doc.save(filename)
  
  return filename
}
