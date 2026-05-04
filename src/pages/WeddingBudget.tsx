import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import BudgetChart from "@/components/BudgetChart";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import QuotesKanban from "@/components/QuotesKanban";
import { useToast } from "@/hooks/use-toast";

type BudgetItem = {
  id: string;
  category: string;
  description: string;
  estimated_cost: number;
  final_cost: number | null;
  status: string;
  supplier_id: string | null;
};

type BudgetPayment = {
  id: string;
  budget_item_id: string;
  amount: number;
  payment_date: string;
  due_date: string | null;
  status: string;
  description: string | null;
};

type Supplier = {
  id: string;
  company_name: string;
};

type CoupleData = {
  id: string;
  onboarding_completed: boolean;
  partner_name?: string | null;
  header_photo_url?: string | null;
  header_quote?: string | null;
  target_budget?: number | null;
  budget_mode?: string | null;
  estimated_budget?: number | null;
  wedding_date?: string | null;
};

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function WeddingBudget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [simBudget, setSimBudget] = useState<number | null>(null);
  const [coupleName, setCoupleName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (!data.onboarding_completed) { navigate("/onboarding"); return; }
      setCouple(data as any);
      loadBudgetData(data.id);
      // última simulação para modo "simulation" (por couple_id ou user_id)
      (supabase as any)
        .from("home_simulacoes")
        .select("orcamento_total, criado_em")
        .or(`couple_id.eq.${data.id},user_id.eq.${user.id}`)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: s }: any) => setSimBudget(s?.orcamento_total ? Number(s.orcamento_total) : null));
      // nome do casal para header
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle().then(({ data: p }) => {
        const me = p?.full_name || "";
        setCoupleName([me, (data as any).partner_name].filter(Boolean).join(" & "));
      });
    });
  }, [user, navigate]);

  const loadBudgetData = async (coupleId: string) => {
    setLoading(true);
    const [itemsRes, paymentsRes] = await Promise.all([
      supabase.from("budget_items").select("*").eq("couple_id", coupleId),
      supabase.from("budget_payments").select("*").eq("couple_id", coupleId),
    ]);

    const items = itemsRes.data || [];
    setBudgetItems(items);
    setPayments(paymentsRes.data || []);

    // Carrega informações dos fornecedores
    const supplierIds = new Set(items.filter(i => i.supplier_id).map(i => i.supplier_id));
    if (supplierIds.size > 0) {
      const suppliersRes = await supabase.from("suppliers").select("id, company_name").in("id", Array.from(supplierIds));
      const suppliersMap = (suppliersRes.data || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, Supplier>);
      setSuppliers(suppliersMap);
    }

    setLoading(false);
  };

  const estimatedTotal = budgetItems.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
  const finalTotal = budgetItems.reduce((sum, item) => sum + Number(item.final_cost || 0), 0);
  const balance = estimatedTotal - finalTotal;

  // Meta de orçamento (fixa do cadastro ou pela última simulação)
  const mode = couple?.budget_mode || "fixed";
  const target =
    mode === "simulation"
      ? (simBudget ?? Number(couple?.target_budget || couple?.estimated_budget || 0))
      : Number(couple?.target_budget || couple?.estimated_budget || 0);
  const spent = finalTotal || estimatedTotal;
  const remaining = target - spent;
  const usedPct = target > 0 ? Math.min((spent / target) * 100, 100) : 0;

  // Agrupar por categoria para o gráfico
  const categoryData = budgetItems.reduce((acc, item) => {
    const existing = acc.find(c => c.name === item.category);
    if (existing) {
      existing.value += Number(item.final_cost || item.estimated_cost || 0);
    } else {
      acc.push({
        name: item.category,
        value: Number(item.final_cost || item.estimated_cost || 0),
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  const handleAddExpense = async () => {
    await loadBudgetData(couple!.id);
    setExpenseDialogOpen(false);
    toast({
      title: "Despesa adicionada",
      description: "Sua despesa foi registrada com sucesso.",
    });
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    await supabase.from("budget_payments").update({ status: "paid" }).eq("id", paymentId);
    await loadBudgetData(couple!.id);
    toast({
      title: "Pagamento marcado",
      description: "Status atualizado para pago.",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />

      <div className="container px-4 py-8">
        {/* Header do orçamento (cor fixa para boa leitura dos valores) */}
        <div className="rounded-2xl overflow-hidden mb-8 bg-primary text-primary-foreground">
          <div className="px-6 py-8 md:py-10">
            <p className="text-xs uppercase tracking-wider opacity-80">Nosso orçamento</p>
            <h1 className="text-2xl md:text-3xl font-serif mt-1">{coupleName || "Meu Grande Dia"}</h1>
            <div className="mt-6 flex flex-wrap gap-6 items-end">
              <div>
                <p className="text-xs opacity-80">Meta</p>
                <p className="text-2xl font-bold">R$ {target.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                <p className="text-xs opacity-70">{mode === "simulation" ? "Pela última simulação" : "Definida no cadastro"}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Gasto/comprometido</p>
                <p className="text-2xl font-bold">R$ {spent.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Saldo</p>
                <p className="text-2xl font-bold">R$ {remaining.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="ml-auto">
                <Button asChild variant="secondary" size="sm">
                  <a href="/perfil">Editar meta</a>
                </Button>
              </div>
            </div>
            {target > 0 && (
              <div className="mt-4 max-w-2xl">
                <Progress value={usedPct} className="h-2 bg-primary-foreground/20" />
                <p className="text-xs mt-1 opacity-80">{usedPct.toFixed(0)}% da meta</p>
              </div>
            )}
          </div>
        </div>

        {/* Kanban de Orçamentos */}
        {couple && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">Orçamentos enviados</h2>
                <p className="text-sm text-muted-foreground">Arraste pelo status ou aguarde a resposta do fornecedor</p>
              </div>
            </div>
            <QuotesKanban coupleId={couple.id} />
          </div>
        )}

        {/* Painel Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {estimatedTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Custo Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {finalTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                R$ {balance.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoryData.length}</div>
              <p className="text-xs text-muted-foreground">Orçamentos criados</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Pizza */}
        {categoryData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento por Categoria */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detalhamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryData.map((category) => {
              const items = budgetItems.filter(i => i.category === category.name);
              const spent = items.reduce((sum, i) => sum + Number(i.final_cost || 0), 0);
              const estimated = items.reduce((sum, i) => sum + Number(i.estimated_cost || 0), 0);
              const percentage = estimated > 0 ? (spent / estimated) * 100 : 0;
              
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium capitalize">{category.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      R$ {spent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / R$ {estimated.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">{items.length} itens</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Abas de Fornecedores e Pagamentos */}
        <Card>
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-b">
              <TabsTrigger value="items">Despesas</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            </TabsList>

            {/* Aba Despesas */}
            <TabsContent value="items" className="mt-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Despesas Registradas</CardTitle>
                <Button onClick={() => setExpenseDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Despesa
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium">Descrição</th>
                        <th className="text-left py-2 px-2 font-medium">Categoria</th>
                        <th className="text-right py-2 px-2 font-medium">Estimado</th>
                        <th className="text-right py-2 px-2 font-medium">Gasto</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma despesa registrada. Comece criando uma!
                          </td>
                        </tr>
                      ) : (
                        budgetItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2">{item.description}</td>
                            <td className="py-2 px-2 capitalize">{item.category}</td>
                            <td className="text-right py-2 px-2">
                              R$ {Number(item.estimated_cost).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-right py-2 px-2">
                              {item.final_cost ? (
                                <span className="text-destructive font-medium">
                                  R$ {Number(item.final_cost).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant={item.status === "paid" ? "default" : item.status === "contracted" ? "secondary" : "outline"}>
                                {item.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </TabsContent>

            {/* Aba Pagamentos */}
            <TabsContent value="payments" className="mt-0">
              <CardHeader>
                <CardTitle>Controle de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium">Descrição</th>
                        <th className="text-right py-2 px-2 font-medium">Valor</th>
                        <th className="text-left py-2 px-2 font-medium">Vencimento</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                        <th className="text-left py-2 px-2 font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum pagamento registrado
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2">{payment.description || "-"}</td>
                            <td className="text-right py-2 px-2 font-medium">
                              R$ {Number(payment.amount).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2">
                              {payment.due_date ? new Date(payment.due_date).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant={payment.status === "paid" ? "default" : payment.status === "overdue" ? "destructive" : "secondary"}>
                                {payment.status === "paid" ? "Pago" : payment.status === "overdue" ? "Vencido" : "Pendente"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2">
                              {payment.status !== "paid" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(payment.id)}
                                >
                                  Marcar como pago
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </TabsContent>

            {/* Aba Fornecedores */}
            <TabsContent value="suppliers" className="mt-0">
              <CardHeader>
                <CardTitle>Fornecedores Associados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium">Fornecedor</th>
                        <th className="text-left py-2 px-2 font-medium">Categoria</th>
                        <th className="text-right py-2 px-2 font-medium">Valor Proposta</th>
                        <th className="text-right py-2 px-2 font-medium">Gasto</th>
                        <th className="text-right py-2 px-2 font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.filter(i => i.supplier_id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum fornecedor associado
                          </td>
                        </tr>
                      ) : (
                        budgetItems
                          .filter(i => i.supplier_id)
                          .map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-2">{suppliers[item.supplier_id]?.company_name || "Fornecedor removido"}</td>
                              <td className="py-2 px-2 capitalize">{item.category}</td>
                              <td className="text-right py-2 px-2">
                                R$ {Number(item.estimated_cost).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-right py-2 px-2">
                                {item.final_cost ? (
                                  <span>R$ {Number(item.final_cost).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="text-right py-2 px-2">
                                R$ {(Number(item.estimated_cost) - Number(item.final_cost || 0)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <AddExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} coupleId={couple?.id} onSuccess={handleAddExpense} />
    </div>
  );
}
