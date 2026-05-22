import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Share2, Users, MousePointerClick, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { buildReferralUrl, getOrCreateReferralForCouple } from "@/lib/referral";

type Referral = { id: string; codigo: string; cliques: number; conversoes: number; ativo: boolean };
type Conversion = { id: string; tipo_conta: string; status: string; created_at: string };

export default function MeuCasamentoIndicacoes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data: couple } = await supabase
        .from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!couple) { setLoading(false); return; }
      try {
        const ref = await getOrCreateReferralForCouple(couple.id);
        if (ref) {
          setReferral(ref as Referral);
          const { data: conv } = await supabase
            .from("referral_conversions")
            .select("id, tipo_conta, status, created_at")
            .eq("referral_id", ref.id)
            .order("created_at", { ascending: false });
          setConversions(conv ?? []);
        }
      } catch (e: any) {
        toast.error("Erro ao carregar suas indicações");
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const url = referral ? buildReferralUrl(referral.codigo) : "";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Casamenteiro", text: "Use meu link para planejar seu casamento:", url }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <>
      <SEO title="Minhas indicações — Casamenteiro" noIndex />
      <Navbar />
      <main className="container mx-auto py-8 px-4 max-w-3xl">
        <h1 className="text-3xl font-serif mb-2">Indique o Casamenteiro</h1>
        <p className="text-muted-foreground mb-6">
          Compartilhe seu link com outros casais e fornecedores. Acompanhe quem se cadastrou pela sua indicação.
        </p>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !referral ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            Complete seu perfil de casal para gerar seu código.
          </CardContent></Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle>Seu link</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={url} readOnly className="font-mono text-sm" />
                  <Button onClick={copy} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                  <Button onClick={share}><Share2 className="h-4 w-4 mr-2" />Compartilhar</Button>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <Stat icon={MousePointerClick} label="Cliques" value={referral.cliques} />
                  <Stat icon={Users} label="Cadastros" value={referral.conversoes} />
                  <Stat icon={CheckCircle2} label="Ativos" value={conversions.filter(c => c.status === "ativo").length} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
              <CardContent>
                {conversions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma indicação ainda. Compartilhe seu link!</p>
                ) : (
                  <ul className="divide-y">
                    {conversions.map((c) => (
                      <li key={c.id} className="py-3 flex justify-between text-sm">
                        <span>{c.tipo_conta === "couple" ? "Casal" : "Fornecedor"} · {c.status}</span>
                        <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/40">
      <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}