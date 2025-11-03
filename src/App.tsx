
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Layout components
import UnifiedLayout from "./components/UnifiedLayout";
import { AdminLayout } from "./components/admin/AdminLayout";

// Pages
import Index from "./pages/Index";
import UnifiedAuth from "./pages/UnifiedAuth";
import HomePublico from "./pages/HomePublico";
import Fichero from "./pages/Fichero";
import Tareas from "./pages/Tareas";
import Ranking from "./pages/Ranking";
import Desafios from "./pages/Desafios";
import Insignias from "./pages/Insignias";
import Premios from "./pages/Premios";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStats from "./pages/AdminStats";
import MedalManagement from "./pages/MedalManagement";
import Nomina from "./pages/Nomina";
import EmpleadoDashboard from "./pages/EmpleadoDashboard";
import Evaluaciones from "./pages/Evaluaciones";
import Vacaciones from "./pages/Vacaciones";
import Solicitudes from "./pages/Solicitudes";
import Anotaciones from "./pages/Anotaciones";
import AsignarSucursales from "./pages/AsignarSucursales";
import DesafiosTV from "./pages/DesafiosTV";

// Legacy pages (mantener por compatibilidad)
import Gondolas from "./pages/Gondolas";
import Configuracion from "./pages/Configuracion";
import GondolasEdit from "./pages/GondolasEdit";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import KioscoCheckIn from "./pages/KioscoCheckIn";
import Autogestion from "./pages/Autogestion";
import PrintPreview from "./pages/PrintPreview";
import CalificarEmpleado from "./pages/CalificarEmpleado";
import CalificarEmpleadoV2 from "./pages/CalificarEmpleadoV2";
import DemoQRCalificacion from "./pages/DemoQRCalificacion";
import AdminAuthLogs from "./pages/AdminAuthLogs";
import SubirFotoFacial from "./pages/SubirFotoFacial";
import AprobarFotosFaciales from "./pages/AprobarFotosFaciales";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Página de inicio - selección de tipo de cliente */}
          <Route path="/" element={<Index />} />
          
          {/* Autenticación unificada */}
          <Route path="/auth" element={<UnifiedAuth />} />
          
          {/* Rutas protegidas con layout unificado */}
          <Route path="/" element={<UnifiedLayout />}>
            {/* Dashboard Principal Unificado */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="mi-dashboard" element={<EmpleadoDashboard />} />
            
            {/* Módulo RRHH */}
            <Route path="rrhh/nomina" element={<Nomina />} />
            <Route path="rrhh/nomina/resumen" element={<Nomina />} />
            <Route path="rrhh/nomina/empleados" element={<Nomina />} />
            <Route path="rrhh/nomina/acceso-seguridad" element={<Nomina />} />
            <Route path="rrhh/nomina/puestos" element={<Nomina />} />
            <Route path="rrhh/nomina/documentos" element={<Nomina />} />
            <Route path="rrhh/nomina/permisos" element={<Nomina />} />
            <Route path="rrhh/nomina/doc-obligatorios" element={<Nomina />} />
            <Route path="rrhh/nomina/asignaciones" element={<Nomina />} />
            <Route path="rrhh/nomina/vista-empleado" element={<Nomina />} />
            <Route path="rrhh/nomina/organigrama" element={<Nomina />} />
            <Route path="rrhh/evaluaciones" element={<Evaluaciones />} />
            <Route path="rrhh/vacaciones" element={<Vacaciones />} />
            <Route path="rrhh/solicitudes" element={<Solicitudes />} />
            <Route path="rrhh/anotaciones" element={<Anotaciones />} />
            <Route path="rrhh/subir-foto-facial" element={<SubirFotoFacial />} />
            
            {/* Módulo Operaciones */}
            <Route path="operaciones/fichero" element={<Fichero />} />
            <Route path="operaciones/fichero/informe" element={<Navigate to="/operaciones/fichero#misfichadas" replace />} />
            <Route path="operaciones/fichero/estado-animo" element={<Navigate to="/operaciones/fichero#estado-animo" replace />} />
            <Route path="operaciones/fichero/estadisticas" element={<Navigate to="/operaciones/fichero#estadisticas" replace />} />
            <Route path="operaciones/fichero/incidencias" element={<Navigate to="/operaciones/fichero#incidencias" replace />} />
            <Route path="operaciones/fichero/historial" element={<Navigate to="/operaciones/fichero#historial" replace />} />
            <Route path="operaciones/fichero/horarios" element={<Navigate to="/operaciones/fichero#horarios" replace />} />
            <Route path="operaciones/fichero/configuracion" element={<Navigate to="/operaciones/fichero#config" replace />} />
            <Route path="operaciones/fichero/administrar" element={<Navigate to="/operaciones/fichero#admin" replace />} />
            <Route path="operaciones/tareas" element={<Tareas />} />
            <Route path="operaciones/tareas/mis-tareas" element={<Tareas />} />
            <Route path="operaciones/tareas/asignadas" element={<Tareas />} />
            <Route path="operaciones/tareas/calendario" element={<Tareas />} />
            <Route path="operaciones/tareas/reportes" element={<Tareas />} />
            
            {/* Módulo Reconocimiento */}
            <Route path="reconoce" element={<HomePublico />} />
            <Route path="reconoce/dashboard" element={<Dashboard />} />
            <Route path="reconoce/ranking" element={<Ranking />} />
            <Route path="reconoce/desafios" element={<Desafios />} />
            <Route path="reconoce/insignias" element={<Insignias />} />
            <Route path="reconoce/premios" element={<Premios />} />
            <Route path="medal-management" element={<MedalManagement />} />
            <Route path="reconoce/desafios-tv" element={<DesafiosTV />} />
            
            {/* Rutas directas para reconocimiento */}
            <Route path="ranking" element={<Ranking />} />
            <Route path="desafios" element={<Desafios />} />
            <Route path="insignias" element={<Insignias />} />
            <Route path="premios" element={<Premios />} />
            
            {/* Módulo Administración con nuevo layout */}
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminStats />} />
              <Route path="empleados" element={<AdminDashboard />} />
              <Route path="asignar-sucursales" element={<AsignarSucursales />} />
              <Route path="sucursales" element={<AdminDashboard />} />
              <Route path="gondolas" element={<Gondolas />} />
              <Route path="gondolasedit" element={<GondolasEdit />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="auth-logs" element={<AdminAuthLogs />} />
              <Route path="aprobar-fotos-faciales" element={<AprobarFotosFaciales />} />
            </Route>
            
            {/* Redirects de compatibilidad (rutas antiguas -> nuevas) */}
            <Route path="nomina" element={<Navigate to="/rrhh/nomina" replace />} />
            <Route path="evaluaciones" element={<Navigate to="/rrhh/evaluaciones" replace />} />
            <Route path="vacaciones" element={<Navigate to="/rrhh/vacaciones" replace />} />
            <Route path="solicitudes" element={<Navigate to="/rrhh/solicitudes" replace />} />
            <Route path="anotaciones" element={<Navigate to="/rrhh/anotaciones" replace />} />
            <Route path="fichero" element={<Navigate to="/operaciones/fichero" replace />} />
            <Route path="tareas" element={<Navigate to="/operaciones/tareas" replace />} />
            <Route path="tareas/:subpath" element={<Navigate to="/operaciones/tareas" replace />} />
            <Route path="desafios-tv" element={<Navigate to="/reconoce/desafios-tv" replace />} />
            <Route path="configuracion" element={<Navigate to="/admin/configuracion" replace />} />
          </Route>

          {/* Herramientas especiales (sin layout) */}
          <Route path="/kiosco" element={<KioscoCheckIn />} />
          <Route path="/autogestion" element={<Autogestion />} />
          <Route path="/print-preview" element={<PrintPreview />} />
          
          {/* Calificación de empleados (página pública) */}
          <Route path="/calificar/:token" element={<CalificarEmpleado />} />
          <Route path="/calificar-v2/:token" element={<CalificarEmpleadoV2 />} />
          
          {/* Generador de QR Demo (protegido) */}
          <Route path="/" element={<UnifiedLayout />}>
            <Route path="admin/demo-qr-calificacion" element={<DemoQRCalificacion />} />
          </Route>
          
          {/* Redirects legacy */}
          <Route path="/gondolas" element={<Navigate to="/admin/gondolas" replace />} />
          <Route path="/gondolasedit" element={<Navigate to="/admin/gondolasedit" replace />} />
          <Route path="/reconoce/auth" element={<Navigate to="/auth?redirect=/reconoce" replace />} />
          <Route path="/reconoce/home" element={<Navigate to="/reconoce" replace />} />
          <Route path="/reconoce/admin" element={<Navigate to="/admin" replace />} />
          
          {/* 404 - debe ir al final */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
