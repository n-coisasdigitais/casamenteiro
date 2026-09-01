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
import UserMenu from "@/components/UserMenu";
import { isDemoSession, setAdminDemoScope } from "@/lib/demoScope";

import {
  Heart, LogOut, LayoutDashboard, Users, Building2, MessageSquare, Send, History,
  Star, DollarSign, BarChart3, Home as HomeIcon, ListChecks, Settings, ScrollText,
  Calculator, Receipt, ChevronLeft, ClipboardCheck, SlidersHorizontal, MapPin, Zap, Mail, Share2,
  CalendarRange, Sparkles, Tag,
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
      { title: "Avaliações da plataforma", url: "/admin/avaliacoes-plataforma", icon: Star },
      { title: "Indicações", url: "/admin/indicacoes", icon: Share2 },
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
      { title: "Tabela de preços", url: "/admin/tabela-precos", icon: Tag },
      { title: "Planos e destaques", url: "/admin/planos", icon: Sparkles },
      { title: "Cupons e presentes", url: "/admin/cupons", icon: Tag },
      { title: "Reservas", url: "/admin/reservas", icon: CalendarRange },
      { title: "Datas ociosas", url: "/admin/datas-ociosas", icon: Sparkles },
      { title: "Corretagem", url: "/admin/corretagem", icon: Tag },
      { title: "Webhooks", url: "/admin/webhooks", icon: Receipt },
      { title: "Vagas", url: "/admin/vagas", icon: ClipboardCheck },
      { title: "Profissionais", url: "/admin/profissionais", icon: ClipboardCheck },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Home", url: "/admin/home-config", icon: HomeIcon },
      { title: "Landing Fornecedor", url: "/admin/fornecedor-landing", icon: Building2 },
      { title: "E-mails do CTA", url: "/admin/fornecedor-emails", icon: Mail },
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
      { title: "Envios de e-mail", url: "/admin/emails", icon: Mail },
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
  const [demoScope, setDemoScope] = useState(() => isDemoSession());

  const changeScope = (demo: boolean) => {
    setAdminDemoScope(demo);
    setDemoScope(demo);
    window.location.reload();
  };

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
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center rounded-md border p-0.5" aria-label="Ambiente de dados">
                <Button type="button" size="sm" variant={!demoScope ? "default" : "ghost"} className="h-7 px-2" onClick={() => changeScope(false)}>
                  Dados reais
                </Button>
                <Button type="button" size="sm" variant={demoScope ? "default" : "ghost"} className="h-7 px-2" onClick={() => changeScope(true)}>
                  Dados demo
                </Button>
              </div>
              <UserMenu />
            </div>
          </header>

          <main className="flex-1 min-w-0 w-full overflow-x-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}