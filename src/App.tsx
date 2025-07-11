
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Comercio from "./pages/Comercio";
import Particular from "./pages/Particular";
import Reventa from "./pages/Reventa";
import Gulero from "./pages/Gulero";
import Mayorista from "./pages/Mayorista";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/comercio" element={<Comercio />} />
          <Route path="/particular" element={<Particular />} />
          <Route path="/reventa" element={<Reventa />} />
          <Route path="/gulero" element={<Gulero />} />
          <Route path="/mayorista" element={<Mayorista />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
