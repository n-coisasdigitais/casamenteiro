import { registrarMinhaIndicacaoSeHouver } from "@/lib/beneficios";
import LogoUploader from "@/components/supplier/LogoUploader";
import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SUPPLIER_COLS } from "@/lib/suppliers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeModal from "@/components/WelcomeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Heart,
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  CalendarDays,
  MapPin,
  Star,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteConversation from "@/components/QuoteConversation";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import PromoDatesManager from "@/components/PromoDatesManager";
import CalendarConnections from "@/components/CalendarConnections";
import NotificationsBell from "@/components/NotificationsBell";
import SupplierMetrics from "@/components/supplier/SupplierMetrics";
import SupplierOnboardingWizard from "@/components/supplier/SupplierOnboardingWizard";
import SupplierAreaEditor from "@/components/supplier/SupplierAreaEditor";
import SupplierQuotesKanban from "@/components/supplier/SupplierQuotesKanban";
import SupplierReviewCouples from "@/components/supplier/SupplierReviewCouples";
import StaffReviewsReceived from "@/components/staff/StaffReviewsReceived";
import DynamicFieldsForm from "@/components/dynamic-fields/DynamicFieldsForm";
import RedesSociaisEditor from "@/components/redes/RedesSociaisEditor";
import PerguntasFrequentesEditor from "@/components/supplier/PerguntasFrequentesEditor";
import { AjustesPedidosBanner, CadastroRecusadoBanner } from "@/components/supplier/AjustesPedidosBanner";
import UserMenu from "@/components/UserMenu";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import SupplierFilesTab from "@/components/supplier/SupplierFilesTab";
import { isEspacoCategory } from "@/lib/categories";
import SupplierStaffTab from "@/components/staff/SupplierStaffTab";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import SupplierReservationsTab from "@/components/reservas/SupplierReservationsTab";
import SupplierSidebar, {
  getSupplierDestinations,
  type SupplierDestination,
} from "@/components/supplier/SupplierSidebar";
import SupplierMobileTabBar from "@/components/supplier/SupplierMobileTabBar";
import SupplierActionCards from "@/components/supplier/SupplierActionCards";
import SupplierLeadsCRM from "@/components/supplier/SupplierLeadsCRM";
import PlanGate, { TrialBanner } from "@/components/plan/PlanGate";
import MinhaAssinaturaCard from "@/components/plan/MinhaAssinaturaCard";
import AjudaTab from "@/components/AjudaTab";
import MercadoPagoConnectCard from "@/components/supplier/MercadoPagoConnectCard";
import { AgendaMes, PerfilCompleto, type PassoPerfil } from "@/components/supplier/PainelExtras";
import { useSupplierPlan } from "@/hooks/usePlanFeature";
import "@/components/supplier/painel-v2.css";

type Category = { id: string; name: string; slug?: string | null };

type BusinessSub = "perfil" | "fotos" | "arquivos" | "disponibilidade" | "atendimento" | "reservas";

const LEGACY_TAB_TO_DEST: Record<string, { dest: SupplierDestination; sub?: BusinessSub }> = {
  metrics: { dest: "painel" },
  quotes: { dest: "orcamentos" },
  reviews: { dest: "avaliacoes" },
  vagas: { dest: "vagas" },
  profile: { dest: "negocio", sub: "perfil" },
  photos: { dest: "negocio", sub: "fotos" },
  files: { dest: "negocio", sub: "arquivos" },
  availability: { dest: "negocio", sub: "disponibilidade" },
  area: { dest: "negocio", sub: "atendimento" },
  reservas: { dest: "negocio", sub: "reservas" },
};

export default function SupplierDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState<string | null>(null);
  const [dest, setDest] = useState<SupplierDestination>("painel");
  const [businessSub, setBusinessSub] = useState<BusinessSub>("perfil");
  const [quotesInnerTab, setQuotesInnerTab] = useState<"kanban" | "leads">("kanban");
  const [quotesFilter, setQuotesFilter] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null);
  const [reservasPendentes, setReservasPendentes] = useState(0);
  const [prioridades, setPrioridades] = useState<number | null>(null);
  const vagasEnabled = useFeatureFlag("vagas", false);
  const reservasEnabled = useFeatureFlag("reserva_datas_ociosas", false);
  const agendaEnabled = useFeatureFlag("agenda_integracao", false);
  const crmEnabled = useFeatureFlag("crm_fornecedor", true);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [outrosDescricao, setOutrosDescricao] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("categories")
      .select("*")
      .then(({ data }) => setCategories(data || []));
    loadSupplier();
  }, [user]);

  useEffect(() => {
    if (supplier) loadQuotes();
  }, [supplier]);

  // Solicitações de reserva aguardando resposta do fornecedor
  useEffect(() => {
    if (!supplier || !reservasEnabled) return;
    (
      supabase
        .from("idle_date_reservations" as any)
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id)
        .eq("status", "solicitada") as any
    ).then(({ count }: any) => setReservasPendentes(count ?? 0));
  }, [supplier, reservasEnabled]);

  // Sincroniza destino com URL (?tab=), aceitando chaves legadas
  useEffect(() => {
    if (!supplier) return;
    const tab = searchParams.get("tab");
    const sub = searchParams.get("sub") as BusinessSub | null;
    const filter = searchParams.get("filter");
    if (tab && LEGACY_TAB_TO_DEST[tab]) {
      const map = LEGACY_TAB_TO_DEST[tab];
      setDest(map.dest);
      if (map.sub) setBusinessSub(map.sub);
    } else if (tab && ["painel", "orcamentos", "negocio", "vagas", "avaliacoes"].includes(tab)) {
      setDest(tab as SupplierDestination);
    } else {
      setDest(supplier.onboarding_completed ? "painel" : "orcamentos");
    }
    if (sub) setBusinessSub(sub);
    if (filter) {
      setQuotesFilter(filter);
      setQuotesInnerTab("kanban");
    }
  }, [supplier, searchParams]);

  // No celular as abas rolam de lado: traz a aba ativa para a área visível.
  useEffect(() => {
    const t = setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>('.painel-v2 [role="tablist"] [role="tab"][data-state="active"]')
        .forEach((el) => el.scrollIntoView({ block: "nearest", inline: "center" }));
    }, 120);
    return () => clearTimeout(t);
  }, [dest, businessSub, quotesInnerTab]);

  // Indicação de fornecedor: registra a atribuição uma única vez, quando o indicado entra no painel.
  useEffect(() => {
    if (!supplier) return;
    registrarMinhaIndicacaoSeHouver();
  }, [supplier]);

  // Retorno do OAuth do Mercado Pago (?mp=conectado|erro)
  useEffect(() => {
    const mp = searchParams.get("mp");
    if (!mp) return;
    if (mp === "conectado") {
      toast({ title: "Mercado Pago conectado com sucesso!" });
    } else {
      toast({
        title: "Não foi possível conectar o Mercado Pago",
        description: searchParams.get("motivo") || undefined,
        variant: "destructive",
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("mp");
    next.delete("motivo");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  // Abre automaticamente um quote vindo de notificação (?quote=)
  useEffect(() => {
    const qid = searchParams.get("quote");
    if (!qid || quotes.length === 0) return;
    const q = quotes.find((x) => x.id === qid);
    if (q && (!selectedQuote || selectedQuote.id !== qid)) {
      openThread(q);
      // marca notificações relacionadas como lidas
      if (user) {
        supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .like("link", `%quote=${qid}%`)
          .then(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, searchParams]);

  const goDest = (
    d: SupplierDestination,
    extra?: { sub?: BusinessSub; filter?: string | null; inner?: "kanban" | "leads" },
  ) => {
    setDest(d);
    if (extra?.sub) setBusinessSub(extra.sub);
    if (extra?.filter !== undefined) setQuotesFilter(extra.filter);
    if (extra?.inner) setQuotesInnerTab(extra.inner);
    const next = new URLSearchParams(searchParams);
    next.set("tab", d);
    if (d === "negocio") next.set("sub", extra?.sub || businessSub);
    else next.delete("sub");
    if (extra?.filter) next.set("filter", extra.filter);
    else next.delete("filter");
    next.delete("quote");
    setSearchParams(next, { replace: true });
  };

  // Carrega estado de dispensar banner
  useEffect(() => {
    if (!supplier) return;
    const key = `supplier-banner-dismissed:${supplier.id}:${supplier.status}`;
    setBannerDismissed(localStorage.getItem(key));
  }, [supplier]);

  const dismissBanner = () => {
    if (!supplier) return;
    const key = `supplier-banner-dismissed:${supplier.id}:${supplier.status}`;
    localStorage.setItem(key, "1");
    setBannerDismissed("1");
  };

  const loadSupplier = async () => {
    if (!user) return;
    const { data } = await supabase.from("suppliers").select(SUPPLIER_COLS).eq("user_id", user.id).maybeSingle();
    if (data) {
      setSupplier(data);
      setCompanyName(data.company_name || "");
      setDescription(data.description || "");
      setCategoryId(data.category_id || "");
      setOutrosDescricao((data as any).categoria_outros_descricao || "");
      setCity(data.city || "");
      setState(data.state || "");
      const { data: contato } = await supabase.rpc("get_supplier_contact", { _supplier_id: data.id });
      const c = (contato as any[])?.[0];
      setPhone(formatPhoneBR(c?.whatsapp || c?.phone || ""));
      setEmail(c?.email || "");
      const { data: photoData } = await supabase
        .from("supplier_photos")
        .select("*")
        .eq("supplier_id", data.id)
        .order("is_principal", { ascending: false })
        .order("display_order");
      setPhotos(photoData || []);
      if (data.status === "rejected") {
        const { data: ap } = await supabase
          .from("fornecedor_aprovacoes")
          .select("motivo,created_at")
          .eq("supplier_id", data.id)
          .eq("acao", "rejected")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setRejectMotivo(ap?.motivo || null);
      } else {
        setRejectMotivo(null);
      }
    }
  };

  const loadQuotes = async () => {
    if (!supplier) return;
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false });
    setQuotes(data || []);
  };

  const openThread = (quote: any) => {
    setSelectedQuote(quote);
    setThreadOpen(true);
    // Auto-mark as viewed
    if (quote.status === "pending") {
      supabase
        .from("quotes")
        .update({ status: "viewed" })
        .eq("id", quote.id)
        .then(() => loadQuotes());
    }
  };

  const handleSave = async () => {
    if (!supplier) return;
    const ehOutros = categories.find((c) => c.id === categoryId)?.slug === "outros";
    if (ehOutros && outrosDescricao.trim().length < 3) {
      toast({ title: "Descreva seu serviço", description: "Conte qual é o serviço que você oferece.", variant: "destructive" });
      return;
    }
    if (phone && !isValidPhoneBR(phone)) {
      toast({
        title: "WhatsApp inválido",
        description: "Use DDD + número (ex.: (11) 91234-5678).",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const phoneDigits = phone.replace(/\D/g, "") || null;
    const { error } = await supabase
      .from("suppliers")
      .update({
        company_name: companyName,
        description,
        category_id: categoryId || null,
        categoria_outros_descricao: categories.find((c) => c.id === categoryId)?.slug === "outros" ? outrosDescricao.trim() : null,
        city: city || null,
        state: state || null,
        phone: phoneDigits,
        whatsapp: phoneDigits,
        email: email || null,
      })
      .eq("id", supplier.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: traduzirErro(error), variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !supplier || photos.length >= 10) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("supplier-photos").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: traduzirErro(uploadError), variant: "destructive" });
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("supplier-photos").getPublicUrl(filePath);
    await supabase.from("supplier_photos").insert({
      supplier_id: supplier.id,
      photo_url: publicUrl,
      display_order: photos.length,
    });
    await loadSupplier();
    setUploading(false);
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from("supplier_photos").delete().eq("id", photoId);
    setPhotos(photos.filter((p) => p.id !== photoId));
  };

  const marcarPrincipal = async (photoId: string) => {
    const atual = photos.find((p) => p.id === photoId);
    const novoValor = !atual?.is_principal;
    // zera todas e, se estiver marcando, marca só esta (índice único garante 1)
    await supabase
      .from("supplier_photos")
      .update({ is_principal: false } as any)
      .eq("supplier_id", supplier.id);
    if (novoValor) {
      const { data, error } = await supabase
        .from("supplier_photos")
        .update({ is_principal: true } as any)
        .eq("id", photoId)
        .select("id");
      if (error) {
        toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        toast({
          title: "Não foi possível salvar",
          description: "Sem permissão para atualizar a foto. Verifique as regras de acesso.",
          variant: "destructive",
        });
        return;
      }
    }
    setPhotos(photos.map((p) => ({ ...p, is_principal: novoValor && p.id === photoId })));
    toast({
      title: novoValor ? "Foto de destaque definida" : "Destaque removido",
      description: novoValor
        ? "Ela será a capa do seu perfil e dos cards."
        : "Nenhuma foto está marcada como destaque.",
    });
  };

  const statusConfig = {
    pending: { label: "Pendente de Aprovação", icon: Clock, variant: "secondary" as const },
    approved: { label: "Aprovado", icon: CheckCircle, variant: "default" as const },
    rejected: { label: "Ajustes pedidos", icon: AlertCircle, variant: "secondary" as const },
    blocked: { label: "Recusado", icon: AlertCircle, variant: "destructive" as const },
  };

  const statusInfo = supplier ? statusConfig[supplier.status as keyof typeof statusConfig] : null;

  if (!supplier)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );

  const overdueLeadsCount = quotesFilter === "__" ? 0 : 0; // placeholder; ActionCards controla o próprio alerta
  const destinations = getSupplierDestinations({
    quotesCount: quotes.length,
    overdueLeads: 0,
    vagasEnabled,
    reservasEnabled,
    reservasPendentes,
  });
  const cat = categories.find((c) => c.id === supplier.category_id);
  const isEspaco = isEspacoCategory(cat?.slug ?? null, cat?.name ?? null);

  const filteredQuotes = (() => {
    if (!quotesFilter) return quotes;
    // filtro simples: "aguardando" = kanban_status enviado/visto; "sem_retorno" = respondido/negociando
    if (quotesFilter === "aguardando")
      return quotes.filter((q) => ["enviado", "visto"].includes(q.kanban_status || "enviado"));
    if (quotesFilter === "sem_retorno")
      return quotes.filter((q) => ["respondido", "negociando"].includes(q.kanban_status || ""));
    return quotes;
  })();

  const descricaoOk = (supplier.description || "").trim().length >= 80;
  const passosPerfil: PassoPerfil[] = [
    { key: "fotos", label: photos.length >= 5 ? "Fotos do portfólio" : `Adicionar fotos (${photos.length}/5)`, feito: photos.length >= 5, onClick: () => goDest("negocio", { sub: "fotos" }) },
    { key: "capa", label: "Foto de destaque", feito: photos.some((p) => p.is_principal) || !!supplier.cover_photo_url, onClick: () => goDest("negocio", { sub: "fotos" }) },
    { key: "descricao", label: descricaoOk ? "Descrição dos serviços" : "Escrever a descrição dos serviços", feito: descricaoOk, onClick: () => goDest("negocio", { sub: "perfil" }) },
    { key: "contato", label: phone ? "WhatsApp de contato" : "Informar WhatsApp de contato", feito: !!phone && isValidPhoneBR(phone), onClick: () => goDest("negocio", { sub: "perfil" }) },
    { key: "area", label: "Cidades que você atende", feito: (supplier.cidades_atendidas?.length ?? 0) > 0 || !!supplier.raio_atendimento_km, onClick: () => goDest("negocio", { sub: "atendimento" }) },
  ];
  const titulos: Record<SupplierDestination, string> = {
    painel: "",
    orcamentos: "Orçamentos",
    negocio: "Meu negócio",
    reservas: "Reservas",
    vagas: "Equipe e vagas",
    avaliacoes: "Avaliações",
    ajuda: "Ajuda",
  };
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const iniciais = (supplier.company_name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  const renderContent = () => {
    if (dest === "painel") {
      return (
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-5">
            <SupplierActionCards
              supplierId={supplier.id}
              supplierUserId={user?.id ?? ""}
              onGoToQuotes={(filter) => goDest("orcamentos", { filter: filter || null, inner: "kanban" })}
              reservasPendentes={reservasEnabled ? reservasPendentes : 0}
              onGoToReservas={reservasEnabled ? () => goDest("reservas") : undefined}
              onTotal={setPrioridades}
            />
            <PerfilCompleto passos={passosPerfil} />
          </div>
          <SupplierMetrics supplierId={supplier.id} />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <AgendaMes supplierId={supplier.id} onGerenciar={() => goDest("negocio", { sub: "disponibilidade" })} />
            <div className="flex min-w-0 flex-col gap-4">
              <MinhaAssinaturaCard supplierId={supplier.id} />
              <MercadoPagoConnectCard supplierId={supplier.id} />
            </div>
          </div>
        </div>
      );
    }
    if (dest === "orcamentos") {
      return (
        <div className="space-y-4">
          {crmEnabled && (
            <Tabs value={quotesInnerTab} onValueChange={(v) => setQuotesInnerTab(v as any)}>
              <TabsList>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="leads">Leads (CRM)</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {quotesFilter && quotesInnerTab === "kanban" && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary">
                Filtro: {quotesFilter === "aguardando" ? "aguardando resposta" : "sem retorno do casal"}
              </Badge>
              <button
                className="underline text-muted-foreground"
                onClick={() => goDest("orcamentos", { filter: null })}
              >
                limpar
              </button>
            </div>
          )}
          {quotesInnerTab === "leads" && crmEnabled ? (
            <PlanGate
              supplierId={supplier.id}
              feature="crm_leads"
              titulo="CRM de leads"
              descricao="Veja quem te procurou, com histórico e anotações. Disponível nos planos pagos."
            >
              <SupplierLeadsCRM
                supplierId={supplier.id}
                supplierUserId={user!.id}
                companyName={supplier.company_name}
                onOpenQuote={openThread}
              />
            </PlanGate>
          ) : filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhum pedido de orçamento {quotesFilter ? "para esse filtro" : "recebido ainda"}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <SupplierQuotesKanban quotes={filteredQuotes} onOpen={openThread} onChange={loadQuotes} />
          )}
        </div>
      );
    }
    if (dest === "avaliacoes") {
      return (
        <div className="space-y-6">
          <SupplierReviewCouples supplierId={supplier.id} />
          {vagasEnabled && <StaffReviewsReceived supplierId={supplier.id} />}
        </div>
      );
    }
    if (dest === "vagas" && vagasEnabled) {
      return (
        <PlanGate
          supplierId={supplier.id}
          feature="vagas_equipe"
          titulo="Equipe e vagas"
          descricao="Publique vagas e convide garçons, cozinha, bar e limpeza para os seus eventos. Disponível nos planos pagos."
          minHeight={320}
        >
          <SupplierStaffTab supplierId={supplier.id} companyName={supplier.company_name} />
        </PlanGate>
      );
    }
    if (dest === "ajuda") {
      return <AjudaTab origem="fornecedor" />;
    }
    if (dest === "reservas" && reservasEnabled) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Reservas de datas ociosas</h2>
            <p className="text-sm text-muted-foreground">
              Solicitações de casais para datas com desconto que você ofereceu.
            </p>
          </div>
          <SupplierReservationsTab supplierId={supplier.id} />
        </div>
      );
    }
    if (dest === "negocio") {
      const businessTabs: { key: BusinessSub; label: string }[] = [
        { key: "perfil", label: "Meu Perfil" },
        { key: "fotos", label: "Fotos" },
        { key: "arquivos", label: "Arquivos" },
        { key: "disponibilidade", label: "Disponibilidade" },
        { key: "atendimento", label: "Atendimento" },
        ...(reservasEnabled ? [{ key: "reservas" as BusinessSub, label: "Reservas" }] : []),
      ];
      return (
        <div className="space-y-4">
          <Tabs
            value={businessSub}
            onValueChange={(v) => {
              setBusinessSub(v as BusinessSub);
              const next = new URLSearchParams(searchParams);
              next.set("tab", "negocio");
              next.set("sub", v);
              setSearchParams(next, { replace: true });
            }}
          >
            <TabsList className="flex-wrap">
              {businessTabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {businessSub === "perfil" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome da empresa</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Descrição dos serviços</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {categories.find((c) => c.id === categoryId)?.slug === "outros" && (
                    <div>
                      <Label>Qual é o seu serviço? *</Label>
                      <Input value={outrosDescricao} maxLength={120} onChange={(e) => setOutrosDescricao(e.target.value)}
                        placeholder="Ex.: Aluguel de mobiliário" />
                    </div>
                  )}
                  {user && (
                    <LogoUploader userId={user.id} supplierId={supplier.id} nome={companyName}
                      atual={supplier.logo_url} onSalvo={(url) => setSupplier((s: any) => ({ ...s, logo_url: url }))} />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cidade</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>WhatsApp (com DDD)</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                      placeholder="(11) 91234-5678"
                      inputMode="numeric"
                    />
                    {phone && !isValidPhoneBR(phone) && (
                      <p className="text-xs text-destructive mt-1">Telefone inválido. Use DDD + número.</p>
                    )}
                  </div>
                  <div>
                    <Label>E-mail de contato</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button onClick={handleSave} disabled={loading} className="w-full">
                    {loading ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes da categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicFieldsForm supplierId={supplier.id} categoryId={categoryId || null} />
                </CardContent>
              </Card>
              <RedesSociaisEditor supplierId={supplier.id} />
              <PerguntasFrequentesEditor supplierId={supplier.id} />
            </>
          )}

          {businessSub === "fotos" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfólio ({photos.length}/10 fotos)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                      <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                      {photo.is_principal && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3 fill-current" /> Destaque
                        </span>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => marcarPrincipal(photo.id)}
                          title={photo.is_principal ? "Remover destaque" : "Definir como destaque"}
                          className={`rounded-full p-1 transition-opacity ${photo.is_principal ? "bg-primary text-primary-foreground opacity-100" : "bg-background/90 text-foreground opacity-0 group-hover:opacity-100 hover:text-primary"}`}
                        >
                          <Star className={`h-3.5 w-3.5 ${photo.is_principal ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          title="Remover"
                          className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Passe o mouse e clique na estrela para definir a foto de <strong>destaque</strong> — ela vira a capa
                  do seu perfil e o thumbnail nos resultados.
                </p>
                {photos.length < 10 && (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Enviando..." : "Adicionar foto"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {businessSub === "arquivos" && <SupplierFilesTab supplierId={supplier.id} isEspaco={isEspaco} />}

          {businessSub === "disponibilidade" && (
            <div className="space-y-4">
              <AvailabilityCalendar supplierId={supplier.id} />
              {agendaEnabled && <CalendarConnections supplierId={supplier.id} />}
              <PromoDatesManager supplierId={supplier.id} />
            </div>
          )}

          {businessSub === "atendimento" && <SupplierAreaEditor supplierId={supplier.id} />}

          {businessSub === "reservas" && reservasEnabled && (
            <SupplierReservationsTab supplierId={supplier.id} categoriaSlug={cat?.slug ?? null} />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="painel-v2 min-h-[100dvh] overflow-x-hidden" style={{ background: "hsl(var(--background))", color: "var(--pv-ink)" }}>
      <WelcomeModal tipo="supplier" />
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: "rgba(248,243,237,.9)", borderColor: "var(--pv-line)" }}>
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--pv-ink)" }}>
            casamenteiro<span style={{ color: "var(--pv-terracota)" }}>.</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to={`/fornecedor/${supplier.id}`}
              target="_blank"
              className="hidden h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-semibold sm:inline-flex"
              style={{ borderColor: "#d9c9b8", color: "var(--pv-ink)" }}
            >
              Ver meu perfil <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex items-start">
        <SupplierSidebar
          active={dest}
          onChange={(d) => goDest(d)}
          items={destinations}
          cabecalho={
            <div className="mb-2.5 flex items-center gap-2.5 rounded-[14px] border bg-white p-2.5" style={{ borderColor: "var(--pv-line)" }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-sm font-extrabold" style={{ background: "linear-gradient(135deg,#f2b98a,#d9905a)", color: "#1f1d1b" }}>
                {iniciais}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-sm" style={{ color: "var(--pv-ink)" }}>{supplier.company_name}</b>
                <small className="block truncate text-xs" style={{ color: "var(--pv-muted)" }}>
                  {[cat?.name, supplier.city].filter(Boolean).join(" · ") || "Seu negócio"}
                </small>
              </span>
            </div>
          }
          rodape={<PlanoLateral supplierId={supplier.id} />}
        />

        <main
          className="mx-auto w-full min-w-0 max-w-[1180px] flex-1 px-4 py-7 md:px-7 md:pb-10"
          style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" } : undefined}
        >
          {dest !== "painel" && (
            <div className="mb-4 md:hidden">
              <TrialBanner supplierId={supplier.id} />
            </div>
          )}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              {dest === "painel" ? (
                <>
                  <h1 className="m-0 text-[clamp(24px,2.6vw,30px)] font-extrabold leading-tight" style={{ letterSpacing: "-0.035em", color: "var(--pv-ink)" }}>
                    {saudacao}, <em className="pv-serif" style={{ color: "var(--pv-clay)" }}>{supplier.company_name}.</em>
                  </h1>
                  <p className="pv-num m-0 mt-1 text-[15px]" style={{ color: "var(--pv-body)" }}>
                    {prioridades == null
                      ? "Aqui está o resumo do seu negócio."
                      : prioridades === 0
                        ? "Nada pendente por hoje."
                        : `Você tem ${prioridades} ${prioridades > 1 ? "coisas" : "coisa"} para resolver hoje.`}
                  </p>
                </>
              ) : (
                <h1 className="m-0 text-[clamp(24px,2.6vw,30px)] font-extrabold leading-tight" style={{ letterSpacing: "-0.035em", color: "var(--pv-ink)" }}>
                  {titulos[dest]}
                </h1>
              )}
            </div>
            {statusInfo && supplier.status !== "approved" && (
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <statusInfo.icon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            )}
          </div>

          {supplier.status === "pending" && !bannerDismissed && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-2">
                <p className="flex-1">
                  <strong>Seu perfil está em análise.</strong> Complete todas as informações e adicione fotos ao seu
                  portfólio para agilizar a aprovação.
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={dismissBanner}
                  aria-label="Dispensar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {supplier.status === "approved" && !bannerDismissed && (
            <Card className="mb-6 border-green-500/40 bg-green-500/5">
              <CardContent className="p-4 text-sm flex items-start gap-2">
                <p className="flex-1">
                  <strong className="text-green-700">Perfil aprovado!</strong> Você já está visível para os casais na
                  vitrine.
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={dismissBanner}
                  aria-label="Dispensar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {supplier.status === "rejected" && (
            <AjustesPedidosBanner
              supplierId={supplier.id}
              chave={`${photos.length}-${supplier.updated_at || ""}`}
              onIrPara={(aba) => goDest("negocio", { sub: aba === "fotos" ? "fotos" : "perfil" })}
              onReenviado={loadSupplier}
            />
          )}

          {supplier.status === "blocked" && <CadastroRecusadoBanner supplierId={supplier.id} />}

          {!supplier.onboarding_completed && (
            <div className="mb-6">
              <SupplierOnboardingWizard supplier={supplier} onComplete={loadSupplier} />
            </div>
          )}

          {renderContent()}

          {/* Atalho mobile para Avaliações no destino Painel */}
          {isMobile && dest === "painel" && (
            <button
              onClick={() => goDest("avaliacoes")}
              className="mt-6 w-full text-left text-sm font-semibold"
              style={{ color: "var(--pv-clay)" }}
            >
              Ver avaliações →
            </button>
          )}
        </main>
      </div>

      <SupplierMobileTabBar
        active={dest}
        onChange={(d) => goDest(d)}
        quotesCount={quotes.length}
        overdueLeads={0}
        vagasEnabled={vagasEnabled}
      />

      {/* Conversa de orçamento */}
      {(() => {
        const handleOpenChange = (v: boolean) => {
          setThreadOpen(v);
          if (!v && searchParams.get("quote")) {
            const next = new URLSearchParams(searchParams);
            next.delete("quote");
            setSearchParams(next, { replace: true });
          }
        };
        const body =
          selectedQuote && user && supplier ? (
            <QuoteConversation
              quoteId={selectedQuote.id}
              currentUserId={user.id}
              isSupplier={true}
              coupleId={selectedQuote.couple_id}
              supplierId={supplier.id}
              onContracted={() => {
                loadQuotes();
                setThreadOpen(false);
              }}
            />
          ) : null;
        return isMobile ? (
          <Sheet open={threadOpen} onOpenChange={handleOpenChange}>
            <SheetContent side="bottom" className="painel-v2 h-[100dvh] p-0 flex flex-col gap-0 rounded-none">
              <SheetHeader className="px-4 py-3 border-b border-border text-left">
                <SheetTitle className="text-base">Orçamento</SheetTitle>
              </SheetHeader>
              {body}
            </SheetContent>
          </Sheet>
        ) : (
          <Sheet open={threadOpen} onOpenChange={handleOpenChange}>
            <SheetContent side="right" className="painel-v2 flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-[560px]">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle className="text-lg font-bold">
                  Pedido de orçamento
                  {selectedQuote?.event_date && (
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      {new Date(selectedQuote.event_date).toLocaleDateString("pt-BR")}
                      {selectedQuote?.guest_count ? ` · ${selectedQuote.guest_count} convidados` : ""}
                    </span>
                  )}
                </SheetTitle>
              </SheetHeader>
              {body}
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
}

/** Bloco do plano no rodapé do menu lateral (teste, assinatura ou gratuito). */
function PlanoLateral({ supplierId }: { supplierId: string }) {
  const { plano, carregando } = useSupplierPlan(supplierId);
  if (carregando || !plano) return null;
  let titulo = "Plano gratuito";
  let texto = "Assine para liberar CRM, equipe e mais recursos.";
  let pct: number | null = null;
  if (plano.emTrial && plano.trialEndsAt) {
    const resta = Math.max(0, Math.ceil((new Date(plano.trialEndsAt).getTime() - Date.now()) / 864e5));
    titulo = plano.nome ? `Plano ${plano.nome}` : "Plano pago grátis";
    texto = `${resta} ${resta === 1 ? "dia" : "dias"} de teste restantes`;
    pct = Math.min(100, Math.max(4, 100 - (resta / 60) * 100));
  } else if (plano.temAssinatura) {
    titulo = plano.nome ? `Plano ${plano.nome}` : "Plano ativo";
    texto = plano.cancelada ? "Cancelado: vale até o fim do período pago." : "Assinatura ativa.";
  }
  return (
    <div className="flex flex-col gap-2 rounded-[14px] p-3.5 text-[13px]" style={{ background: "var(--pv-sage-soft)", color: "var(--pv-body)" }}>
      <b className="text-sm" style={{ color: "var(--pv-ink)" }}>{titulo}</b>
      <span className="pv-num">{texto}</span>
      {pct != null && (
        <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(74,124,106,.18)" }}>
          <span className="block h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct}%`, background: "var(--pv-sage)" }} />
        </span>
      )}
      <Link to="/fornecedor/planos" className="self-start font-semibold hover:underline" style={{ color: "var(--pv-clay)" }}>
        {plano.temAssinatura ? "Gerenciar plano" : "Ver planos"}
      </Link>
    </div>
  );
}
