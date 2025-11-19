import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ExportButtonProps {
  data: any[];
  filename?: string;
  sheetName?: string;
  formats?: ("excel" | "csv")[];
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  data,
  filename = "export",
  sheetName = "Datos",
  formats = ["excel", "csv"],
  disabled = false,
  className = "",
}: ExportButtonProps) {
  const exportToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success("Exportado a Excel", {
        description: `${data.length} registros exportados`,
      });
    } catch (error) {
      toast.error("Error al exportar", {
        description: "No se pudo generar el archivo Excel",
      });
    }
  };

  const exportToCSV = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      toast.success("Exportado a CSV", {
        description: `${data.length} registros exportados`,
      });
    } catch (error) {
      toast.error("Error al exportar", {
        description: "No se pudo generar el archivo CSV",
      });
    }
  };

  if (data.length === 0) {
    return null;
  }

  // Si solo hay un formato, botón directo
  if (formats.length === 1) {
    const format = formats[0];
    const handleClick = format === "excel" ? exportToExcel : exportToCSV;
    const Icon = format === "excel" ? FileSpreadsheet : FileText;

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        <Icon className="h-4 w-4 mr-2" />
        Exportar {format === "excel" ? "Excel" : "CSV"}
      </Button>
    );
  }

  // Dropdown con múltiples formatos
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={className}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.includes("excel") && (
          <DropdownMenuItem onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar a Excel
          </DropdownMenuItem>
        )}
        {formats.includes("csv") && (
          <DropdownMenuItem onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar a CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
