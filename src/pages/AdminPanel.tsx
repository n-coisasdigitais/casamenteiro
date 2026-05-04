import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, LogOut, Check, X, MapPin, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setAdminChecked(true);
      loadSuppliers();
    });
  }, [user, authLoading, navigate]);

  const loadSuppliers = async () => {
    setLoading(true);
    let query = supabase.from("suppliers").select("*, categories(name)").order("created_at", { ascending: false });
    
    // Note: we can't filter by status here due to RLS allowing admin to see all
    const { data } = await query;
    setSuppliers(data || []);
    setLoading(false);
  };

  const updateStatus = async (supplierId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("suppliers").update({ status }).eq("id", supplierId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Fornecedor aprovado!" : "Fornecedor rejeitado." });
      loadSuppliers();
    }
  };

  const filteredSuppliers = filter === "all" ? suppliers : suppliers.filter((s) => s.status === filter);

  if (authLoading || !adminChecked) return <div className="min-h-screen flex items-center justify-center"><p>Verificando permissões...</p></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p>Acesso negado.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold">Admin</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap"><Button variant="outline" size="sm" asChild><Link to="/admin/casais">CRM Casais</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/fornecedores-crm">CRM Fornecedores</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/comunicacao">Comunicação</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/metricas">Métricas</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/home-config">Home</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/fornecedores">Edição massa</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/simulacoes">Simulações</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/transacoes">Transações</Link></Button><Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button></div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Painel de Administração</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
              {f !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {suppliers.filter((s) => s.status === f).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhum fornecedor nesta categoria.</p>
        ) : (
          <div className="space-y-4">
            {filteredSuppliers.map((sup) => (
              <Card key={sup.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{sup.company_name}</h3>
                        <Badge variant={sup.status === "approved" ? "default" : sup.status === "rejected" ? "destructive" : "secondary"}>
                          {sup.status === "pending" ? "Pendente" : sup.status === "approved" ? "Aprovado" : "Rejeitado"}
                        </Badge>
                      </div>
                      {sup.categories && <p className="text-sm text-primary">{(sup.categories as any).name}</p>}
                      {(sup.city || sup.state) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />{[sup.city, sup.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {sup.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sup.description}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/fornecedor/${sup.id}`}><ExternalLink className="h-3 w-3 mr-1" />Ver</Link>
                      </Button>
                      {sup.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => updateStatus(sup.id, "approved")}>
                            <Check className="h-3 w-3 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(sup.id, "rejected")}>
                            <X className="h-3 w-3 mr-1" />Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
