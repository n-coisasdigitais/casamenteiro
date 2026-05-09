import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import PlanHeader, { PlanHeaderData } from "@/components/plan/PlanHeader";
import PlanKanban, { PlanSupplier, KanbanStatus } from "@/components/plan/PlanKanban";
import BudgetTab from "@/components/plan/BudgetTab";
import PaymentsTab, { PaymentRow } from "@/components/plan/PaymentsTab";
import AddExternalSupplierDialog from "@/components/plan/AddExternalSupplierDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function WeddingPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string>("");
  const [coupleName, setCoupleName] = useState<string>("");
  const [couple, setCouple] = useState<any>(null);
  const [items, setItems] = useState<PlanSupplier[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [newProposals, setNewProposals] = useState<{ id: string; title: string; body: string | null; link: string | null }[]>([]);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);

  const load = useCallback(async (cId: string) => {
    // 1. Couple suppliers + categoria
    const { data: cs } = await supabase
      .from("couple_suppliers")
      .select("id, supplier_id, category_id, kanban_status, status, estimated_value, proposed_value, contract_value, final_value, is_external, external_supplier_name, external_supplier_phone")
      .eq("couple_id", cId);
    const rows = cs || [];
    const supplierIds = Array.from(new Set(rows.map((r: any) => r.supplier_id).filter(Boolean)));
    const categoryIds = Array.from(new Set(rows.map((r: any) => r.category_id).filter(Boolean)));

    const [{ data: sups }, { data: cats }] = await Promise.all([
      supplierIds.length
        ? supabase.from("suppliers").select("id, company_name, category_id").in("id", supplierIds)
        : Promise.resolve({ data: [] as any[] }),
      categoryIds.length
        ? supabase.from("categories").select("id, slug, name").in("id", categoryIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const supMap = new Map((sups || []).map((s: any) => [s.id, s]));
    const catMap = new Map((cats || []).map((c: any) => [c.id, c]));

    const planItems: PlanSupplier[] = rows.map((r: any) => {
      const sup = r.supplier_id ? supMap.get(r.supplier_id) : null;
      const cat = catMap.get(r.category_id || sup?.category_id);
      const valor_contratado = Number(r.contract_value || r.final_value || 0);
      const valor_cotado = Number(r.proposed_value || 0);
      const valor_plano = Number(r.estimated_value || valor_cotado || valor_contratado || 0);
      // se status legado é 'contracted' mas kanban ainda nao_iniciado, normaliza
      let ks: KanbanStatus = (r.kanban_status as KanbanStatus) || "nao_iniciado";
      if (r.status === "contracted" && ks === "nao_iniciado") ks = "contratado";
      if (r.is_external) ks = (r.kanban_status as KanbanStatus) || "fora_da_plataforma";
      return {
        id: r.id,
        supplier_id: r.supplier_id,
        company_name: sup?.company_name || r.external_supplier_name || "Fornecedor",
        category_slug: cat?.slug || null,
        category_name: cat?.name || null,
        valor_plano,
        valor_cotado,
        valor_contratado,
        kanban_status: ks,
        is_external: !!r.is_external,
        external_phone: r.external_supplier_phone || null,
      };
    });
    setItems(planItems);

    // 2. Pagamentos via budget_items (precisamos do supplier_id)
    const { data: bis } = await supabase
      .from("budget_items").select("id, supplier_id").eq("couple_id", cId);
    const biMap = new Map((bis || []).map((b: any) => [b.id, b.supplier_id]));
    const { data: pays } = await supabase
      .from("budget_payments").select("*").eq("couple_id", cId);
    setPayments((pays || []).map((p: any) => ({ ...p, supplier_id: biMap.get(p.budget_item_id) || null })));

    // 2b. Solicitações de orçamento (quotes) — para mostrar na aba Orçamento como status inicial
    const { data: qs } = await supabase
      .from("quotes")
      .select("id, supplier_id, status, kanban_status, message, created_at, suppliers(company_name, category_id, categories(slug, name))")
      .eq("couple_id", cId);
    setQuotes((qs as any) || []);

    // 3. Notificações de propostas novas (não lidas)
    if (user) {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, title, body, link")
        .eq("user_id", user.id)
        .eq("type", "proposal_received")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      setNewProposals(notifs || []);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle();
      if (!c) { setLoading(false); return; }
      if (!c.onboarding_completed) { navigate("/onboarding"); return; }
      setCouple(c);
      setCoupleId(c.id);
      const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      setCoupleName([p?.full_name, c.partner_name].filter(Boolean).join(" & "));
      await load(c.id);
      setLoading(false);
    })();
  }, [user, navigate, load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader /><DashboardNav />
        <div className="container py-12 text-center text-muted-foreground">Carregando seu plano...</div>
      </div>
    );
  }

  if (!coupleId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader /><DashboardNav />
        <div className="container py-12 text-center text-muted-foreground">Plano não encontrado.</div>
      </div>
    );
  }

  // métricas do header
  const orcamentoTotal = Number(couple?.target_budget || couple?.estimated_budget || 0);
  const cotado = items.filter(i => i.valor_cotado > 0 && i.kanban_status !== "descartado").reduce((s, i) => s + i.valor_cotado, 0);
  const contratado = items.filter(i => i.kanban_status === "contratado").reduce((s, i) => s + i.valor_contratado, 0);
  const pendentes = payments.filter(p => p.status !== "paid");
  const aPagar = pendentes.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const prox = pendentes
    .filter(p => p.due_date)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];
  const proxFornecedor = prox ? items.find(i => i.supplier_id === prox.supplier_id)?.company_name || "Fornecedor" : "";
  const hasUrgent = pendentes.some(p => {
    if (!p.due_date) return false;
    const diff = (new Date(p.due_date + "T00:00:00").getTime() - today.getTime()) / 86400000;
    return diff <= 7;
  });

  const headerData: PlanHeaderData = {
    coupleName,
    weddingDate: couple?.wedding_date,
    city: couple?.wedding_city || null,
    guests: couple?.estimated_guests,
    style: couple?.wedding_style || null,
    orcamentoTotal,
    cotado,
    contratado,
    aPagar,
    proxVencimento: prox ? { data: prox.due_date!, fornecedor: proxFornecedor } : null,
    hasUrgent,
    newProposals,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <div className="container px-4 py-6 space-y-6">
        <PlanHeader data={headerData} />

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => setExternalDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Adicionar fornecedor externo
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum fornecedor no plano ainda. Faça uma simulação ou adicione fornecedores aos seus favoritos.
              </div>
            ) : (
              <PlanKanban coupleId={coupleId} items={items} onChange={() => load(coupleId)} />
            )}
            <AddExternalSupplierDialog
              open={externalDialogOpen}
              onOpenChange={setExternalDialogOpen}
              coupleId={coupleId}
              onAdded={() => load(coupleId)}
            />
          </TabsContent>

          <TabsContent value="orcamento" className="mt-6">
            <BudgetTab
              coupleId={coupleId}
              items={items}
              planoTotal={orcamentoTotal}
              onChange={() => load(coupleId)}
              quotes={quotes}
              contextoMensagem={{
                nomeCasal: coupleName,
                data: couple?.wedding_date ? new Date(couple.wedding_date + "T00:00:00").toLocaleDateString("pt-BR") : "",
                cidade: couple?.wedding_city || "",
                convidados: Number(couple?.estimated_guests || 0),
              }}
            />
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-6">
            <PaymentsTab payments={payments} items={items} onChange={() => load(coupleId)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}