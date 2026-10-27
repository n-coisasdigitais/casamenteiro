import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Building, ChevronDown, MapPin, Tag, Users } from "lucide-react";
import SEO from "@/components/SEO";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd, truncate } from "@/lib/seo";
import { useMyPlanSuppliers } from "@/hooks/useMyPlanSuppliers";
import { RodapeVitrine, TopoVitrine, useFavoritos } from "@/components/vitrine/VitrineLayout";
import CapaVitrine from "@/components/vitrine/CapaVitrine";
import CardFornecedor from "@/components/vitrine/CardFornecedor";
import AvisoCategoria from "@/components/vitrine/AvisoCategoria";
import { iconesCategoria } from "@/pages/Explore";
import {
  FOTO_PADRAO,
  carregarAnuncios,
  carregarCategorias,
  carregarFornecedores,
  carregarFotoInstitucional,
  normalizar,
  pluralCategoria,
  type Anuncio,
  type CategoriaVitrine,
  type FornecedorVitrine,
} from "@/lib/vitrine";

const FAIXAS_PRECO: Record<string, { label: string; min?: number; max?: number }> = {
  ate2: { label: "Até R$ 2.000", max: 2000 },
  "2a5": { label: "R$ 2.000 a R$ 5.000", min: 2000, max: 5000 },
  "5mais": { label: "Acima de R$ 5.000", min: 5000 },
};
const FAIXAS_CONV: Record<string, { label: string; min: number }> = {
  ate50: { label: "Até 50", min: 1 },
  "51a150": { label: "51 a 150", min: 51 },
  "150mais": { label: "Mais de 150", min: 151 },
};
const ORDENS: Record<string, string> = { rel: "Relevância", nota: "Mais bem avaliados", novos: "Mais novos", preco: "Menor preço" };

function Filtro({
  icone: Icone,
  rotulo,
  ativo,
  valor,
  opcoes,
  onChange,
}: {
  icone: any;
  rotulo: string;
  ativo: boolean;
  valor: string;
  opcoes: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <span className={`vt-fb ${ativo ? "on" : ""}`}>
      <Icone className="h-[15px] w-[15px]" />
      {rotulo}
      <ChevronDown className="h-[15px] w-[15px]" />
      <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label={rotulo}>
        {opcoes.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </span>
  );
}

export default function CategoriaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const planIds = useMyPlanSuppliers();
  const { favoritos, alternar } = useFavoritos();
  const [categoria, setCategoria] = useState<CategoriaVitrine | null>(null);
  const [categorias, setCategorias] = useState<CategoriaVitrine[]>([]);
  const [todos, setTodos] = useState<FornecedorVitrine[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [fotoPadrao, setFotoPadrao] = useState(FOTO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [naoAchou, setNaoAchou] = useState(false);

  const cidade = params.get("cidade") || "";
  const preco = params.get("preco") || "";
  const conv = params.get("conv") || "";
  const ordem = params.get("ordem") || "rel";
  const mudar = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v && !(k === "ordem" && v === "rel")) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setNaoAchou(false);
    setAnuncios([]);
    (async () => {
      const cats = await carregarCategorias();
      if (!vivo) return;
      setCategorias(cats);
      const cat = cats.find((c) => c.slug === slug) || null;
      if (!cat) {
        setNaoAchou(true);
        return;
      }
      setCategoria(cat);
      const [forns, anun] = await Promise.all([carregarFornecedores(), carregarAnuncios(cat.id)]);
      if (!vivo) return;
      setTodos(forns);
      setAnuncios(anun);
      setCarregando(false);
    })();
    carregarFotoInstitucional().then((f) => vivo && setFotoPadrao(f));
    return () => {
      vivo = false;
    };
  }, [slug]);

  const daCategoria = useMemo(() => (categoria ? todos.filter((f) => f.category_id === categoria.id) : []), [todos, categoria]);
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    todos.forEach((f) => f.category_id && m.set(f.category_id, (m.get(f.category_id) || 0) + 1));
    return m;
  }, [todos]);
  const cidades = useMemo(() => [...new Set(daCategoria.map((f) => f.city).filter(Boolean) as string[])].sort(), [daCategoria]);
  const temPreco = daCategoria.some((f) => f.price_min);
  const ehEspaco = !!categoria && /espaco|buffet/.test(categoria.slug);

  const itens = useMemo(() => {
    let l = daCategoria;
    if (cidade) l = l.filter((f) => normalizar(f.city).includes(normalizar(cidade)));
    const fp = FAIXAS_PRECO[preco];
    if (fp) l = l.filter((f) => f.price_min && (fp.min == null || Number(f.price_min) >= fp.min) && (fp.max == null || Number(f.price_min) <= fp.max));
    const fc = FAIXAS_CONV[conv];
    if (fc) l = l.filter((f) => !f.guest_max || f.guest_max >= fc.min);
    const pontuar = (f: FornecedorVitrine) => (f.featured ? 1000 : 0) + (f.review_count ? 10 + Number(f.rating || 0) : 0) + (f.price_min ? 3 : 0) + Math.min(f.fotos.length, 5);
    const copia = [...l];
    if (ordem === "nota") copia.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else if (ordem === "novos") copia.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (ordem === "preco") copia.sort((a, b) => Number(a.price_min || 9e12) - Number(b.price_min || 9e12));
    else copia.sort((a, b) => pontuar(b) - pontuar(a) || b.created_at.localeCompare(a.created_at));
    return copia;
  }, [daCategoria, cidade, preco, conv, ordem]);

  if (naoAchou) return <Navigate to="/explorar" replace />;

  const nome = categoria?.name || "";
  const plural = categoria ? pluralCategoria(categoria) : "";
  const total = daCategoria.length;
  const vazio = !carregando && total === 0;
  const filtrosAtivos = [cidade, preco, conv].filter(Boolean).length;
  const cidTxt = cidades.length ? (cidades.length <= 2 ? cidades.join(" e ") : `${cidades.length} cidades`) : "";
  const outras = categorias.filter((c) => c.id !== categoria?.id);
  const Icone = iconesCategoria[categoria?.icon || "building"] || Building;

  const seoTitulo = categoria ? `${nome} para casamento${cidade ? ` em ${cidade}` : ""} — Casamenteiro` : "Categoria — Casamenteiro";
  const seoDescricao = categoria
    ? truncate(`Encontre ${plural.toLowerCase()} para casamento no Casamenteiro. Compare fotos, preços e peça orçamento grátis, sem comissão.`)
    : "";
  const canonical = absoluteUrl(`/categoria/${slug}`);
  const jsonLd = categoria
    ? [
        breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: "Fornecedores", path: "/explorar" },
          { name: nome, path: `/categoria/${categoria.slug}` },
        ]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: `${nome} para casamento`, description: seoDescricao, url: canonical },
        itemListJsonLd(itens.slice(0, 20).map((s) => ({ name: s.company_name, path: `/fornecedor/${s.id}` }))),
      ]
    : undefined;

  return (
    <div className="vt">
      <SEO title={seoTitulo} description={seoDescricao} canonical={canonical} jsonLd={jsonLd} noIndex={vazio} />
      <TopoVitrine ativo="fornecedores" />

      <CapaVitrine anuncios={anuncios} fotoPadrao={fotoPadrao} tipo="categoria">
        <nav aria-label="Caminho" className="flex flex-wrap gap-1.5 pb-2 text-[12.5px] text-white/80">
          <Link to="/" className="hover:text-white">
            Início
          </Link>
          ›
          <Link to="/explorar" className="hover:text-white">
            Fornecedores
          </Link>
          ›<span className="text-white">{nome}</span>
        </nav>
        <h1 className="mb-2 mt-1.5 text-[clamp(34px,4.6vw,54px)]">
          {plural} <em>para casamento</em>
        </h1>
        <p className="max-w-[52ch] text-base text-white/90">
          {carregando
            ? " "
            : vazio
              ? `Estamos aprovando os primeiros ${plural.toLowerCase()} do Casamenteiro.`
              : `${total} ${total === 1 ? "fornecedor aprovado" : "fornecedores aprovados"}${cidTxt ? ` em ${cidTxt}` : ""}. Peça orçamento grátis, sem comissão.`}
        </p>
      </CapaVitrine>

      {!vazio && !carregando && (
        <div className="vt-filtros mt-[18px]">
          <div className="vt-wrap">
            <Filtro
              icone={MapPin}
              rotulo={cidade || "Cidade"}
              ativo={!!cidade}
              valor={cidades.includes(cidade) ? cidade : ""}
              opcoes={[["", "Todas as cidades"], ...cidades.map((c) => [c, c] as [string, string])]}
              onChange={(v) => mudar("cidade", v)}
            />
            {temPreco && (
              <Filtro
                icone={Tag}
                rotulo={FAIXAS_PRECO[preco]?.label || "Preço"}
                ativo={!!preco}
                valor={preco}
                opcoes={[["", "Qualquer preço"], ...Object.entries(FAIXAS_PRECO).map(([k, v]) => [k, v.label] as [string, string])]}
                onChange={(v) => mudar("preco", v)}
              />
            )}
            {ehEspaco && (
              <Filtro
                icone={Users}
                rotulo={FAIXAS_CONV[conv] ? `${FAIXAS_CONV[conv].label} convidados` : "Convidados"}
                ativo={!!conv}
                valor={conv}
                opcoes={[["", "Qualquer número"], ...Object.entries(FAIXAS_CONV).map(([k, v]) => [k, v.label] as [string, string])]}
                onChange={(v) => mudar("conv", v)}
              />
            )}
            <Filtro
              icone={ArrowUpDown}
              rotulo={ORDENS[ordem] || ORDENS.rel}
              ativo={false}
              valor={ordem}
              opcoes={Object.entries(ORDENS) as [string, string][]}
              onChange={(v) => mudar("ordem", v)}
            />
            {filtrosAtivos > 0 && (
              <button
                type="button"
                className="flex-none text-[13.5px] font-bold text-[var(--vt-clay)] underline underline-offset-4"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Limpar filtros
              </button>
            )}
            <span className="ml-auto flex-none pl-2 text-[13.5px] text-[var(--vt-muted)]">
              {itens.length} {itens.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
        </div>
      )}

      <main className="vt-wrap pt-5">
        {carregando ? (
          <div className="vt-grade">
            {Array.from({ length: 6 }).map((_, k) => (
              <div key={k} className="space-y-2">
                <div className="aspect-[4/3] animate-pulse rounded-[18px] bg-[#efe7dd]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#efe7dd]" />
              </div>
            ))}
          </div>
        ) : vazio ? (
          <>
            <section className="vt-caixa grid items-center gap-7 p-[clamp(24px,5vw,48px)] md:grid-cols-[auto_minmax(0,1fr)]">
              <span className="grid h-[120px] w-[120px] place-items-center rounded-[32px] bg-[var(--vt-amber)] text-[var(--vt-star)]">
                <Icone className="h-[54px] w-[54px]" />
              </span>
              <div>
                <h2 className="vt-h2">
                  Ainda não temos <em>{plural.toLowerCase()}</em> por aqui
                </h2>
                <p className="mb-4 mt-2 max-w-[56ch] text-[var(--vt-body)]">
                  Estamos conferindo os primeiros cadastros desta categoria. Deixe seu contato que avisamos assim que tiver opções na sua região.
                </p>
                {categoria && <AvisoCategoria categoriaFixa={categoria} />}
                <p className="mt-4 text-sm text-[var(--vt-body)]">
                  Trabalha com {nome.toLowerCase()}?{" "}
                  <Link to="/cadastro?tipo=supplier" className="font-bold text-[var(--vt-clay)] underline underline-offset-4">
                    Seja um dos primeiros, o cadastro é grátis
                  </Link>
                  .
                </p>
              </div>
            </section>
            {outras.some((c) => contagem.get(c.id)) && (
              <section className="vt-sec">
                <h2 className="vt-h2 mb-4">
                  Enquanto isso, <em>já tem</em>
                </h2>
                <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                  {outras
                    .filter((c) => contagem.get(c.id))
                    .map((c) => {
                      const I = iconesCategoria[c.icon || "building"] || Building;
                      const n = contagem.get(c.id) || 0;
                      return (
                        <Link key={c.id} to={`/categoria/${c.slug}`} className="vt-cat">
                          <span className="vt-ic">
                            <I className="h-[21px] w-[21px]" />
                          </span>
                          <b>{c.name}</b>
                          <small className="text-[12.5px] font-semibold text-[var(--vt-muted)]">
                            {n} {n === 1 ? "fornecedor" : "fornecedores"}
                          </small>
                        </Link>
                      );
                    })}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {itens.length ? (
              <div className="vt-grade">
                {itens.map((f) => (
                  <CardFornecedor
                    key={f.id}
                    f={f}
                    favorito={favoritos.has(f.id)}
                    onFavoritar={alternar}
                    mostrarCategoria={false}
                    mostrarDescricao
                    destaque={f.featured}
                    selo={planIds.has(f.id) ? "No seu plano" : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="vt-caixa flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="vt-serif text-[21px]">Nenhum resultado com esses filtros</h3>
                  <p className="mt-1 text-sm text-[var(--vt-body)]">Tente outra cidade ou limpe os filtros.</p>
                </div>
                <button type="button" className="vt-pill" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Limpar filtros
                </button>
              </div>
            )}

            {total > 0 && total < 4 && categoria && (
              <div className="vt-caixa mt-8 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <h3 className="vt-serif text-[21px]">Ainda são poucas opções por aqui</h3>
                  <p className="mt-1 text-sm text-[var(--vt-body)]">
                    Novos {plural.toLowerCase()} entram toda semana. Quer que a gente te avise quando chegar alguém na sua cidade?
                  </p>
                </div>
                <div className="md:col-span-2">
                  <AvisoCategoria categoriaFixa={categoria} compacto />
                </div>
              </div>
            )}
          </>
        )}

        {!carregando && (
          <section className="vt-sec">
            <h2 className="vt-h2 mb-4">
              Dicas para <em>escolher bem</em>
            </h2>
            <div className="grid gap-3.5 md:grid-cols-3">
              {[
                ["Confirme a data primeiro", "Antes de comparar preço, pergunte se a data de vocês está livre. É o que mais elimina opções."],
                ["Peça 3 orçamentos", "Com a mesma data e o mesmo número de convidados fica fácil comparar o que cada um inclui."],
                ["Leia o que está incluso", "Deslocamento, horas extras e equipe costumam ficar de fora. Pergunte antes de fechar."],
              ].map(([t, d]) => (
                <div key={t} className="vt-dica">
                  <b className="mb-1 block text-[15px]">{t}</b>
                  <p className="text-sm text-[var(--vt-body)]">{d}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!carregando && !vazio && outras.length > 0 && (
          <section className="vt-sec">
            <h2 className="vt-h2 mb-4">
              Outras <em>categorias</em>
            </h2>
            <div className="flex flex-wrap gap-2">
              {outras.map((c) => (
                <Link key={c.id} to={`/categoria/${c.slug}`} className="vt-chip">
                  {c.name} <small className="font-semibold text-[var(--vt-muted)]">{contagem.get(c.id) || "em breve"}</small>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <RodapeVitrine />
    </div>
  );
}
