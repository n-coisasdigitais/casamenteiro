import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SUPPLIER_COLS } from "@/lib/suppliers";
import { semDemo } from "@/lib/demoScope";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Accessibility,
  Award,
  BedDouble,
  Building,
  CalendarDays,
  Car,
  Check,
  ChefHat,
  Clock,
  Leaf,
  MapPin,
  Music,
  Route,
  Send,
  Sparkles,
  Star,
  Tag,
  Umbrella,
  Users,
  UtensilsCrossed,
  Wallet,
  Wine,
  X as XIcon,
  type LucideIcon,
} from "lucide-react";
import PromoDatesInline from "@/components/reservas/PromoDatesInline";
import SupplierMap from "@/components/SupplierMap";
import SEO from "@/components/SEO";
import { absoluteUrl, breadcrumbJsonLd, priceRangeLabel, truncate } from "@/lib/seo";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";
import RedesSociaisPerfil from "@/components/redes/RedesSociaisPerfil";
import SupplierPublicAttachments from "@/components/supplier/SupplierPublicAttachments";
import { isEspacoCategory } from "@/lib/categories";
import { reais, ehCampoDinheiro } from "@/components/ui/moeda-input";
import GaleriaFornecedor, { Visualizador } from "@/components/perfil/GaleriaFornecedor";
import OrcamentoInline, { formatarHoras } from "@/components/perfil/OrcamentoInline";
import "@/components/perfil/perfil.css";

type Campo = { id: string; chave: string; label: string; tipo: string; grupo: string | null; ordem: number; valor: any };
type Faq = { id: string; pergunta: string; resposta: string };

/** Campos que já aparecem em outro lugar da página (ou são contato). */
const CHAVES_FORA = new Set(["descricao", "telefone", "whatsapp", "site", "instagram", "cidade", "estado"]);

function iconeDoCampo(chave: string): LucideIcon {
  const c = chave.toLowerCase();
  if (/capacidade|convidados|pessoas|equipe/.test(c)) return Users;
  if (/estacionamento|manobrista/.test(c)) return Car;
  if (/cozinha|cardapio|card[aá]pio/.test(c)) return ChefHat;
  if (/hospedagem|quarto|chal/.test(c)) return BedDouble;
  if (/acessib/.test(c)) return Accessibility;
  if (/eventos_por_dia|agenda|data/.test(c)) return CalendarDays;
  if (/horario|hora|duracao|tempo/.test(c)) return Clock;
  if (/preco|valor|pacote|faixa/.test(c)) return Wallet;
  if (/atende_fora|deslocamento|raio|viagem|destination/.test(c)) return Route;
  if (/anos|experiencia/.test(c)) return Award;
  if (/restri|vegan|vegetar/.test(c)) return Leaf;
  if (/degusta|servico|buffet/.test(c)) return UtensilsCrossed;
  if (/bebida|bar|drink/.test(c)) return Wine;
  if (/coberta|chuva/.test(c)) return Umbrella;
  if (/musica|repertorio|som|banda/.test(c)) return Music;
  return Sparkles;
}

function vazio(v: any) {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
  );
}

function textoFaixa(v: any) {
  if (v?.min != null && v?.max != null) return `${reais(v.min)} a ${reais(v.max)}`;
  if (v?.min != null) return `a partir de ${reais(v.min)}`;
  if (v?.max != null) return `até ${reais(v.max)}`;
  return "";
}

function Estrelas({ nota, tamanho = "h-4 w-4" }: { nota: number; tamanho?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${tamanho} ${s <= Math.round(nota) ? "fill-[var(--pf-star)] text-[var(--pf-star)]" : "text-[#d8cfc4]"}`} />
      ))}
    </span>
  );
}

export default function SupplierProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [tempoResposta, setTempoResposta] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sobreAberto, setSobreAberto] = useState(false);
  const [fotoAberta, setFotoAberta] = useState<number | null>(null);
  const [folha, setFolha] = useState(false);
  const [secao, setSecao] = useState("sobre");

  // Avaliações
  const [reviews, setReviews] = useState<any[]>([]);
  const [verTodas, setVerTodas] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userHasReview, setUserHasReview] = useState(false);
  const [podeAvaliar, setPodeAvaliar] = useState(false);
  const [phoneUnlocked, setPhoneUnlocked] = useState(false);

  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Prova social (aleatória, estável por carregamento)
  const viewerCount = useMemo(() => Math.floor(Math.random() * 15) + 1, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSobreAberto(false);
    setVerTodas(false);
    window.scrollTo(0, 0);

    supabase
      .from("suppliers")
      .select(`${SUPPLIER_COLS}, categories(name, slug)`)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setSupplier(data);
        setLoading(false);
        if (!data) return;
        if (data.category_id) {
          semDemo(
            supabase
              .from("suppliers")
              .select(`${SUPPLIER_COLS}, categories(name), supplier_photos(photo_url, is_principal)`)
              .eq("status", "approved")
              .eq("category_id", data.category_id)
              .neq("id", id),
          )
            .order("rating", { ascending: false, nullsFirst: false })
            .limit(4)
            .then(({ data: recs }: any) => setRecommendations(recs || []));
          carregarCampos(id, data.category_id);
        }
      });

    supabase
      .from("supplier_photos")
      .select("*")
      .eq("supplier_id", id)
      .order("display_order")
      .then(({ data }) => setPhotos(data || []));

    (supabase.from("supplier_faqs" as any) as any)
      .select("id, pergunta, resposta")
      .eq("supplier_id", id)
      .order("ordem")
      .then(({ data }: any) => setFaqs(data || []));

    (supabase.rpc as any)("fornecedor_tempo_resposta", { _supplier_id: id }).then(({ data }: any) =>
      setTempoResposta((typeof data === "number" || typeof data === "string") && data !== "" && Number.isFinite(Number(data)) ? Number(data) : null),
    );

    loadReviews();

    // Registra visita ao perfil (1x por carregamento)
    (supabase.from("supplier_profile_views") as any).insert({ supplier_id: id, viewer_id: user?.id ?? null }).then(() => {
      /* fire-and-forget */
    });

    if (user) {
      supabase
        .from("couples")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          setCoupleId(data.id);
          supabase
            .from("couple_favorites")
            .select("id")
            .eq("couple_id", data.id)
            .eq("supplier_id", id)
            .maybeSingle()
            .then(({ data: fav }) => setIsFavorited(!!fav));
          supabase
            .from("reviews")
            .select("id")
            .eq("couple_id", data.id)
            .eq("supplier_id", id)
            .maybeSingle()
            .then(({ data: rev }) => setUserHasReview(!!rev));
          verificarPodeAvaliar(data.id, id);
          carregarContato(id);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const carregarCampos = async (supplierId: string, categoryId: string) => {
    const [{ data: cps }, { data: resps }] = await Promise.all([
      (supabase.from("campos_categoria") as any)
        .select("id, chave, label, tipo, grupo, ordem")
        .eq("category_id", categoryId)
        .eq("ativo", true)
        .eq("mostrar_no_perfil", true)
        .order("ordem"),
      (supabase.from("fornecedor_campos") as any).select("campo_id, valor").eq("supplier_id", supplierId),
    ]);
    const mapa = new Map<string, any>((resps || []).map((r: any) => [r.campo_id, r.valor]));
    setCampos(
      (cps || [])
        .map((c: any) => ({ ...c, valor: mapa.get(c.id) }))
        .filter((c: Campo) => !vazio(c.valor)),
    );
  };

  const carregarContato = (supplierId: string) => {
    supabase.rpc("get_supplier_contact", { _supplier_id: supplierId }).then(({ data: contato }) => {
      const c = (contato as any[])?.[0];
      if (c && (c.phone || c.whatsapp || c.email)) {
        setPhoneUnlocked(true);
        setSupplier((prev: any) => (prev ? { ...prev, ...c } : prev));
      } else setPhoneUnlocked(false);
    });
  };

  const verificarPodeAvaliar = async (casal: string, supplierId: string) => {
    const [{ count: pedidos }, { count: contratos }] = await Promise.all([
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("couple_id", casal).eq("supplier_id", supplierId),
      supabase.from("couple_suppliers").select("id", { count: "exact", head: true }).eq("couple_id", casal).eq("supplier_id", supplierId),
    ]);
    setPodeAvaliar((pedidos || 0) + (contratos || 0) > 0);
  };

  const loadReviews = async () => {
    if (!id) return;
    const { data } = await (supabase.from("reviews") as any)
      .select("*")
      .eq("supplier_id", id)
      .eq("alvo_tipo", "supplier")
      .eq("aprovado", true)
      .eq("publico", true)
      .order("created_at", { ascending: false });
    setReviews(data || []);
  };

  const submitReview = async () => {
    if (!coupleId || !id || !user) {
      toast({ title: "Faça login como casal para avaliar", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      supplier_id: id,
      couple_id: coupleId,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      comment: reviewComment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      toast({ title: "Erro ao enviar avaliação", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    toast({ title: "Avaliação enviada!" });
    setReviewTitle("");
    setReviewComment("");
    setReviewRating(5);
    setUserHasReview(true);
    loadReviews();
    supabase
      .from("suppliers")
      .select(`${SUPPLIER_COLS}, categories(name, slug)`)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => data && setSupplier((prev: any) => ({ ...prev, ...data })));
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: "Faça login para salvar", description: "Crie uma conta grátis ou entre para guardar seus favoritos." });
      return;
    }
    if (!coupleId || !id) {
      toast({ title: "Favoritos são para contas de casal" });
      return;
    }
    if (isFavorited) {
      await supabase.from("couple_favorites").delete().eq("couple_id", coupleId).eq("supplier_id", id);
      setIsFavorited(false);
      toast({ title: "Removido dos favoritos" });
    } else {
      await supabase.from("couple_favorites").insert({ couple_id: coupleId, supplier_id: id });
      setIsFavorited(true);
      toast({ title: "Salvo nos favoritos!" });
    }
  };

  const compartilhar = async () => {
    const url = absoluteUrl(`/fornecedor/${id}`);
    try {
      if (navigator.share) {
        await navigator.share({ title: supplier?.company_name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    } catch {
      /* cancelado */
    }
  };

  // seção ativa no menu fixo
  useEffect(() => {
    if (loading || !("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".pf-bloco[id]"));
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSecao(e.target.id)),
      { rootMargin: "-130px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [loading, campos.length, faqs.length, photos.length]);

  const notas = useMemo(() => {
    const cont = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const n = Math.min(5, Math.max(1, Math.round(r.rating)));
      cont[5 - n]++;
    });
    const media = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : 0;
    return { cont, media };
  }, [reviews]);

  if (loading)
    return (
      <div className="pf grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--pf-line2)] border-t-[var(--pf-clay)]" />
      </div>
    );
  if (!supplier)
    return (
      <div className="pf flex min-h-screen flex-col items-center justify-center gap-4">
        <Building className="h-16 w-16 text-[var(--pf-muted)]" />
        <p className="text-[var(--pf-body)]">Fornecedor não encontrado.</p>
        <Button asChild>
          <Link to="/buscar">Voltar à busca</Link>
        </Button>
      </div>
    );

  const categoria = (supplier.categories as any) || {};
  const categoryName: string = categoria.name || "Fornecedor";
  const categoriaSlug: string = categoria.slug || "";
  const ehEspaco = isEspacoCategory(categoriaSlug || null, categoria.name ?? null);
  const local = [supplier.city, supplier.state].filter(Boolean).join(", ");
  const nota = reviews.length ? notas.media : Number(supplier.rating) || 0;
  const totalAvaliacoes = reviews.length || supplier.review_count || 0;
  const ratingLabel = nota >= 4.8 ? "Fantástico" : nota >= 4.5 ? "Excelente" : nota >= 4.0 ? "Muito bom" : "Bom";
  const valorCampo = (...chaves: string[]) => campos.find((c) => chaves.includes(c.chave))?.valor;

  // preço: faixa da categoria > preço médio > price_min do cadastro
  const faixaPreco = valorCampo("preco_locacao", "preco_por_pessoa", "faixa_preco", "preco");
  const minFaixa: number | null = faixaPreco && typeof faixaPreco === "object" && faixaPreco.min != null ? Number(faixaPreco.min) : null;
  const precoBase: number | null =
    minFaixa ??
    (valorCampo("preco_medio") != null ? Number(valorCampo("preco_medio")) : null) ??
    (supplier.price_min ? Number(supplier.price_min) : null);
  const porPessoa = !!campos.find((c) => c.chave === "preco_por_pessoa" && !vazio(c.valor));
  const precoTexto = precoBase ? `${reais(precoBase)}${porPessoa ? " /pessoa" : ""}` : null;

  // destaques: só dados reais do cadastro
  const capacidade = valorCampo("capacidade_max", "convidados_max") ?? supplier.guest_max;
  const destaques: { icone: LucideIcon; rotulo: string; valor: string }[] = [];
  if (capacidade) destaques.push({ icone: Users, rotulo: "Capacidade", valor: `até ${Number(capacidade).toLocaleString("pt-BR")} convidados` });
  const quartos = valorCampo("hospedagem_qtd");
  if (quartos) destaques.push({ icone: BedDouble, rotulo: "Hospedagem", valor: `${quartos} ${Number(quartos) === 1 ? "quarto ou chalé" : "quartos ou chalés"}` });
  const anos = valorCampo("anos_experiencia");
  if (anos) destaques.push({ icone: Award, rotulo: "Experiência", valor: `${anos} ${Number(anos) === 1 ? "ano" : "anos"}` });
  destaques.push({ icone: Wallet, rotulo: "Preço", valor: precoTexto ? `a partir de ${precoTexto}` : "sob consulta" });
  if (local) destaques.push({ icone: MapPin, rotulo: "Atende", valor: local });

  const oferece = campos.filter((c) => !CHAVES_FORA.has(c.chave));
  const cidadesAtendidas: string[] = Array.isArray(supplier.cidades_atendidas) ? supplier.cidades_atendidas.filter(Boolean) : [];
  const descricao: string = supplier.description || "";
  const descricaoLonga = descricao.length > 420;
  const mostrarFotos = photos.length > 1;
  const reviewsVisiveis = verTodas ? reviews : reviews.slice(0, 4);

  const secoes = [
    { id: "sobre", rotulo: "Sobre" },
    ...(oferece.length ? [{ id: "oferece", rotulo: "O que oferece" }] : []),
    ...(mostrarFotos ? [{ id: "fotos", rotulo: "Fotos" }] : []),
    { id: "avaliacoes", rotulo: "Avaliações" },
    ...(local ? [{ id: "local", rotulo: "Localização" }] : []),
    ...(faqs.length ? [{ id: "perguntas", rotulo: "Perguntas" }] : []),
  ];

  const seoImages = [supplier.profile_photo_url, ...photos.slice(0, 4).map((p: any) => p.photo_url)].filter(Boolean);
  const localBusinessJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl(`/fornecedor/${id}`),
    name: supplier.company_name,
    url: absoluteUrl(`/fornecedor/${id}`),
    image: seoImages.length ? seoImages : undefined,
    description: supplier.description || undefined,
    priceRange: priceRangeLabel(supplier.price_min, supplier.price_max),
    address: {
      "@type": "PostalAddress",
      addressLocality: supplier.city || undefined,
      addressRegion: supplier.state || undefined,
      addressCountry: "BR",
    },
    telephone: supplier.whatsapp || supplier.phone || undefined,
    geo: supplier.lat && supplier.lng ? { "@type": "GeoCoordinates", latitude: supplier.lat, longitude: supplier.lng } : undefined,
    aggregateRating:
      supplier.rating && supplier.review_count
        ? { "@type": "AggregateRating", ratingValue: supplier.rating, reviewCount: supplier.review_count }
        : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", path: "/" },
    { name: categoryName, path: "/explorar" },
    { name: supplier.company_name, path: `/fornecedor/${id}` },
  ]);

  const orcamentoProps = {
    supplierId: supplier.id,
    supplierName: supplier.company_name,
    categoriaSlug,
    categoriaNome: categoryName,
    precoTexto,
    tempoResposta,
    olhando: viewerCount,
    whatsapp: phoneUnlocked ? supplier.whatsapp || supplier.phone || null : null,
    onEnviado: () => {
      carregarContato(supplier.id);
      if (coupleId) setPodeAvaliar(true);
    },
  };

  const cartoesLaterais = (
    <>
      <div className="pf-promo">
        <PromoDatesInline supplierId={supplier.id} supplierName={supplier.company_name} priceMin={supplier.price_min} />
      </div>
      <RedesSociaisPerfil supplierId={supplier.id} className="pf-redes" />
    </>
  );

  return (
    <div className="pf pb-24 md:pb-0">
      <SEO
        title={`${supplier.company_name} — Casamenteiro`}
        description={truncate(
          supplier.description || `Conheça ${supplier.company_name}${supplier.city ? ` em ${supplier.city}` : ""} e peça um orçamento sem compromisso.`,
        )}
        canonical={absoluteUrl(`/fornecedor/${id}`)}
        ogImage={supplier.profile_photo_url || photos[0]?.photo_url || undefined}
        jsonLd={[localBusinessJsonLd, breadcrumb]}
      />

      <header className="pf-top">
        <div className="pf-wrap flex h-[60px] items-center gap-6">
          <Link to="/" className="pf-serif text-[22px] tracking-tight">
            casamenteiro<span className="text-[var(--pf-clay)]">.</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-[var(--pf-body)] md:flex">
            <Link to="/explorar" className="hover:text-[var(--pf-ink)]">
              Fornecedores
            </Link>
            {user && (
              <Link to="/dashboard" className="hover:text-[var(--pf-ink)]">
                Meu casamento
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationsBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/login" className="pf-pill h-9 px-3.5 text-[13.5px]">
                  Entrar
                </Link>
                <Link to="/cadastro" className="pf-pill pri hidden h-9 px-3.5 text-[13.5px] sm:inline-flex">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pf-wrap">
        <nav className="flex flex-wrap items-center gap-1.5 py-3.5 text-[12.5px] text-[var(--pf-muted)]" aria-label="Caminho">
          <Link to="/" className="hover:text-[var(--pf-ink)]">
            Início
          </Link>
          <span>›</span>
          <Link to={categoriaSlug ? `/categoria/${categoriaSlug}` : "/explorar"} className="hover:text-[var(--pf-ink)]">
            {categoryName}
          </Link>
          {local && (
            <>
              <span>›</span>
              <span>{local}</span>
            </>
          )}
          <span>›</span>
          <span className="text-[var(--pf-ink)]">{supplier.company_name}</span>
        </nav>

        <GaleriaFornecedor
          fotos={photos}
          nome={supplier.company_name}
          favorito={isFavorited}
          onFavoritar={toggleFavorite}
          onCompartilhar={compartilhar}
        />

        <div className="mt-6 grid gap-10 md:mt-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="pf-tag">{categoryName}</span>
              {supplier.status === "approved" && (
                <span className="pf-tag ok">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Perfil verificado
                </span>
              )}
              {supplier.promo_percentage > 0 && (
                <span className="pf-tag">
                  <Tag className="h-3.5 w-3.5" /> {supplier.promo_percentage}% de desconto
                </span>
              )}
            </div>
            <h1 className="pf-serif mt-3 text-[34px] leading-[1.08] tracking-[-0.02em] md:text-[46px]">{supplier.company_name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px] text-[var(--pf-body)]">
              {totalAvaliacoes > 0 && nota > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-[var(--pf-star)] text-[var(--pf-star)]" />
                  <b className="text-[var(--pf-ink)]">{nota.toFixed(1).replace(".", ",")}</b>
                  <a href="#avaliacoes" className="underline underline-offset-2">
                    {totalAvaliacoes} {totalAvaliacoes === 1 ? "avaliação" : "avaliações"}
                  </a>
                </span>
              ) : (
                <span className="pf-tag h-6 text-xs">Novo no Casamenteiro</span>
              )}
              {local && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {local}
                </span>
              )}
              {tempoResposta != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Responde em cerca de {formatarHoras(tempoResposta)}
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {destaques.slice(0, 4).map((d) => (
                <div key={d.rotulo} className="pf-dest">
                  <span className="pf-ic">
                    <d.icone className="h-[18px] w-[18px]" />
                  </span>
                  <small className="text-xs font-semibold text-[var(--pf-muted)]">{d.rotulo}</small>
                  <b className="text-[14.5px] leading-snug">{d.valor}</b>
                </div>
              ))}
            </div>

            {/* celular: datas e redes logo abaixo dos destaques */}
            <div className="mt-4 flex flex-col gap-3 lg:hidden">{cartoesLaterais}</div>

            <nav className="pf-subnav -mx-4 mt-8 px-4 md:mx-0 md:px-0" aria-label="Seções">
              {secoes.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={secao === s.id ? "on" : ""}>
                  {s.rotulo}
                </a>
              ))}
            </nav>

            <section className="pf-bloco" id="sobre">
              <h2 className="pf-h2">
                Sobre {ehEspaco ? "o" : ""} <em>{ehEspaco ? "espaço" : categoryName.toLowerCase()}</em>
              </h2>
              {descricao ? (
                <>
                  <div className={`pf-sobre ${descricaoLonga && !sobreAberto ? "curto" : ""}`}>{descricao}</div>
                  {descricaoLonga && (
                    <button
                      type="button"
                      className="mt-2 text-sm font-bold text-[var(--pf-clay)] underline underline-offset-4"
                      onClick={() => setSobreAberto((v) => !v)}
                    >
                      {sobreAberto ? "Mostrar menos" : "Ler tudo"}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-[var(--pf-body)]">Este fornecedor ainda não escreveu sobre o trabalho dele.</p>
              )}
              <div className="mt-5">
                <SupplierPublicAttachments supplierId={supplier.id} showFloorPlan={ehEspaco} />
              </div>
            </section>

            {oferece.length > 0 && (
              <section className="pf-bloco" id="oferece">
                <h2 className="pf-h2">
                  O que <em>oferece</em>
                </h2>
                <p className="-mt-2 mb-3 text-[13px] text-[var(--pf-muted)]">Informações preenchidas pelo fornecedor no cadastro.</p>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {oferece.map((c) => {
                    const Icone = iconeDoCampo(c.chave);
                    return (
                      <div key={c.id} className="pf-of">
                        <span className="pf-ic">
                          <Icone className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <small className="block text-[12.5px] text-[var(--pf-muted)]">{c.label}</small>
                          <ValorCampo campo={c} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {mostrarFotos && (
              <section className="pf-bloco" id="fotos">
                <h2 className="pf-h2">
                  Fotos <em>({photos.length})</em>
                </h2>
                <div className="pf-mosaico">
                  {photos.map((f, i) => (
                    <button key={f.id || i} type="button" onClick={() => setFotoAberta(i)} aria-label={`Abrir foto ${i + 1}`}>
                      <img src={f.photo_url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="pf-bloco" id="avaliacoes">
              <h2 className="pf-h2">
                O que dizem os <em>casais</em>
              </h2>
              {reviews.length > 0 ? (
                <>
                  <div className="pf-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                    <div className="flex flex-col">
                      <b className="pf-serif text-[44px] leading-none">{nota.toFixed(1).replace(".", ",")}</b>
                      <span className="mt-1.5">
                        <Estrelas nota={nota} />
                      </span>
                      <small className="mt-1 text-[13px] text-[var(--pf-muted)]">
                        {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"} · {ratingLabel}
                      </small>
                    </div>
                    <div className="pf-barra-nota flex flex-1 flex-col gap-1.5 text-[12.5px] text-[var(--pf-body)]">
                      {notas.cont.map((n, i) => (
                        <div key={i} className="grid grid-cols-[64px_1fr_20px] items-center gap-2.5">
                          <span>
                            {5 - i} {5 - i === 1 ? "estrela" : "estrelas"}
                          </span>
                          <i style={{ ["--w" as any]: `${(n / reviews.length) * 100}%` }} />
                          <span className="text-right">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {reviewsVisiveis.map((rev) => (
                      <article key={rev.id} className="pf-card p-4">
                        <header className="mb-2 flex items-center gap-2.5">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--pf-blush)] text-[var(--pf-clay)]">
                            <Users className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <b className="block truncate text-sm">Casal do Casamenteiro</b>
                            <small className="text-xs text-[var(--pf-muted)]">
                              {new Date(rev.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                            </small>
                          </div>
                          <Estrelas nota={rev.rating} tamanho="h-3.5 w-3.5" />
                        </header>
                        {rev.title && <p className="mb-1 text-sm font-semibold">{rev.title}</p>}
                        {rev.comment && <p className="text-sm leading-relaxed text-[var(--pf-body)]">{rev.comment}</p>}
                      </article>
                    ))}
                  </div>
                  {reviews.length > 4 && !verTodas && (
                    <button type="button" className="pf-pill mt-4" onClick={() => setVerTodas(true)}>
                      Ver as {reviews.length} avaliações
                    </button>
                  )}
                </>
              ) : (
                <div className="pf-card flex items-start gap-3.5 p-5">
                  <span className="pf-ic">
                    <Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <b>Ainda sem avaliações</b>
                    <p className="mt-0.5 text-sm text-[var(--pf-body)]">
                      Só casais que pediram orçamento ou contrataram este fornecedor podem avaliar, para as notas serem de verdade.
                    </p>
                  </div>
                </div>
              )}

              {user && coupleId && !userHasReview && podeAvaliar && (
                <div className="pf-card mt-4 p-5">
                  <h3 className="mb-3 font-semibold">Conte como foi com {supplier.company_name}</h3>
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setReviewRating(s)} aria-label={`${s} estrelas`}>
                        <Star
                          className={`h-7 w-7 transition-colors ${s <= reviewRating ? "fill-[var(--pf-star)] text-[var(--pf-star)]" : "text-[#d8cfc4] hover:text-[var(--pf-terra)]"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Título da avaliação (opcional)"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="mb-2 bg-white"
                    maxLength={100}
                  />
                  <Textarea
                    placeholder="Como foi a experiência?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mb-3 bg-white"
                    maxLength={1000}
                  />
                  <button type="button" className="pf-pill pri" onClick={submitReview} disabled={submittingReview}>
                    <Send className="h-4 w-4" />
                    {submittingReview ? "Enviando..." : "Enviar avaliação"}
                  </button>
                </div>
              )}
            </section>

            {local && (
              <section className="pf-bloco" id="local">
                <h2 className="pf-h2">
                  Onde <em>fica</em>
                </h2>
                <div className="overflow-hidden rounded-[18px] border border-[var(--pf-line)] bg-white">
                  <SupplierMap city={supplier.city} state={supplier.state} supplierName={supplier.company_name} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(cidadesAtendidas.length ? cidadesAtendidas : [supplier.city].filter(Boolean)).map((c: string) => (
                    <span key={c} className="pf-chip">
                      Atende em {c}
                    </span>
                  ))}
                  {valorCampo("atende_fora") === true && <span className="pf-chip">Atende fora da cidade</span>}
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="pf-bloco" id="perguntas">
                <h2 className="pf-h2">
                  Perguntas <em>frequentes</em>
                </h2>
                {faqs.map((f) => (
                  <details key={f.id} className="pf-faq">
                    <summary>{f.pergunta}</summary>
                    <p className="whitespace-pre-line pb-4 text-[15px] leading-relaxed text-[var(--pf-body)]">{f.resposta}</p>
                  </details>
                ))}
              </section>
            )}

            {recommendations.length > 0 && (
              <section className="pf-bloco pb-10">
                <h2 className="pf-h2">
                  Outros <em>{ehEspaco ? "espaços" : categoryName.toLowerCase()}</em> que você pode gostar
                </h2>
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
                  {recommendations.map((rec) => {
                    const fotos = rec.supplier_photos || [];
                    const foto = (fotos.find((p: any) => p.is_principal) || fotos[0])?.photo_url || rec.profile_photo_url;
                    return (
                      <Link
                        key={rec.id}
                        to={`/fornecedor/${rec.id}`}
                        className="group w-[220px] flex-none snap-start overflow-hidden rounded-2xl border border-[var(--pf-line)] bg-white md:w-auto"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#e9e0d6]">
                          {foto ? (
                            <img
                              src={foto}
                              alt={rec.company_name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <Building className="h-8 w-8 text-[#b9a999]" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <b className="line-clamp-1 text-sm">{rec.company_name}</b>
                          <small className="mt-0.5 flex items-center gap-1 text-xs text-[var(--pf-muted)]">
                            {[rec.city, rec.state].filter(Boolean).join(", ") || "Brasil"}
                            {" · "}
                            {rec.rating ? (
                              <>
                                <Star className="h-3 w-3 fill-[var(--pf-star)] text-[var(--pf-star)]" />
                                {Number(rec.rating).toFixed(1).replace(".", ",")}
                              </>
                            ) : (
                              "Novo"
                            )}
                          </small>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[76px] flex flex-col gap-3">
              <OrcamentoInline {...orcamentoProps} />
              {cartoesLaterais}
            </div>
          </aside>
        </div>
      </main>

      {/* celular: barra fixa + folha com o formulário */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[var(--pf-line)] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 flex-col leading-tight">
          <small className="text-[11.5px] font-semibold text-[var(--pf-muted)]">{precoTexto ? "a partir de" : "preço"}</small>
          <b className="pf-serif truncate text-lg">{precoTexto || "Sob consulta"}</b>
        </div>
        <button type="button" className="pf-cta ml-auto h-12 flex-1 px-5 text-[15px]" onClick={() => setFolha(true)}>
          Pedir orçamento grátis
        </button>
      </div>
      <Sheet open={folha} onOpenChange={setFolha}>
        <SheetContent
          side="bottom"
          className="pf pf-folha max-h-[92dvh] w-full max-w-full overflow-y-auto overflow-x-hidden rounded-t-3xl border-0 p-3 pt-0"
          style={{ minHeight: 0 }}
        >
          <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center gap-3 bg-[var(--pf-bg)] px-4 pb-2 pt-3">
            <SheetTitle className="min-w-0 flex-1 truncate text-[15px] font-semibold">Orçamento · {supplier.company_name}</SheetTitle>
            <SheetClose className="pf-pill h-9 px-3.5 text-[13.5px]">Fechar</SheetClose>
          </div>
          <OrcamentoInline {...orcamentoProps} />
        </SheetContent>
      </Sheet>

      {fotoAberta !== null && (
        <Visualizador fotos={photos} nome={supplier.company_name} inicio={fotoAberta} onFechar={() => setFotoAberta(null)} />
      )}
    </div>
  );
}

function ValorCampo({ campo }: { campo: Campo }) {
  const v = campo.valor;
  switch (campo.tipo) {
    case "booleano":
    case "checkbox":
      return v ? (
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--pf-ok)]">
          <Check className="h-4 w-4" /> Sim
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[var(--pf-muted)]">
          <XIcon className="h-4 w-4" /> Não
        </span>
      );
    case "lista":
    case "multiselect":
      return (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(Array.isArray(v) ? v : [v]).map((s: string, i: number) => (
            <span key={i} className="pf-chip">
              {s}
            </span>
          ))}
        </div>
      );
    case "faixa":
      return <span className="font-semibold">{textoFaixa(v)}</span>;
    case "numero":
      return <span className="font-semibold">{ehCampoDinheiro(campo) ? reais(Number(v)) : Number(v).toLocaleString("pt-BR")}</span>;
    case "textarea":
      return <span className="whitespace-pre-line text-[var(--pf-body)]">{String(v)}</span>;
    default:
      return <span className="font-semibold">{String(v)}</span>;
  }
}
