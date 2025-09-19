
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout components
import Layout from "./components/Layout";

// Pages
import Index from "./pages/Index";
import SotoAuth from "./pages/SotoAuth";
import Fichero from "./pages/Fichero";
import Ranking from "./pages/Ranking";
import Desafios from "./pages/Desafios";
import Insignias from "./pages/Insignias";
import Premios from "./pages/Premios";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MedalManagement from "./pages/MedalManagement";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Ruta principal como estaba antes */}
          <Route path="/" element={<Index />} />
          
          {/* Sistema Soto Reconoce - Páginas públicas */}
          <Route path="/reconoce" element={<HomePublico />} />
          <Route path="/reconoce/home" element={<HomePublico />} />
          <Route path="/reconoce/ranking" element={<Ranking />} />
          <Route path="/reconoce/desafios" element={<Desafios />} />
          <Route path="/reconoce/insignias" element={<Insignias />} />
          <Route path="/reconoce/premios" element={<Premios />} />
          <Route path="/reconoce/dashboard" element={<Dashboard />} />
          <Route path="/reconoce/medals" element={<MedalManagement />} />
          
          {/* Sistema Soto Reconoce - Páginas que requieren autenticación */}
          <Route path="/reconoce/auth" element={<SotoAuth />} />
          <Route path="/reconoce/admin" element={<Layout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
          
          {/* Rutas directas de admin (redirigir al dashboard con tabs) */}
          <Route path="/reconoce/capacitaciones" element={<Navigate to="/reconoce/admin?tab=training" replace />} />

          {/* Legacy routes (mantener por compatibilidad) */}
          <Route path="/comercio" element={<Comercio />} />
          <Route path="/particular" element={<Particular />} />
          <Route path="/reventa" element={<Reventa />} />
          <Route path="/gulero" element={<Gulero />} />
          <Route path="/mayorista" element={<Mayorista />} />
          <Route path="/centum" element={<Centum />} />
          <Route path="/gondolas" element={<Gondolas />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/gondolasedit" element={<GondolasEdit />} />
          
          {/* 404 - debe ir al final */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
