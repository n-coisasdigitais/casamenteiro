import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import { absoluteUrl, itemListJsonLd } from "@/lib/seo";
import { cidadeSlug } from "@/lib/cidadeSlug";
import { Heart, Loader2, MapPin } from "lucide-react";

type Cidade = { cidade: string; uf: string | null; slug: string; total: number };

export default function CustoCasarIndex() {
  const [loading, setLoading] = useState(true);
  const [cidades, setCidades] = useState<Cidade[]>([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("city, state")
        .eq("status", "approved")
        .eq("is_demo", false);
      if (!ativo) return;
      const mapa = new Map<string, Cidade>();
      (data || []).forEach((s: any) => {
        if (!s.city) return;
        const slug = cidadeSlug(s.city, s.state);
        const atual = mapa.get(slug);
        if (atual) atual.total += 1;
        else mapa.set(slug, { cidade: s.city, uf: s.state, slug, total: 1 });
      });
      setCidades([...mapa.values()].sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Quanto custa casar? Preços por cidade | Casamenteiro"
        description="Guias de custo de casamento por cidade, com faixas de preço por categoria calculadas a partir de fornecedores reais cadastrados na plataforma."
        canonical={absoluteUrl("/quanto-custa-casar")}
        jsonLd={itemListJsonLd(
          cidades.map((c) => ({
            name: `Quanto custa casar em ${c.cidade}${c.uf ? ` (${c.uf})` : ""}`,
            path: `/quanto-custa-casar-em/${c.slug}`,
          })),
        )}
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
        <h1 className="text-3xl font-bold md:text-4xl">Quanto custa casar no Brasil</h1>
        <p className="mt-3 text-muted-foreground">
          Escolha sua cidade e veja as faixas de preço por categoria, calculadas com os valores
          informados pelos fornecedores cadastrados.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cidades.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Ainda não há cidades com dados suficientes.</p>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {cidades.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/quanto-custa-casar-em/${c.slug}`}
                  className="flex items-center gap-2 rounded-lg border p-4 transition hover:bg-muted/50"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {c.cidade}
                    {c.uf ? ` (${c.uf})` : ""}
                  </span>
                  <span className="ml-auto text-sm text-muted-foreground">{c.total} fornecedores</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
