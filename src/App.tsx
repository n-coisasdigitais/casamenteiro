import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import FlagGate from "@/components/FlagGate";
import RequireAccountType from "@/components/RequireAccountType";
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
import SupplierProfile from "./pages/SupplierProfile";
import SupplierDashboard from "./pages/SupplierDashboard";
import FornecedorPlanos from "./pages/FornecedorPlanos";
import Pagamento from "./pages/Pagamento";
import PagamentoStatus from "./pages/PagamentoStatus";
import Comprovante from "./pages/Comprovante";
import FornecedorFaturas from "./pages/FornecedorFaturas";
import MpCallback from "./pages/MpCallback";
import MinhasReservas from "./pages/MinhasReservas";
import SupplierLanding from "./pages/SupplierLanding";
import SupplierOnboarding from "./pages/SupplierOnboarding";
import AdminPanel from "./pages/AdminPanel";
import AdminSuppliers from "./pages/AdminSuppliers";
import AdminCampos from "./pages/AdminCampos";
import AdminCategorias from "./pages/AdminCategorias";
import AdminCategoriaCampos from "./pages/AdminCategoriaCampos";
import AdminFornecedorAprovacao from "./pages/AdminFornecedorAprovacao";
import AdminCidades from "./pages/AdminCidades";
import AdminHomeConfig from "./pages/AdminHomeConfig";
import AdminFornecedorLanding from "./pages/AdminFornecedorLanding";
import AdminLandingEmails from "./pages/AdminLandingEmails";
import AdminSimulacoes from "./pages/AdminSimulacoes";
import AdminTransacoes from "./pages/AdminTransacoes";
import AdminMetrics from "./pages/AdminMetrics";
import AdminCoupleCRM from "./pages/AdminCoupleCRM";
import AdminSupplierCRM from "./pages/AdminSupplierCRM";
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminBroadcastHistory from "./pages/AdminBroadcastHistory";
import AdminBroadcastTriggers from "./pages/AdminBroadcastTriggers";
import AdminUsers from "./pages/AdminUsers";
import AdminReviews from "./pages/AdminReviews";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminEmailLogs from "./pages/AdminEmailLogs";
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
import AuthConfirmar from "./pages/AuthConfirmar";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import CategoriaPublica from "./pages/CategoriaPublica";
import CasaisFeed from "./pages/CasaisFeed";
import CasalPerfilPublico from "./pages/CasalPerfilPublico";
import MeuCasamentoPerfil from "./pages/MeuCasamentoPerfil";
import MeuCasamentoIndicacoes from "./pages/MeuCasamentoIndicacoes";
import MensagensCasais from "./pages/MensagensCasais";
import CapturarIndicacao from "./pages/CapturarIndicacao";
import AdminIndicacoes from "./pages/AdminIndicacoes";
import AdminPlatformReviews from "./pages/AdminPlatformReviews";
import DemoLanding from "./pages/DemoLanding";
import DemoBanner from "./components/DemoBanner";
import StaffLanding from "./pages/StaffLanding";
import Vagas from "./pages/Vagas";
import StaffOnboarding from "./pages/StaffOnboarding";
import StaffDashboard from "./pages/StaffDashboard";
import StaffPublicProfile from "./pages/StaffPublicProfile";
import AdminPlatformPrices from "./pages/AdminPlatformPrices";
import AdminPlanos from "./pages/AdminPlanos";
import AdminReservations from "./pages/AdminReservations";
import AdminIdleDates from "./pages/AdminIdleDates";
import AdminCommissionLedger from "./pages/AdminCommissionLedger";
import AdminWebhooks from "./pages/AdminWebhooks";
import AdminStaffJobs from "./pages/AdminStaffJobs";
import AdminProfissionais from "./pages/AdminProfissionais";

const queryClient = new QueryClient();

const Casal = ({ children }: { children: React.ReactNode }) => (
  <RequireAccountType allow={["couple", "admin"]}>{children}</RequireAccountType>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FeatureFlagsProvider>
          <AuthProvider>
            <DemoBanner />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explorar" element={<Explore />} />
              <Route path="/demo" element={<DemoLanding />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/cadastro" element={<Auth />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/confirmado" element={<EmailConfirmado />} />
              <Route path="/auth/confirmar" element={<AuthConfirmar />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route
                path="/onboarding"
                element={
                  <Casal>
                    <CoupleOnboarding />
                  </Casal>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Casal>
                    <CoupleDashboard />
                  </Casal>
                }
              />
              <Route
                path="/tarefas"
                element={
                  <Casal>
                    <WeddingTasks />
                  </Casal>
                }
              />
              <Route
                path="/meus-fornecedores"
                element={
                  <Casal>
                    <MySuppliers />
                  </Casal>
                }
              />
              <Route
                path="/convidados"
                element={
                  <Casal>
                    <WeddingGuests />
                  </Casal>
                }
              />
              <Route
                path="/orcamento"
                element={
                  <Casal>
                    <WeddingPlan />
                  </Casal>
                }
              />
              <Route
                path="/meu-casamento/plano"
                element={
                  <Casal>
                    <WeddingPlan />
                  </Casal>
                }
              />
              <Route path="/buscar" element={<Explore />} />
              <Route path="/categoria/:slug" element={<CategoriaPublica />} />
              <Route
                path="/casais"
                element={
                  <FlagGate flag="casais_feed">
                    <CasaisFeed />
                  </FlagGate>
                }
              />
              <Route
                path="/casais/:slug"
                element={
                  <FlagGate flag="casais_feed">
                    <CasalPerfilPublico />
                  </FlagGate>
                }
              />
              <Route
                path="/meu-casamento/perfil"
                element={
                  <FlagGate flag="perfil_social_casal">
                    <Casal>
                      <MeuCasamentoPerfil />
                    </Casal>
                  </FlagGate>
                }
              />
              <Route
                path="/meu-casamento/indicacoes"
                element={
                  <FlagGate flag="indicacoes">
                    <Casal>
                      <MeuCasamentoIndicacoes />
                    </Casal>
                  </FlagGate>
                }
              />
              <Route
                path="/mensagens"
                element={
                  <FlagGate flag="mensagens_casais">
                    <Casal>
                      <MensagensCasais />
                    </Casal>
                  </FlagGate>
                }
              />
              <Route
                path="/i/:codigo"
                element={
                  <FlagGate flag="indicacoes">
                    <CapturarIndicacao />
                  </FlagGate>
                }
              />
              <Route path="/fornecedor/:id" element={<SupplierProfile />} />
              <Route path="/fornecedor/painel" element={<SupplierDashboard />} />
              <Route path="/fornecedor/mp-callback" element={<MpCallback />} />
              <Route path="/fornecedor/planos" element={<FornecedorPlanos />} />
              <Route path="/pagamento" element={<Pagamento />} />
              <Route path="/pagamento/status" element={<PagamentoStatus />} />
              <Route path="/comprovante/:id" element={<Comprovante />} />
              <Route path="/fornecedor/faturas" element={<FornecedorFaturas />} />
              <Route
                path="/meu-casamento/reservas"
                element={
                  <Casal>
                    <MinhasReservas />
                  </Casal>
                }
              />
              <Route path="/fornecedor" element={<SupplierLanding />} />
              <Route path="/fornecedor/login" element={<Auth />} />
              <Route path="/fornecedor/cadastro" element={<SupplierOnboarding />} />
              <Route
                path="/profissional"
                element={
                  <FlagGate flag="vagas">
                    <StaffLanding />
                  </FlagGate>
                }
              />
              <Route
                path="/vagas"
                element={
                  <FlagGate flag="vagas">
                    <Vagas />
                  </FlagGate>
                }
              />
              <Route
                path="/profissional/login"
                element={
                  <FlagGate flag="vagas">
                    <Auth />
                  </FlagGate>
                }
              />
              <Route
                path="/profissional/cadastro"
                element={
                  <FlagGate flag="vagas">
                    <Auth />
                  </FlagGate>
                }
              />
              <Route
                path="/profissional/onboarding"
                element={
                  <FlagGate flag="vagas">
                    <StaffOnboarding />
                  </FlagGate>
                }
              />
              <Route
                path="/profissional/painel"
                element={
                  <FlagGate flag="vagas">
                    <StaffDashboard />
                  </FlagGate>
                }
              />
              <Route
                path="/profissional/:slug"
                element={
                  <FlagGate flag="vagas">
                    <StaffPublicProfile />
                  </FlagGate>
                }
              />
              <Route path="/favoritos" element={<Favorites />} />
              <Route path="/perfil" element={<UserProfile />} />
              <Route path="/convite/:token" element={<InviteRSVP />} />
              <Route path="/convite/:token/obrigado" element={<InviteObrigado />} />
              <Route
                path="/admin"
                element={
                  <AdminLayout>
                    <AdminPanel />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/fornecedores"
                element={
                  <AdminLayout>
                    <AdminSuppliers />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/aprovacao"
                element={
                  <AdminLayout>
                    <AdminFornecedorAprovacao />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/cidades"
                element={
                  <AdminLayout>
                    <AdminCidades />
                  </AdminLayout>
                }
              />
              <Route path="/admin/campos" element={<Navigate to="/admin/categorias" replace />} />
              <Route
                path="/admin/campos-legado"
                element={
                  <AdminLayout>
                    <AdminCampos />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/categorias"
                element={
                  <AdminLayout>
                    <AdminCategorias />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/categorias/:id/campos"
                element={
                  <AdminLayout>
                    <AdminCategoriaCampos />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/home-config"
                element={
                  <AdminLayout>
                    <AdminHomeConfig />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/fornecedor-landing"
                element={
                  <AdminLayout>
                    <AdminFornecedorLanding />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/fornecedor-emails"
                element={
                  <AdminLayout>
                    <AdminLandingEmails />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/simulacoes"
                element={
                  <AdminLayout>
                    <AdminSimulacoes />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/transacoes"
                element={
                  <AdminLayout>
                    <AdminTransacoes />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/metricas"
                element={
                  <AdminLayout>
                    <AdminMetrics />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/casais"
                element={
                  <AdminLayout>
                    <AdminCoupleCRM />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/casais/:id"
                element={
                  <AdminLayout>
                    <AdminCoupleCRM />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/fornecedores-crm"
                element={
                  <AdminLayout>
                    <AdminSupplierCRM />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/fornecedor/:id"
                element={
                  <AdminLayout>
                    <AdminSupplierCRM />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/comunicacao"
                element={
                  <AdminLayout>
                    <AdminBroadcast />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/gatilhos"
                element={
                  <AdminLayout>
                    <AdminBroadcastTriggers />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/comunicacao/historico"
                element={
                  <AdminLayout>
                    <AdminBroadcastHistory />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/usuarios"
                element={
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/avaliacoes"
                element={
                  <AdminLayout>
                    <AdminReviews />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/avaliacoes-plataforma"
                element={
                  <AdminLayout>
                    <AdminPlatformReviews />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/auditoria"
                element={
                  <AdminLayout>
                    <AdminAuditLog />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/emails"
                element={
                  <AdminLayout>
                    <AdminEmailLogs />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/tarefas-padrao"
                element={
                  <AdminLayout>
                    <AdminDefaultTasks />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/configuracoes"
                element={
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/financeiro"
                element={
                  <AdminLayout>
                    <AdminFinance />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/indicacoes"
                element={
                  <FlagGate flag="indicacoes">
                    <AdminLayout>
                      <AdminIndicacoes />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route
                path="/admin/tabela-precos"
                element={
                  <AdminLayout>
                    <AdminPlatformPrices />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/planos"
                element={
                  <AdminLayout>
                    <AdminPlanos />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/reservas"
                element={
                  <FlagGate flag="reserva_datas_ociosas">
                    <AdminLayout>
                      <AdminReservations />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route
                path="/admin/datas-ociosas"
                element={
                  <FlagGate flag="datas_ociosas">
                    <AdminLayout>
                      <AdminIdleDates />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route
                path="/admin/webhooks"
                element={
                  <AdminLayout>
                    <AdminWebhooks />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/corretagem"
                element={
                  <FlagGate flag="corretagem_datas_ociosas">
                    <AdminLayout>
                      <AdminCommissionLedger />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route
                path="/admin/vagas"
                element={
                  <FlagGate flag="vagas">
                    <AdminLayout>
                      <AdminStaffJobs />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route
                path="/admin/profissionais"
                element={
                  <FlagGate flag="vagas">
                    <AdminLayout>
                      <AdminProfissionais />
                    </AdminLayout>
                  </FlagGate>
                }
              />
              <Route path="/simulador/resultado" element={<SimuladorResultado />} />
              <Route path="/simulador" element={<Simulador />} />
              <Route path="/meu-plano" element={<MeuPlano />} />
              <Route path="/meu-plano/:id" element={<MeuPlano />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </FeatureFlagsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
