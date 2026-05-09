import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Auth from "./pages/Auth";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import CoupleOnboarding from "./pages/CoupleOnboarding";
import CoupleDashboard from "./pages/CoupleDashboard";
import WeddingTasks from "./pages/WeddingTasks";
import MySuppliers from "./pages/MySuppliers";
import WeddingGuests from "./pages/WeddingGuests";
import WeddingPlan from "./pages/WeddingPlan";
import SupplierSearch from "./pages/SupplierSearch";
import SupplierProfile from "./pages/SupplierProfile";
import SupplierDashboard from "./pages/SupplierDashboard";
import SupplierLanding from "./pages/SupplierLanding";
import SupplierSignupComingSoon from "./pages/SupplierSignupComingSoon";
import AdminPanel from "./pages/AdminPanel";
import AdminSuppliers from "./pages/AdminSuppliers";
import AdminHomeConfig from "./pages/AdminHomeConfig";
import AdminSimulacoes from "./pages/AdminSimulacoes";
import AdminTransacoes from "./pages/AdminTransacoes";
import AdminMetrics from "./pages/AdminMetrics";
import AdminCoupleCRM from "./pages/AdminCoupleCRM";
import AdminSupplierCRM from "./pages/AdminSupplierCRM";
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminBroadcastHistory from "./pages/AdminBroadcastHistory";
import AdminUsers from "./pages/AdminUsers";
import AdminReviews from "./pages/AdminReviews";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminDefaultTasks from "./pages/AdminDefaultTasks";
import AdminSettings from "./pages/AdminSettings";
import AdminFinance from "./pages/AdminFinance";
import SimuladorResultado from "./pages/SimuladorResultado";
import Simulador from "./pages/Simulador";
import MeuPlano from "./pages/MeuPlano";
import Favorites from "./pages/Favorites";
import UserProfile from "./pages/UserProfile";
import InviteRSVP from "./pages/InviteRSVP";
import InviteObrigado from "./pages/InviteObrigado";
import EmailConfirmado from "./pages/EmailConfirmado";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explorar" element={<Explore />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/cadastro" element={<Auth />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/confirmado" element={<EmailConfirmado />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/onboarding" element={<CoupleOnboarding />} />
            <Route path="/dashboard" element={<CoupleDashboard />} />
            <Route path="/tarefas" element={<WeddingTasks />} />
            <Route path="/meus-fornecedores" element={<MySuppliers />} />
            <Route path="/convidados" element={<WeddingGuests />} />
            <Route path="/orcamento" element={<WeddingPlan />} />
            <Route path="/meu-casamento/plano" element={<WeddingPlan />} />
            <Route path="/buscar" element={<SupplierSearch />} />
            <Route path="/fornecedor/:id" element={<SupplierProfile />} />
            <Route path="/fornecedor/painel" element={<SupplierDashboard />} />
            <Route path="/fornecedor" element={<SupplierLanding />} />
            <Route path="/fornecedor/login" element={<Auth />} />
            <Route path="/fornecedor/cadastro" element={<SupplierSignupComingSoon />} />
            <Route path="/favoritos" element={<Favorites />} />
            <Route path="/perfil" element={<UserProfile />} />
            <Route path="/convite/:token" element={<InviteRSVP />} />
            <Route path="/convite/:token/obrigado" element={<InviteObrigado />} />
            <Route path="/admin" element={<AdminLayout><AdminPanel /></AdminLayout>} />
            <Route path="/admin/fornecedores" element={<AdminLayout><AdminSuppliers /></AdminLayout>} />
            <Route path="/admin/home-config" element={<AdminLayout><AdminHomeConfig /></AdminLayout>} />
            <Route path="/admin/simulacoes" element={<AdminLayout><AdminSimulacoes /></AdminLayout>} />
            <Route path="/admin/transacoes" element={<AdminLayout><AdminTransacoes /></AdminLayout>} />
            <Route path="/admin/metricas" element={<AdminLayout><AdminMetrics /></AdminLayout>} />
            <Route path="/admin/casais" element={<AdminLayout><AdminCoupleCRM /></AdminLayout>} />
            <Route path="/admin/casais/:id" element={<AdminLayout><AdminCoupleCRM /></AdminLayout>} />
            <Route path="/admin/fornecedores-crm" element={<AdminLayout><AdminSupplierCRM /></AdminLayout>} />
            <Route path="/admin/fornecedor/:id" element={<AdminLayout><AdminSupplierCRM /></AdminLayout>} />
            <Route path="/admin/comunicacao" element={<AdminLayout><AdminBroadcast /></AdminLayout>} />
            <Route path="/admin/comunicacao/historico" element={<AdminLayout><AdminBroadcastHistory /></AdminLayout>} />
            <Route path="/admin/usuarios" element={<AdminLayout><AdminUsers /></AdminLayout>} />
            <Route path="/admin/avaliacoes" element={<AdminLayout><AdminReviews /></AdminLayout>} />
            <Route path="/admin/auditoria" element={<AdminLayout><AdminAuditLog /></AdminLayout>} />
            <Route path="/admin/tarefas-padrao" element={<AdminLayout><AdminDefaultTasks /></AdminLayout>} />
            <Route path="/admin/configuracoes" element={<AdminLayout><AdminSettings /></AdminLayout>} />
            <Route path="/admin/financeiro" element={<AdminLayout><AdminFinance /></AdminLayout>} />
            <Route path="/simulador/resultado" element={<SimuladorResultado />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/meu-plano" element={<MeuPlano />} />
            <Route path="/meu-plano/:id" element={<MeuPlano />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
