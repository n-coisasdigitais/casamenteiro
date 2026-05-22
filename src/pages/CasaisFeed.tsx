import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HomeNavbar from "@/components/home/HomeNavbar";
import SEO from "@/components/SEO";
import { Heart, MapPin, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 12;

type Row = {
  id: string;
  slug: string;
  nome_casal: string;
  estilo: string | null;
  foto_capa_url: string | null;
  foto_perfil_url: string | null;
  exibir_data: boolean;
  couple_id: string;
  couples?: { wedding_date: string | null; wedding_city: string | null } | null;
};

export default function CasaisFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState<string>("todos");
  const sentinel = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (p: number, reset = false) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("couple_public_profiles")
      .select("id,slug,nome_casal,estilo,foto_capa_url,foto_perfil_url,exibir_data,couple_id,couples!inner(wedding_date,wedding_city)")
      .eq("publico", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (estilo && estilo !== "todos") query = query.eq("estilo", estilo);
    if (cidade.trim()) query = query.ilike("couples.wedding_city", `%${cidade.trim()}%`);
    const { data } = await query;
    const list = (data as any[] as Row[]) || [];
    setRows((prev) => (reset ? list : [...prev, ...list]));
    if (list.length < PAGE_SIZE) setDone(true);
    setLoading(false);
  }, [cidade, estilo]);

  useEffect(() => {
    setPage(0);
    setDone(false);
    fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => {
    if (done) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        const next = page + 1;
        setPage(next);
        fetchPage(next);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [done, loading, page, fetchPage]);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Casais no Casamenteiro | Inspire-se com casamentos reais"
        description="Conheça casais que estão organizando seus casamentos. Veja fotos, fornecedores contratados e avaliações reais."
        canonical="/casais"
      />
      <HomeNavbar />
      <div className="container py-10 px-4">
        <header className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif mb-2">Casais reais</h1>
          <p className="text-muted-foreground">Inspire-se com casamentos da nossa comunidade.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Select value={estilo} onValueChange={setEstilo}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="Estilo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estilos</SelectItem>
              <SelectItem value="intimista">Intimista</SelectItem>
              <SelectItem value="elegante">Elegante</SelectItem>
              <SelectItem value="grandioso">Grandioso</SelectItem>
              <SelectItem value="rustico">Rústico</SelectItem>
              <SelectItem value="praia">Praia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-12">Nenhum casal encontrado.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((r) => {
            const wedding = r.couples?.wedding_date ? parseISO(r.couples.wedding_date) : null;
            const isPast = wedding && wedding < new Date();
            return (
              <Link key={r.id} to={`/casais/${r.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/20 to-secondary/30">
                    {r.foto_capa_url && (
                      <img src={r.foto_capa_url} alt={r.nome_casal} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {isPast && (
                      <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">💍 Já casaram!</Badge>
                    )}
                    <div className="absolute -bottom-6 left-4">
                      <div className="w-14 h-14 rounded-full border-4 border-white bg-muted overflow-hidden">
                        {r.foto_perfil_url ? (
                          <img src={r.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10">
                            <Heart className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-8">
                    <h3 className="font-serif text-lg leading-tight">{r.nome_casal}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {r.exibir_data && wedding && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(wedding, "dd 'de' MMM yyyy", { locale: ptBR })}</span>
                      )}
                      {r.couples?.wedding_city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.couples.wedding_city}</span>
                      )}
                    </div>
                    {r.estilo && (
                      <Badge variant="outline" className="mt-2 capitalize">{r.estilo}</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {!done && (
          <div ref={sentinel} className="h-12 flex items-center justify-center mt-8">
            {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          </div>
        )}
      </div>
    </div>
  );
}