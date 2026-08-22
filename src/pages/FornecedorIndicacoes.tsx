import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import SupplierShell from "@/components/supplier/SupplierShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Loader2, Share2, Users } from "lucide-react";
import {
  BENEFICIO_ORIGEM_LABEL,
  BENEFICIO_STATUS_LABEL,
  INDICACAO_STATUS_LABEL,
  descreverBeneficio,
  linkIndicacaoFornecedor,
  listarBeneficios,
  listarIndicados,
  meuCodigoIndicacao,
  type Beneficio,
  type IndicadoRow,
  type MinhaIndicacao,
} from "@/lib/beneficios";

const CORES: Record<string, string> = {
  convidado: "bg-muted text-foreground",
  cadastro_incompleto: "bg-amber-100 text-amber-900",
  cadastro_completo: "bg-sky-100 text-sky-900",
  assinou: "bg-emerald-100 text-emerald-900",
};

export default function FornecedorIndicacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [ref, setRef] = useState<MinhaIndicacao | null>(null);
  const [indicados, setIndicados] = useState<IndicadoRow[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [regras, setRegras] = useState({ pct_cadastro: 10, pct_assinatura: 50 });

  useEffect(() => {
    if (!user) {
      navigate("/fornecedor/login");
      return;
    }
    (async () => {
      const { data: fornecedor } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (!fornecedor) {
        setCarregando(false);
        return;
      }
      const [r, bs, cfg] = await Promise.all([
        meuCodigoIndicacao(fornecedor.id),
        listarBeneficios(fornecedor.id),
        (supabase.from("system_settings" as any).select("value").eq("key", "indicacao_fornecedor").maybeSingle() as any),
      ]);
      setRef(r);
      setBeneficios(bs);
      const v = (cfg?.data as any)?.value;
      if (v) setRegras({ pct_cadastro: Number(v.pct_cadastro ?? 10), pct_assinatura: Number(v.pct_assinatura ?? 50) });
      if (r?.id) setIndicados(await listarIndicados(r.id));
      setCarregando(false);
    })();
  }, [user, navigate]);

  const link = ref ? linkIndicacaoFornecedor(ref.codigo) : "";

  const copiar = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Envie para outros fornecedores." });
  };

  const compartilhar = async () => {
    if (navigator.share) {
      await navigator
        .share({ title: "Casamenteiro para fornecedores", text: "Cadastre seu negócio no Casamenteiro:", url: link })
        .catch(() => null);
    } else copiar();
  };

  if (carregando) {
    return (
      <SupplierShell>
        <div className="container mx-auto px-4 py-16 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicações...
        </div>
      </SupplierShell>
    );
  }

  const assinaram = indicados.filter((i) => i.status === "assinou").length;
  const completos = indicados.filter((i) => i.status === "cadastro_completo").length;
  const beneficiosIndicacao = beneficios.filter((b) => b.origem === "indicacao");

  return (
    <SupplierShell>
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
        <SEO title="Indique e ganhe desconto | Casamenteiro" noIndex />

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Indique e ganhe desconto</h1>
          <p className="text-sm text-muted-foreground">
            Ganhe <strong>{regras.pct_cadastro}%</strong> de desconto quando o fornecedor indicado completa o cadastro e é
            aprovado, e <strong>{regras.pct_assinatura}%</strong> quando ele assina um plano. Os descontos entram na sua
            próxima cobrança e podem somar até 100% em um único mês.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" /> Seu link de indicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button variant="outline" onClick={copiar}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={compartilhar}>Compartilhar</Button>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{ref?.cliques ?? 0} cliques</span>
              <span>{indicados.length} indicados</span>
              <span>{completos} cadastros completos</span>
              <span>{assinaram} assinaram</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Meus indicados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {indicados.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">
                Nenhum fornecedor indicado ainda. Compartilhe seu link para começar.
              </p>
            )}
            {indicados.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 border-t pt-2 first:border-0 first:pt-0 flex-wrap"
              >
                <div>
                  <p className="font-medium">{i.indicado_nome || "Fornecedor indicado"}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {new Date(i.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {i.bonus_assinatura_credit_id && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
                      +{regras.pct_assinatura}%
                    </Badge>
                  )}
                  {i.bonus_cadastro_credit_id && !i.bonus_assinatura_credit_id && (
                    <Badge variant="secondary">+{regras.pct_cadastro}%</Badge>
                  )}
                  <Badge className={CORES[i.status] ?? "bg-muted text-foreground"}>
                    {INDICACAO_STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Meus descontos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {beneficios.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">Você ainda não tem descontos acumulados.</p>
            )}
            {beneficios.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 border-t pt-2 first:border-0 first:pt-0 flex-wrap"
              >
                <div>
                  <p className="font-medium">{descreverBeneficio(b)}</p>
                  <p className="text-xs text-muted-foreground">
                    {BENEFICIO_ORIGEM_LABEL[b.origem] ?? b.origem}
                    {b.motivo ? ` · ${b.motivo}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{BENEFICIO_STATUS_LABEL[b.status] ?? b.status}</Badge>
              </div>
            ))}
            {beneficiosIndicacao.length > 0 && (
              <p className="text-xs text-muted-foreground pt-2">
                Descontos acima de 100% em um mês ficam guardados para os meses seguintes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </SupplierShell>
  );
}
