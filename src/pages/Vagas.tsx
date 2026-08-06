import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Search, Briefcase } from "lucide-react";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import { absoluteUrl } from "@/lib/seo";
import PublicJobCard, { type PublicJob } from "@/components/staff/PublicJobCard";

/**
 * Vitrine PÚBLICA de vagas (staffing) — "site de vagas de emprego".
 * Qualquer pessoa (deslogada) vê as vagas abertas. Candidatar exige login:
 * mandamos para o cadastro de profissional com retorno para esta página.
 * A RLS staff_jobs_public_select (is_public + status='aberta') já libera anon.
 */
export default function Vagas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [funcao, setFuncao] = useState("todas");
  const [ordem, setOrdem] = useState<"data" | "valor_desc" | "valor_asc">("data");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("staff_jobs" as any) as any)
        .select(
          "id, funcao, data, hora_inicio, hora_fim, cidade, local, vagas, valor_turno, supplier:suppliers(company_name)",
        )
        .eq("is_public", true)
        .eq("status", "aberta")
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data", { ascending: true });
      setJobs((data || []) as PublicJob[]);
      setLoading(false);
    })();
  }, []);

  const funcoes = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.funcao && set.add(j.funcao));
    return Array.from(set).sort();
  }, [jobs]);

  const view = useMemo(() => {
    let list = [...jobs];
    const q = busca.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          (j.funcao || "").toLowerCase().includes(q) ||
          (j.cidade || j.local || "").toLowerCase().includes(q) ||
          (j.supplier?.company_name || "").toLowerCase().includes(q),
      );
    }
    if (funcao !== "todas") list = list.filter((j) => j.funcao === funcao);
    if (ordem === "valor_desc") list.sort((a, b) => (b.valor_turno ?? 0) - (a.valor_turno ?? 0));
    else if (ordem === "valor_asc") list.sort((a, b) => (a.valor_turno ?? 0) - (b.valor_turno ?? 0));
    else list.sort((a, b) => (a.data > b.data ? 1 : -1));
    return list;
  }, [jobs, busca, funcao, ordem]);

  const candidatar = (job: PublicJob) => {
    if (user) {
      // logado: vai para o painel do profissional (onde a candidatura acontece)
      navigate("/profissional/painel");
    } else {
      // deslogado: cadastro com retorno para esta vaga
      navigate(`/profissional/cadastro?next=/vagas`);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Vagas em casamentos e eventos — Casamenteiro"
        description="Vagas abertas de garçom, cerimonial, apoio e mais em casamentos e eventos. Candidate-se e monte sua agenda."
        canonical={absoluteUrl("/vagas")}
      />
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Casamenteiro</span>
          </Link>
          {user ? (
            <UserMenu />
          ) : (
            <div className="flex gap-2">
              <Link to="/profissional/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/profissional/cadastro">
                <Button size="sm">Sou profissional</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-3">
            <Briefcase className="h-5 w-5" />
            <span className="label-ui">Vagas de eventos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Vagas abertas em casamentos e eventos</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Garçom, cerimonial, apoio, limpeza e mais. Veja as vagas abertas perto de você e candidate-se — o pagamento
            é combinado direto com o fornecedor, sem taxa de plataforma.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por função, cidade ou fornecedor"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todas">Todas as funções</option>
            {funcoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="data">Data (mais próxima)</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : view.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Nenhuma vaga aberta no momento com esses filtros.</p>
            <Link to="/profissional/cadastro">
              <Button>Criar meu perfil para receber convites</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {view.map((job) => (
              <PublicJobCard key={job.id} job={job} onCandidatar={candidatar} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
