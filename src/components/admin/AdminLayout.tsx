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
import "@/components/admin/admin.css";

import {
  Heart, LogOut, LayoutDashboard, Users, Building2, MessageSquare, Send, History,
  Star, DollarSign, BarChart3, Home as HomeIcon, ListChecks, Settings, ScrollText,
  Calculator, Receipt, ChevronLeft, ClipboardCheck, SlidersHorizontal, MapPin, Zap, Mail, Share2,
  CalendarRange, Sparkles, Tag,
} from "lucide-react";

type NavItem = { title: string; url: string; icon: any; end?: boolean; extra?: string[]; badge?: "aprovacao" | "reservas" };

/** Menu em 7 grupos por tarefa (antes: 32 itens com grupos trocados). Todas as rotas continuam acessíveis. */
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      { title: "Painel", url: "/admin", icon: LayoutDashboard, end: true },
      { title: "Métricas", url: "/admin/metricas", icon: BarChart3 },
    ],
  },
  {
    label: "Fila de trabalho",
    items: [
      { title: "Aprovar fornecedores", url: "/admin/aprovacao", icon: ClipboardCheck, badge: "aprovacao" },
      { title: "Reservas de datas", url: "/admin/reservas", icon: CalendarRange, badge: "reservas" },
      { title: "Datas ociosas", url: "/admin/datas-ociosas", icon: Sparkles },
      { title: "Avaliações", url: "/admin/avaliacoes", icon: Star },
      { title: "Avaliações da plataforma", url: "/admin/avaliacoes-plataforma", icon: Star },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Fornecedores", url: "/admin/fornecedores-crm", icon: Building2, extra: ["/admin/fornecedor/"] },
      { title: "Casais", url: "/admin/casais", icon: Heart },
      { title: "Simulações dos casais", url: "/admin/simulacoes", icon: Calculator },
      { title: "Profissionais", url: "/admin/profissionais", icon: Users },
      { title: "Vagas", url: "/admin/vagas", icon: ClipboardCheck },
      { title: "Usuários", url: "/admin/usuarios", icon: Users },
      { title: "Indicações", url: "/admin/indicacoes", icon: Share2 },
    ],
  },
  {
    label: "Dinheiro",
    items: [
      { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
      { title: "Transações", url: "/admin/transacoes", icon: Receipt },
      { title: "Planos, destaques e taxas", url: "/admin/tabela-precos", icon: Tag },
      { title: "Cupons e presentes", url: "/admin/cupons", icon: Tag },
      { title: "Corretagem", url: "/admin/corretagem", icon: Tag },
      { title: "Webhooks de pagamento", url: "/admin/webhooks", icon: Receipt },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { title: "Enviar mensagem", url: "/admin/comunicacao", icon: Send, end: true },
      { title: "Gatilhos automáticos", url: "/admin/gatilhos", icon: Zap },
      { title: "Histórico de envios", url: "/admin/comunicacao/historico", icon: History },
      { title: "E-mails enviados", url: "/admin/emails", icon: Mail },
    ],
  },
  {
    label: "Conteúdo do site",
    items: [
      { title: "Home", url: "/admin/home-config", icon: HomeIcon },
      { title: "Home — destaques e imagens", url: "/admin/home-destaques", icon: HomeIcon },
      { title: "Landing do fornecedor", url: "/admin/fornecedor-landing", icon: Building2 },
      { title: "Landing do profissional", url: "/admin/profissional-landing", icon: Users },
      { title: "E-mails do CTA", url: "/admin/fornecedor-emails", icon: Mail },
      { title: "Categorias e campos", url: "/admin/categorias", icon: SlidersHorizontal },
      { title: "Cidades", url: "/admin/cidades", icon: MapPin },
      { title: "Tarefas padrão", url: "/admin/tarefas-padrao", icon: ListChecks },
      { title: "Edição em massa de fornecedores", url: "/admin/fornecedores", icon: Building2, end: true },
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

/** contadores do menu (fila de trabalho) */
function useContadoresMenu() {
  const [c, setC] = useState<{ aprovacao: number; reservas: number }>({ aprovacao: 0, reservas: 0 });
  const { pathname } = useLocation();
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ count: aprov }, { count: res }] = await Promise.all([
        (supabase.from("suppliers") as any).select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_demo", isDemoSession()),
        (supabase.from("idle_date_reservations" as any) as any).select("id", { count: "exact", head: true }).in("status", ["solicitada", "pendente"]),
      ]);
      if (vivo) setC({ aprovacao: aprov || 0, reservas: res || 0 });
    })();
    return () => {
      vivo = false;
    };
  }, [pathname]);
  return c;
}


function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const contadores = useContadoresMenu();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/admin" onClick={closeMobile} className="flex items-center gap-2 px-2 py-1.5">
          {collapsed ? (
            <span className="text-[18px] font-extrabold" style={{ color: "var(--ad-terracota)" }}>c.</span>
          ) : (
            <span className="whitespace-nowrap text-[18px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--ad-ink)" }}>
              casamenteiro<span style={{ color: "var(--ad-terracota)" }}>.</span>
              <small className="ml-1.5 rounded-full px-1.5 py-0.5 align-[2px] text-[10px] font-extrabold uppercase" style={{ letterSpacing: ".08em", color: "var(--ad-clay)", background: "#fdf0e6" }}>
                admin
              </small>
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = item.end
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith(item.url + "/") || (item.extra || []).some((e) => pathname.startsWith(e));
                  const n = item.badge ? contadores[item.badge] : 0;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink to={item.url} end={item.end} onClick={closeMobile} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                          {!collapsed && n > 0 && (
                            <span className={`ad-n ${item.badge === "aprovacao" ? "ad-warn" : "ad-info"}`}>{n}</span>
                          )}
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