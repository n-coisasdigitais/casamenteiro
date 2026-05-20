import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import {
  Heart, LogOut, LayoutDashboard, Users, Building2, MessageSquare, Send, History,
  Star, DollarSign, BarChart3, Home as HomeIcon, ListChecks, Settings, ScrollText,
  Calculator, Receipt, ChevronLeft, ClipboardCheck, SlidersHorizontal, MapPin, Zap,
} from "lucide-react";

const groups = [
  {
    label: "Visão geral",
    items: [
      { title: "Painel", url: "/admin", icon: LayoutDashboard, end: true },
      { title: "Métricas", url: "/admin/metricas", icon: BarChart3 },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Usuários", url: "/admin/usuarios", icon: Users },
      { title: "CRM Casais", url: "/admin/casais", icon: Heart },
      { title: "CRM Fornecedores", url: "/admin/fornecedores-crm", icon: Building2 },
      { title: "Avaliações", url: "/admin/avaliacoes", icon: Star },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { title: "Enviar broadcast", url: "/admin/comunicacao", icon: Send },
      { title: "Gatilhos automáticos", url: "/admin/gatilhos", icon: Zap },
      { title: "Histórico", url: "/admin/comunicacao/historico", icon: History },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
      { title: "Transações", url: "/admin/transacoes", icon: Receipt },
      { title: "Simulações", url: "/admin/simulacoes", icon: Calculator },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Home", url: "/admin/home-config", icon: HomeIcon },
      { title: "Landing Fornecedor", url: "/admin/fornecedor-landing", icon: Building2 },
      { title: "Tarefas padrão", url: "/admin/tarefas-padrao", icon: ListChecks },
      { title: "Edição em massa", url: "/admin/fornecedores", icon: Building2 },
      { title: "Aprovar fornecedores", url: "/admin/aprovacao", icon: ClipboardCheck },
      { title: "Categorias", url: "/admin/categorias", icon: SlidersHorizontal },
      { title: "Cidades", url: "/admin/cidades", icon: MapPin },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
      { title: "Auditoria", url: "/admin/auditoria", icon: ScrollText },
    ],
  },
];

function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/admin" onClick={closeMobile} className="flex items-center gap-2 px-2 py-1.5">
          <Heart className="h-5 w-5 text-primary fill-primary shrink-0" />
          {!collapsed && <span className="text-base font-semibold">Admin</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = item.end ? pathname === item.url : pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink to={item.url} end={item.end} onClick={closeMobile} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Voltar ao site">
              <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                {!collapsed && <span>Voltar ao site</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setIsAdmin(true);
      setChecked(true);
    });
  }, [user, authLoading, navigate]);

  if (authLoading || !checked) {
    return <div className="min-h-screen flex items-center justify-center"><p>Verificando permissões...</p></div>;
  }
  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <SEO title="Admin — Casamenteiro" noIndex />
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <header className="h-14 flex items-center gap-2 border-b bg-card px-3 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0" />
            <span className="text-sm font-medium text-muted-foreground truncate">Painel administrativo</span>
          </header>
          <main className="flex-1 min-w-0 w-full overflow-x-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}