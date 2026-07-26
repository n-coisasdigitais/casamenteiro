import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Sparkles, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatarData } from "@/lib/reservas";

type Casal = { id: string; partner_name: string | null; wedding_city: string | null; data_pretendida: string | null };
type PromoDate = { id: string; supplier_id: string; date: string; discount_pct: number | null; suppliers?: { company_name?: string | null; city?: string | null; category_id?: string | null } | null };

export default function AdminIdleDates() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [casais, setCasais] = useState<Casal[]>([]);
  const [promos, setPromos] = useState<PromoDate[]>([]);
  const [tab, setTab] = useState<"casais" | "datas" | "cruzamento">("casais");

  const load = async () => {
    const { data: c } = await (supabase.from("couples")
      .select("id, partner_name, wedding_city, data_pretendida")
      .eq("quer_datas_ociosas", true)
      .order("data_pretendida", { ascending: true, nullsFirst: false }) as any);
    setCasais((c as any[]) || []);

    const { data: p } = await (supabase.from("supplier_promo_dates" as any)
      .select("id, supplier_id, date, discount_pct, suppliers(company_name, city, category_id)")
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .limit(200) as any);
    setPromos((p as PromoDate[]) || []);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      load();
    });
  }, [user, authLoading, navigate]);

  // Cruzamento: matches por data exata + cidade
  const matches = promos.flatMap(p => {
    const compat = casais.filter(c =>
      c.data_pretendida === p.date &&
      (!c.wedding_city || !p.suppliers?.city || c.wedding_city.toLowerCase() === p.suppliers.city.toLowerCase())
    );
    return compat.length ? [{ promo: p, casais: compat }] : [];
  });

  const notificar = async (promoDateRow: PromoDate, casal: Casal) => {
    if (!casal || !promoDateRow.suppliers) return;
    // grava histórico e cria notificação para o casal
    const { data: coupleRow } = await supabase.from("couples").select("user_id").eq("id", casal.id).maybeSingle();
    if (!coupleRow?.user_id) return;
    await (supabase.from("idle_match_notifications" as any) as any).insert({
      couple_id: casal.id, supplier_id: promoDateRow.supplier_id, promo_date: promoDateRow.date, direcao: "fornecedor_para_casal",
    });
    await (supabase.from("notifications" as any) as any).insert({
      user_id: coupleRow.user_id,
      type: "match_data_ociosa",
      title: "Encontramos uma data com desconto!",
      body: `${promoDateRow.suppliers.company_name} tem ${formatarData(promoDateRow.date)} disponível com desconto de ${promoDateRow.discount_pct || 0}%.`,
      link: `/fornecedor/${promoDateRow.supplier_id}`,
    });
    toast({ title: "Casal notificado" });
  };

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Datas ociosas</span>
          </div>
        </div>
      </header>
      <main className="container py-6 max-w-6xl">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="casais">Casais interessados ({casais.length})</TabsTrigger>
            <TabsTrigger value="datas">Datas promocionais ({promos.length})</TabsTrigger>
            <TabsTrigger value="cruzamento">Cruzamento ({matches.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="casais" className="mt-4 space-y-2">
            {casais.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum casal ativou interesse em datas com desconto.</p>}
            {casais.map(c => (
              <Card key={c.id}>
                <CardContent className="py-3 text-sm flex justify-between items-center">
                  <div>
                    <strong>{c.partner_name || "Casal"}</strong>
                    <span className="text-muted-foreground"> · {c.wedding_city || "cidade não informada"}</span>
                  </div>
                  <div className="text-xs">
                    {c.data_pretendida ? <>Data pretendida: <strong>{formatarData(c.data_pretendida)}</strong></> : "Sem data preferida"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="datas" className="mt-4 space-y-2">
            {promos.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma data promocional publicada.</p>}
            {promos.map(p => (
              <Card key={p.id}>
                <CardContent className="py-3 text-sm flex justify-between items-center">
                  <div>
                    <strong>{p.suppliers?.company_name || "Fornecedor"}</strong>
                    <span className="text-muted-foreground"> · {p.suppliers?.city || "?"}</span>
                  </div>
                  <div className="text-xs">{formatarData(p.date)} · {p.discount_pct || 0}% off</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cruzamento" className="mt-4 space-y-3">
            {matches.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum match automático encontrado hoje.</p>}
            {matches.map(({ promo, casais: cs }) => (
              <Card key={promo.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {formatarData(promo.date)} · {promo.suppliers?.company_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {cs.map(c => (
                    <div key={c.id} className="flex justify-between items-center border-t pt-2">
                      <span>{c.partner_name || "Casal"} · {c.wedding_city}</span>
                      <Button size="sm" variant="outline" onClick={() => notificar(promo, c)}>
                        <Megaphone className="h-3 w-3 mr-1" /> Notificar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}