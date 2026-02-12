import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CoupleOnboarding from "./pages/CoupleOnboarding";
import CoupleDashboard from "./pages/CoupleDashboard";
import WeddingTasks from "./pages/WeddingTasks";
import SupplierSearch from "./pages/SupplierSearch";
import SupplierProfile from "./pages/SupplierProfile";
import SupplierDashboard from "./pages/SupplierDashboard";
import AdminPanel from "./pages/AdminPanel";
import Favorites from "./pages/Favorites";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/cadastro" element={<Auth />} />
            <Route path="/onboarding" element={<CoupleOnboarding />} />
            <Route path="/dashboard" element={<CoupleDashboard />} />
            <Route path="/tarefas" element={<WeddingTasks />} />
            <Route path="/meus-fornecedores" element={<Favorites />} />
            <Route path="/convidados" element={<NotFound />} />
            <Route path="/orcamento" element={<NotFound />} />
            <Route path="/buscar" element={<SupplierSearch />} />
            <Route path="/fornecedor/:id" element={<SupplierProfile />} />
            <Route path="/fornecedor/painel" element={<SupplierDashboard />} />
            <Route path="/favoritos" element={<Favorites />} />
            <Route path="/perfil" element={<UserProfile />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
