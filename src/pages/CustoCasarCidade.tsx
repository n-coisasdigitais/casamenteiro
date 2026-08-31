import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { cidadeSlug, formatarBRL } from "@/lib/cidadeSlug";
import { Loader2, MapPin, Calculator, Search, Heart } from "lucide-react";

type Fornecedor = {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  price_min: number | null;
  price_max: number | null;
  pricing_model: string;
  category_id: string | null;
};

type LinhaCategoria = {
  categoria: string;
  slug: string | null;
  qtd: number;
  min: number;
  max: number;
};

export default function CustoCasarCidade() {
  const { cidade: slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Record<string, { name: string; slug: string | null }>>({});

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const [{ data: sups }, { data: cats }] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, company_name, city, state, price_min, price_max, pricing_model, category_id")
          .eq("status", "approved")
          .eq("is_demo", false),
        supabase.from("categories").select("id, name, slug"),
      ]);
      if (!ativo) return;
      const mapa: Record<string, { name: string; slug: string | null }> = {};
      (cats || []).forEach((c: any) => (mapa[c.id] = { name: c.name, slug: c.slug }));
      setCategorias(mapa);
      setFornecedores(((sups || []) as Fornecedor[]).filter((s) => s.city));
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const daCidade = useMemo(
    () => fornecedores.filter((f) => cidadeSlug(f.city || "", f.state) === slug),
    [fornecedores, slug],
  );

  const nomeCidade = daCidade[0]?.city || (slug || "").replace(/-/g, " ");
  const uf = daCidade[0]?.state || "";
  const rotulo = uf ? `${nomeCidade} (${uf})` : nomeCidade;

  const linhas: LinhaCategoria[] = useMemo(() => {
    const grupos = new Map<string, Fornecedor[]>();
    daCidade.forEach((f) => {
      const key = f.category_id || "outros";
      grupos.set(key, [...(grupos.get(key) || []), f]);
    });
    const out: LinhaCategoria[] = [];
    grupos.forEach((itens, key) => {
      const mins = itens.map((i) => i.price_min).filter((v): v is number => !!v);
      const maxs = itens.map((i) => i.price_max).filter((v): v is number => !!v);
      if (!mins.length && !maxs.length) return;
      const media = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      out.push({
        categoria: categorias[key]?.name || "Outros serviços",
        slug: categorias[key]?.slug || null,
        qtd: itens.length,
        min: mins.length ? media(mins) : media(maxs),
        max: maxs.length ? media(maxs) : media(mins),
      });
    });
    return out.sort((a, b) => b.max - a.max);
  }, [daCidade, categorias]);

  const totalMin = linhas.reduce((a, l) => a + l.min, 0);
  const totalMax = linhas.reduce((a, l) => a + l.max, 0);
  const temDados = linhas.length > 0;

  const titulo = `Quanto custa casar em ${rotulo}? Preços 2026 | Casamenteiro`;
  const descricao = temDados
    ? `Casar em ${rotulo} custa entre ${formatarBRL(totalMin)} e ${formatarBRL(totalMax)} segundo ${daCidade.length} fornecedores cadastrados. Veja preços por categoria e simule seu orçamento.`
    : `Veja quanto custa casar em ${rotulo}: faixas de preço por categoria, fornecedores locais e simulador de orçamento gratuito.`;

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Quanto custa um casamento em ${rotulo}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: temDados
            ? `Com base nos fornecedores cadastrados no Casamenteiro, um casamento em ${rotulo} fica entre ${formatarBRL(totalMin)} e ${formatarBRL(totalMax)}, variando conforme número de convidados e categorias contratadas.`
            : `O custo varia conforme número de convidados, local e serviços contratados. Use o simulador gratuito do Casamenteiro para uma estimativa personalizada.`,
        },
      },
      {
        "@type": "Question",
        name: `Qual é o maior gasto de um casamento em ${rotulo}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: linhas[0]
            ? `Normalmente ${linhas[0].categoria}, com média entre ${formatarBRL(linhas[0].min)} e ${formatarBRL(linhas[0].max)}.`
            : "Em geral, espaço/local e buffet concentram a maior parte do orçamento.",
        },
      },
      {
        "@type": "Question",
        name: "Como reduzir o custo do casamento?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reduzir a lista de convidados, casar fora de sábado e aproveitar datas ociosas de fornecedores são as formas mais eficazes de economizar.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={titulo}
        description={descricao}
        canonical={absoluteUrl(`/quanto-custa-casar-em/${slug}`)}
        jsonLd={[
          faq,
          breadcrumbJsonLd([
            { name: "Início", url: absoluteUrl("/") },
            { name: "Quanto custa casar", url: absoluteUrl("/quanto-custa-casar") },
            { name: rotulo, url: absoluteUrl(`/quanto-custa-casar-em/${slug}`) },
          ]),
        ]}
      />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Heart className="h-5 w-5 text-primary" />
            Casamenteiro
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Início
          </Link>{" "}
          /{" "}
          <Link to="/quanto-custa-casar" className="hover:underline">
            Quanto custa casar
          </Link>{" "}
          / <span>{rotulo}</span>
        </nav>

        <h1 className="text-3xl font-bold md:text-4xl">Quanto custa casar em {rotulo}?</h1>
        <p className="mt-3 flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" /> Estimativas construídas a partir dos preços informados por
          fornecedores reais da região.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {temDados && (
              <Card className="mt-8">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Faixa estimada total</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatarBRL(totalMin)} – {formatarBRL(totalMax)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Média de {daCidade.length} fornecedores cadastrados em {rotulo}.
                  </p>
                </CardContent>
              </Card>
            )}

            {temDados ? (
              <section className="mt-8">
                <h2 className="text-xl font-semibold">Preço médio por categoria</h2>
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Fornecedores</th>
                        <th className="p-3">Faixa média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((l) => (
                        <tr key={l.categoria} className="border-t">
                          <td className="p-3 font-medium">
                            {l.slug ? (
                              <Link to={`/categoria/${l.slug}`} className="hover:underline">
                                {l.categoria}
                              </Link>
                            ) : (
                              l.categoria
                            )}
                          </td>
                          <td className="p-3">{l.qtd}</td>
                          <td className="p-3">
                            {formatarBRL(l.min)} – {formatarBRL(l.max)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <p className="mt-8 text-muted-foreground">
                Ainda não temos fornecedores suficientes cadastrados em {rotulo} para calcular médias.
                Use o simulador para estimar seu orçamento.
              </p>
            )}

            <section className="mt-10 space-y-3 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">O que mais influencia o custo</h2>
              <p>
                O número de convidados é o fator de maior impacto: buffet, bebidas, convites e mobiliário
                escalam por pessoa. Em seguida vêm a data (sábados e alta temporada custam mais) e o
                local da celebração.
              </p>
              <p>
                Datas ociosas de fornecedores em {rotulo} costumam sair bem abaixo da tabela — vale
                acompanhar as ofertas na plataforma antes de fechar contratos.
              </p>
            </section>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/simulador">
                  <Calculator className="mr-2 h-4 w-4" /> Simular meu orçamento
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/buscar">
                  <Search className="mr-2 h-4 w-4" /> Ver fornecedores em {rotulo}
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
