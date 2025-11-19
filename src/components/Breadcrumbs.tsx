import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  path: string;
}

// Mapeo de rutas a nombres legibles
const routeLabels: Record<string, string> = {
  // General
  "dashboard": "Dashboard",
  "mi-dashboard": "Mi Dashboard",
  "configuracion": "Configuración",
  
  // RRHH
  "rrhh": "RRHH",
  "evaluaciones": "Evaluaciones",
  "solicitudes": "Solicitudes",
  "anotaciones": "Anotaciones",
  "nomina": "Nómina",
  "vacaciones": "Vacaciones",
  "payroll": "Liquidaciones",
  
  // Operaciones
  "operaciones": "Operaciones",
  "fichero": "Fichero",
  "tareas": "Tareas",
  "gondolas": "Góndolas",
  "edit": "Editar",
  
  // Reconocimiento
  "reconoce": "Reconocimiento",
  "premios": "Premios",
  "ranking": "Ranking",
  "desafios": "Desafíos",
  "insignias": "Insignias",
  "medallas": "Medallas",
  
  // Admin
  "admin": "Administración",
  "configuracion-admin": "Configuración",
  "estadisticas": "Estadísticas",
  "logs": "Logs de Autenticación",
  "kiosko": "Kiosko",
  "check-in": "Check-in",
  "foto-facial": "Foto Facial",
  "subir-foto": "Subir Foto",
  "aprobar-fotos": "Aprobar Fotos",
  "fichas-metricas": "Métricas de Fichaje",
  "reportes-horarios": "Reportes de Horarios",
  "asignar-sucursales": "Asignar Sucursales",
  "instructivo-screenshots": "Capturas Instructivo",
  "informe-ejecutivo": "Informe Ejecutivo",
  "presentacion-ejecutiva": "Presentación Ejecutiva",
  "mis-recibos": "Mis Recibos",
  "autogestion": "Autogestión",
  "calificar": "Calificar Empleado",
  "qr-demo": "QR Demo",
  "generar-qr": "Generar QR",
  "desafios-tv": "Desafíos TV",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // No mostrar breadcrumbs en home o auth
  if (pathSegments.length === 0 || pathSegments[0] === "auth") {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Inicio", path: "/" }
  ];

  // Construir breadcrumbs dinámicamente
  let currentPath = "";
  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  });

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 container-padding">
      <Link
        to="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 2;
        
        return (
          <Fragment key={crumb.path}>
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
