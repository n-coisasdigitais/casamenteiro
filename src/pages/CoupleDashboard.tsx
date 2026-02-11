import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Search, Calendar, Users, DollarSign, Copy, Share2, MessageSquare, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteThread from "@/components/QuoteThread";
import UserMenu from "@/components/UserMenu";

type CoupleData = {
  id: string;
  partner_name: string | null;
  couple_role: string | null;
  wedding_date: string | null;
  estimated_guests: number | null;
  estimated_budget: number | null;
  invite_code: string | null;
  onboarding_completed: boolean;
};

export default function CoupleDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadOpen, setThreadOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        if (!data.onboarding_completed) {
          navigate("/onboarding");
          return;
        }
        setCouple(data);
        supabase.from("couple_favorites").select("id", { count: "exact", head: true }).eq("couple_id", data.id).then(({ count }) => {
          setFavCount(count || 0);
        });
        // Load quotes
        supabase
          .from("quotes")
          .select("*")
          .eq("couple_id", data.id)
          .order("created_at", { ascending: false })
          .then(({ data: q }) => setQuotes(q || []));
        }
    });
  }, [user, navigate]);

  const daysUntilWedding = couple?.wedding_date
    ? Math.ceil((new Date(couple.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const copyInviteCode = () => {
    if (couple?.invite_code) {
      navigator.clipboard.writeText(couple.invite_code);
      toast({ title: "Código copiado!", description: "Compartilhe com seu(sua) parceiro(a)." });
    }
  };

  if (!couple) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold">Meu Grande Dia</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, {profile?.full_name || "Casal"}
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Meu Casamento</h1>
        {couple.partner_name && (
          <p className="text-muted-foreground mb-8">
            {couple.couple_role === "noivo" ? "Noivo" : "Noiva"} & {couple.partner_name}
          </p>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {daysUntilWedding !== null && (
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{daysUntilWedding > 0 ? daysUntilWedding : "Hoje!"}</p>
                <p className="text-xs text-muted-foreground">dias restantes</p>
              </CardContent>
            </Card>
          )}
          {couple.estimated_guests && (
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{couple.estimated_guests}</p>
                <p className="text-xs text-muted-foreground">convidados</p>
              </CardContent>
            </Card>
          )}
          {couple.estimated_budget && (
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">R$ {couple.estimated_budget.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">orçamento</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{favCount}</p>
              <p className="text-xs text-muted-foreground">favoritos</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Button size="lg" className="h-auto py-6 text-lg" asChild>
            <Link to="/buscar">
              <Search className="mr-2 h-5 w-5" />
              Buscar fornecedores
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-auto py-6 text-lg" asChild>
            <Link to="/favoritos">
              <Heart className="mr-2 h-5 w-5" />
              Meus favoritos
            </Link>
          </Button>
        </div>

        {/* Quotes sent */}
        {quotes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Meus Orçamentos ({quotes.length})
            </h2>
            <div className="space-y-3">
              {quotes.map((q) => {
                const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                  pending: { label: "Enviado", variant: "secondary" },
                  viewed: { label: "Visualizado", variant: "outline" },
                  answered: { label: "Respondido", variant: "default" },
                  accepted: { label: "Aceito ✓", variant: "default" },
                  rejected: { label: "Recusado", variant: "destructive" },
                  cancelled: { label: "Cancelado", variant: "secondary" },
                };
                const st = statusMap[q.status] || statusMap.pending;
                return (
                  <Card
                    key={q.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedQuote(q); setThreadOpen(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(q.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{q.message}</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quote Thread Dialog */}
        <Dialog open={threadOpen} onOpenChange={setThreadOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-4 pb-2 border-b border-border">
              <DialogTitle className="text-base">Conversa sobre orçamento</DialogTitle>
            </DialogHeader>
            {selectedQuote && user && (
              <QuoteThread quoteId={selectedQuote.id} currentUserId={user.id} />
            )}
          </DialogContent>
        </Dialog>

        {/* Invite code */}
        {couple.invite_code && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Vincular conta do(a) parceiro(a)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Compartilhe este código para que seu(sua) parceiro(a) acesse o mesmo painel.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-muted rounded-md font-mono text-lg tracking-widest text-center">
                  {couple.invite_code}
                </code>
                <Button variant="outline" size="icon" onClick={copyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
