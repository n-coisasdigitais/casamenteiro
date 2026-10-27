import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  Building,
  Cake,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flower2,
  HeartHandshake,
  Mail,
  Music,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Utensils,
  Video,
} from "lucide-react";
import SEO from "@/components/SEO";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { resolverCategoriaSlug } from "@/lib/categoriaSlug";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RodapeVitrine, TopoVitrine, useFavoritos } from "@/components/vitrine/VitrineLayout";
import CapaVitrine from "@/components/vitrine/CapaVitrine";
import CardFornecedor from "@/components/vitrine/CardFornecedor";
import AvisoCategoria from "@/components/vitrine/AvisoCategoria";
import {
  FOTO_PADRAO,
  carregarAnuncios,
  carregarCategorias,
  carregarFornecedores,
  carregarFotoInstitucional,
  normalizar,
  type Anuncio,
  type CategoriaVitrine,
  type FornecedorVitrine,
} from "@/lib/vitrine";

export const iconesCategoria: Record<string, any> = {
  building: Building,
  camera: Camera,
  video: Video,
  music: Music,
  flower: Flower2,
  mail: Mail,
  shirt: Shirt,
  sparkles: Sparkles,
  cake: Cake,
  clipboard: ClipboardList,
  heart: HeartHandshake,
  car: Car,
  utensils: Utensils,
};

function Trilho({ titulo, subtitulo, link, children }: { titulo: React.ReactNode; subtitulo?: string; link?: { to: string; label: string }; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rolar = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="vt-sec">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="vt-h2">{titulo}</h2>
          {subtitulo && <p className="mt-1 text-sm text-[var(--vt-muted)]">{subtitulo}</p>}
        </div>
        {link ? (
          <Link to={link.to} className="whitespace-nowrap text-sm font-bold text-[var(--vt-clay)]">
            {link.label}
          </Link>
        ) : (
          <div className="hidden gap-1.5 md:flex">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--vt-line2)] bg-white" onClick={() => rolar(-1)} aria-label="Voltar">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--vt-line2)] bg-white" onClick={() => rolar(1)} aria-label="Avançar">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div ref={ref} className="vt-trilho">
        {children}
      </div>
    </section>
  );
}

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get("cat") || searchParams.get("categoria") || "";
  const qParam = searchParams.get("q") || "";
  const locParam = searchParams.get("loc") || searchParams.get("cidade") || "";
  const { favoritos, alternar } = useFavoritos();

  const [categorias, setCategorias] = useState<CategoriaVitrine[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorVitrine[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [fotoPadrao, setFotoPadrao] = useState(FOTO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [buscaCat, setBuscaCat] = useState("");
  const [buscaCidade, setBuscaCidade] = useState(locParam);

  useEffect(() => {
    (async () => {
      const [cats, forns] = await Promise.all([carregarCategorias(), carregarFornecedores()]);
      setCategorias(cats);
      setFornecedores(forns);
      setCarregando(false);
    })();
    carregarAnuncios(null).then(setAnuncios);
    carregarFotoInstitucional().then(setFotoPadrao);
  }, []);

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    fornecedores.forEach((f) => f.category_id && m.set(f.category_id, (m.get(f.category_id) || 0) + 1));
    return m;
  }, [fornecedores]);
  const comFornecedor = useMemo(
    () => categorias.filter((c) => contagem.get(c.id)).sort((a, b) => (contagem.get(b.id) || 0) - (contagem.get(a.id) || 0)),
    [categorias, contagem],
  );
  const semFornecedor = useMemo(() => categorias.filter((c) => !contagem.get(c.id)), [categorias, contagem]);
  const destaques = fornecedores.filter((f) => f.featured).slice(0, 8);
  const novos = [...fornecedores].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const linhas = comFornecedor.filter((c) => (contagem.get(c.id) || 0) >= 3).slice(0, 4);
  const cidades = useMemo(() => [...new Set(fornecedores.map((f) => f.city).filter(Boolean) as string[])].sort(), [fornecedores]);

  useEffect(() => {
    if (!buscaCat && comFornecedor[0]) setBuscaCat(comFornecedor[0].slug);
  }, [comFornecedor, buscaCat]);

  // busca livre (/buscar?q=...&loc=...)
  const resultados = useMemo(() => {
    if (!qParam && !locParam) return null;
    const q = normalizar(qParam);
    const l = normalizar(locParam);
    return fornecedores.filter(
      (f) =>
        (!q || normalizar(`${f.company_name} ${f.categories?.name || ""} ${f.description || ""}`).includes(q)) &&
        (!l || normalizar(`${f.city || ""} ${f.state || ""}`).includes(l)),
    );
  }, [fornecedores, qParam, locParam]);

  // ?cat= (ou ?q= igual ao nome de uma categoria) abre a página da categoria
  const pedido = catParam || qParam;
  const slugDestino = pedido && categorias.length ? resolverCategoriaSlug(pedido, categorias) : null;
  if (slugDestino) {
    const qs = locParam ? `?cidade=${encodeURIComponent(locParam)}` : "";
    return <Navigate to={`/categoria/${slugDestino}${qs}`} replace />;
  }

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buscaCat) return;
    const qs = buscaCidade.trim() ? `?cidade=${encodeURIComponent(buscaCidade.trim())}` : "";
    navigate(`/categoria/${buscaCat}${qs}`);
  };

  const seoTitulo = `Fornecedores de casamento${locParam ? ` em ${locParam}` : ""} — Casamenteiro`;
  const seoDescricao = `Encontre fornecedores de casamento${locParam ? ` em ${locParam}` : ""} no Casamenteiro. Veja fotos, compare preços e peça orçamento grátis, sem comissão.`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Fornecedores", path: "/explorar" },
    ]),
    ...(novos.length ? [itemListJsonLd(novos.map((s) => ({ name: s.company_name, path: `/fornecedor/${s.id}` })))] : []),
  ];

  return (
    <div className="vt">
      <SEO title={seoTitulo} description={seoDescricao} canonical={absoluteUrl("/explorar")} jsonLd={jsonLd} />
      <TopoVitrine ativo="fornecedores" />

      <CapaVitrine anuncios={anuncios} fotoPadrao={fotoPadrao} tipo="explorar">
        <div className="max-w-[640px]">
          <span className="vt-kicker">
            <ShieldCheck className="h-3.5 w-3.5" /> Orçamento grátis e sem comissão
          </span>
          <h1 className="mb-3.5 mt-4 text-[clamp(34px,5vw,58px)]">
            Os fornecedores do seu casamento, <em>num só lugar</em>
          </h1>
          <p className="max-w-[46ch] text-[17px] text-white/90">Veja fotos, compare preços e converse direto com quem vai fazer o seu dia acontecer.</p>
          <form className="vt-busca" onSubmit={buscar}>
            <label>
              O que vocês procuram?
              <select value={buscaCat} onChange={(e) => setBuscaCat(e.target.value)}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Onde vai ser?
              <input list="vt-cidades" placeholder="Cidade" autoComplete="off" value={buscaCidade} onChange={(e) => setBuscaCidade(e.target.value)} />
              <datalist id="vt-cidades">
                {cidades.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <button type="submit">
              <Search className="h-[18px] w-[18px]" /> Buscar
            </button>
          </form>
          {comFornecedor.length > 0 && (
            <div className="vt-atalhos">
              Mais procurados:
              {comFornecedor.slice(0, 4).map((c) => (
                <Link key={c.id} to={`/categoria/${c.slug}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </CapaVitrine>

      <main className="vt-wrap">
        {resultados && (
          <section className="vt-sec">
            <h2 className="vt-h2">
              Resultados {qParam ? <>para <em>“{qParam}”</em></> : null}
              {locParam ? <> em <em>{locParam}</em></> : null}
            </h2>
            <p className="mb-4 mt-1 text-sm text-[var(--vt-muted)]">
              {resultados.length} {resultados.length === 1 ? "fornecedor encontrado" : "fornecedores encontrados"}
            </p>
            {resultados.length ? (
              <div className="vt-grade">
                {resultados.map((f) => (
                  <CardFornecedor key={f.id} f={f} favorito={favoritos.has(f.id)} onFavoritar={alternar} destaque={f.featured} />
                ))}
              </div>
            ) : (
              <div className="vt-caixa text-[var(--vt-body)]">Nenhum fornecedor com esse nome ou cidade. Tente escolher uma categoria abaixo.</div>
            )}
          </section>
        )}

        <section className="vt-sec">
          <h2 className="vt-h2">
            Por <em>categoria</em>
          </h2>
          <p className="mb-4 mt-1 text-sm text-[var(--vt-muted)]">Toque para ver todos os fornecedores de cada uma.</p>
          {carregando ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
              {Array.from({ length: 5 }).map((_, k) => (
                <div key={k} className="h-[120px] animate-pulse rounded-[18px] bg-[#efe7dd]" />
              ))}
            </div>
          ) : (
            comFornecedor.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] sm:gap-3">
                {comFornecedor.map((c) => {
                  const Icone = iconesCategoria[c.icon || "building"] || Building;
                  const n = contagem.get(c.id) || 0;
                  return (
                    <Link key={c.id} to={`/categoria/${c.slug}`} className="vt-cat">
                      <span className="vt-ic">
                        <Icone className="h-[21px] w-[21px]" />
                      </span>
                      <b className="text-[15px] leading-tight">{c.name}</b>
                      <small className="text-[12.5px] font-semibold text-[var(--vt-muted)]">
                        {n} {n === 1 ? "fornecedor" : "fornecedores"}
                      </small>
                    </Link>
                  );
                })}
              </div>
            )
          )}
          {!carregando && semFornecedor.length > 0 && (
            <div className="vt-chegando">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Bell className="h-[18px] w-[18px] text-[var(--vt-star)]" /> Chegando em breve
              </span>
              <div className="flex min-w-[240px] flex-1 flex-wrap gap-1.5">
                {semFornecedor.map((c) => (
                  <Link key={c.id} to={`/categoria/${c.slug}`} className="rounded-full bg-[var(--vt-bg)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--vt-body)]">
                    {c.name}
                  </Link>
                ))}
              </div>
              <button type="button" className="vt-pill sm" onClick={() => setAvisoAberto(true)}>
                Avise-me quando chegar
              </button>
            </div>
          )}
        </section>

        {destaques.length > 0 && (
          <Trilho
            titulo={
              <>
                Em <em>destaque</em>
              </>
            }
            subtitulo="Fornecedores com destaque ativo no Casamenteiro."
          >
            {destaques.map((f) => (
              <CardFornecedor key={f.id} f={f} favorito={favoritos.has(f.id)} onFavoritar={alternar} destaque />
            ))}
          </Trilho>
        )}

        {novos.length > 0 && (
          <Trilho
            titulo={
              <>
                Novos no <em>Casamenteiro</em>
              </>
            }
            subtitulo="Os últimos fornecedores aprovados pela equipe."
          >
            {novos.map((f) => (
              <CardFornecedor key={f.id} f={f} favorito={favoritos.has(f.id)} onFavoritar={alternar} />
            ))}
          </Trilho>
        )}

        {linhas.map((c) => (
          <Trilho key={c.id} titulo={c.name} link={{ to: `/categoria/${c.slug}`, label: `Ver todos (${contagem.get(c.id)})` }}>
            {fornecedores
              .filter((f) => f.category_id === c.id)
              .slice(0, 8)
              .map((f) => (
                <CardFornecedor key={f.id} f={f} favorito={favoritos.has(f.id)} onFavoritar={alternar} destaque={f.featured} />
              ))}
          </Trilho>
        ))}

        <section className="vt-sec">
          <h2 className="vt-h2 mb-4">
            Como <em>funciona</em>
          </h2>
          <div className="grid gap-3.5 md:grid-cols-3">
            {[
              ["Encontre", "Filtre por categoria e cidade e veja fotos, preços e o que cada um oferece."],
              ["Peça orçamento grátis", "Conte a data e o número de convidados. O fornecedor responde no seu painel."],
              ["Feche direto com ele", "Sem comissão e sem intermediário. Depois, avalie para ajudar outros casais."],
            ].map(([t, d], k) => (
              <div key={t} className="vt-passo">
                <span className="vt-serif text-[30px] leading-none text-[var(--vt-terra)]">{k + 1}</span>
                <b className="mb-1 mt-2.5 block text-base">{t}</b>
                <p className="text-sm text-[var(--vt-body)]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vt-forn">
          <div>
            <h2 className="vt-h2 text-[clamp(22px,2.6vw,28px)]">
              Trabalha com <em>casamentos</em>?
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[var(--vt-body)]">
              Cadastre seu negócio grátis, apareça para casais da sua região e receba pedidos de orçamento. Sem comissão sobre o que você fechar.
            </p>
          </div>
          <Link to="/cadastro?tipo=supplier" className="vt-pill pri">
            Cadastrar meu negócio
          </Link>
        </section>
      </main>

      <RodapeVitrine />

      <Dialog open={avisoAberto} onOpenChange={setAvisoAberto}>
        <DialogContent className="vt max-w-lg rounded-2xl" style={{ minHeight: 0 }}>
          <DialogHeader>
            <DialogTitle className="vt-serif text-2xl">Avise-me quando chegar</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-[var(--vt-body)]">Escolha a categoria. Assim que aprovarmos o primeiro fornecedor, você recebe um aviso.</p>
          <AvisoCategoria categorias={semFornecedor} compacto />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Explore;
