
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout components
import UnifiedLayout from "./components/UnifiedLayout";

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
import MedalManagement from "./pages/MedalManagement";
import Nomina from "./pages/Nomina";
import EmpleadoDashboard from "./pages/EmpleadoDashboard";
import Evaluaciones from "./pages/Evaluaciones";
import Vacaciones from "./pages/Vacaciones";

// Legacy pages (mantener por compatibilidad)
import Comercio from "./pages/Comercio";
import Particular from "./pages/Particular";
import Reventa from "./pages/Reventa";
import Gulero from "./pages/Gulero";
import Mayorista from "./pages/Mayorista";
import Centum from "./pages/Centum";
import Gondolas from "./pages/Gondolas";
import GondolasEdit from "./pages/GondolasEdit";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import KioscoCheckIn from "./pages/KioscoCheckIn";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Página de inicio - redirige al login */}
          <Route path="/" element={<Index />} />
          
          {/* Autenticación unificada */}
          <Route path="/auth" element={<UnifiedAuth />} />
          
          {/* Rutas protegidas con layout unificado */}
          <Route path="/" element={<UnifiedLayout />}>
            {/* Módulo Reconocimiento */}
            <Route path="reconoce" element={<HomePublico />} />
            <Route path="reconoce/dashboard" element={<Dashboard />} />
            <Route path="reconoce/ranking" element={<Ranking />} />
            <Route path="reconoce/desafios" element={<Desafios />} />
            <Route path="reconoce/insignias" element={<Insignias />} />
            <Route path="reconoce/premios" element={<Premios />} />
            <Route path="reconoce/medals" element={<MedalManagement />} />
            
            {/* Módulo Control Horario */}
            <Route path="fichero" element={<Fichero />} />
            
            {/* Módulo Gestión de Tareas */}
            <Route path="tareas" element={<Tareas />} />
            <Route path="tareas/mis-tareas" element={<Tareas />} />
            <Route path="tareas/asignadas" element={<Tareas />} />
            <Route path="tareas/calendario" element={<Tareas />} />
            <Route path="tareas/reportes" element={<Tareas />} />
            
            {/* Administración */}
            <Route path="admin/empleados" element={<AdminDashboard />} />
            <Route path="admin/sucursales" element={<AdminDashboard />} />
            <Route path="admin/configuracion" element={<AdminDashboard />} />
            
            {/* Módulo de Nómina */}
            <Route path="nomina" element={<Nomina />} />
            
            {/* Dashboard de Empleado */}
            <Route path="mi-dashboard" element={<EmpleadoDashboard />} />
            
            {/* Módulo de Evaluaciones */}
            <Route path="evaluaciones" element={<Evaluaciones />} />
            
            {/* Módulo de Vacaciones */}
            <Route path="vacaciones" element={<Vacaciones />} />
          </Route>

          {/* Legacy routes (mantener por compatibilidad) */}
          <Route path="/comercio" element={<Comercio />} />
          <Route path="/particular" element={<Particular />} />
          <Route path="/reventa" element={<Reventa />} />
          <Route path="/gulero" element={<Gulero />} />
          <Route path="/mayorista" element={<Mayorista />} />
          <Route path="/centum" element={<Centum />} />
          <Route path="/gondolas" element={<Gondolas />} />
          <Route path="/gondolasedit" element={<GondolasEdit />} />
          
          {/* Kiosco Check-In Route */}
          <Route path="/kiosco" element={<KioscoCheckIn />} />
          
          {/* Rutas de compatibilidad que redirigen al nuevo sistema */}
          <Route path="/reconoce/auth" element={<Navigate to="/auth?redirect=/reconoce" replace />} />
          <Route path="/reconoce/home" element={<Navigate to="/reconoce" replace />} />
          <Route path="/reconoce/admin" element={<Navigate to="/admin/empleados" replace />} />
          
          {/* 404 - debe ir al final */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
