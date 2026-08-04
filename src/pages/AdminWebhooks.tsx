import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, RefreshCw, Webhook } from "lucide-react";
import { formatarDataHora, TIPO_LABEL } from "@/lib/pagamentos";

type Evento = {
  id: string;
  provider: string;
  evento: string | null;
  ambiente: string | null;
  tipo: string | null;
  referencia_id: string | null;
  reservation_id: string | null;
  mp_payment_id: string | null;
  status_recebido: string | null;
  http_status: number | null;
  assinatura_valida: boolean;
  resultado: string | null;
  erro: string | null;
  payload: unknown;
  created_at: string;
};

export default function AdminWebhooks() {
  const [rows, setRows] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ambiente, setAmbiente] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [situacao, setSituacao] = useState("todas");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    let q = (supabase.from("webhook_events" as any)
      .select("*").order("created_at", { ascending: false }).limit(300) as any);
    if (ambiente !== "todos") q = q.eq("ambiente", ambiente);
    if (tipo !== "todos") q = q.eq("tipo", tipo);
    if (situacao === "ok") q = q.eq("http_status", 200);
    if (situacao === "erro") q = q.neq("http_status", 200);
    if (situacao === "assinatura_invalida") q = q.eq("assinatura_valida", false);
    const termo = busca.trim();
    if (termo) {
      const uuid = /^[0-9a-f-]{36}$/i.test(termo);
      q = uuid
        ? q.or(`referencia_id.eq.${termo},reservation_id.eq.${termo}`)
        : q.eq("mp_payment_id", termo);
    }
    const { data } = await q;
    setRows((data as Evento[]) ?? []);
    setCarregando(false);
  }, [ambiente, tipo, situacao, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Webhook className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Tentativas de webhook</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={ambiente} onValueChange={setAmbiente}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Ambiente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ambientes</SelectItem>
              <SelectItem value="sandbox">Testes (sandbox)</SelectItem>
              <SelectItem value="live">Produção (live)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="reserva">Reserva</SelectItem>
              <SelectItem value="assinatura">Assinatura</SelectItem>
              <SelectItem value="destaque">Destaque</SelectItem>
            </SelectContent>
          </Select>
          <Select value={situacao} onValueChange={setSituacao}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as situações</SelectItem>
              <SelectItem value="ok">Processadas (200)</SelectItem>
              <SelectItem value="erro">Com erro</SelectItem>
              <SelectItem value="assinatura_invalida">Assinatura inválida</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-72"
            placeholder="ID da reserva/referência ou ID do pagamento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Button variant="outline" onClick={carregar}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {carregando ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma tentativa registrada com esses filtros.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status MP</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>HTTP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <>
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{formatarDataHora(r.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.ambiente === "live" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}>
                          {r.ambiente === "live" ? "Produção" : r.ambiente === "sandbox" ? "Testes" : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.tipo ? (TIPO_LABEL[r.tipo] ?? r.tipo) : "—"}</TableCell>
                      <TableCell className="text-xs break-all max-w-[180px]">{r.referencia_id ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.mp_payment_id ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.status_recebido ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.resultado ?? "—"}
                        {r.erro ? <span className="block text-destructive">{r.erro}</span> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.http_status === 200 ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                          {r.http_status ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${r.id}-payload`}>
                      <TableCell colSpan={8} className="py-1">
                        <Collapsible>
                          <CollapsibleTrigger className="text-xs text-muted-foreground underline">
                            Ver conteúdo recebido
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <pre className="mt-2 text-xs bg-muted rounded-md p-3 overflow-x-auto">
                              {JSON.stringify(r.payload, null, 2)}
                            </pre>
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
