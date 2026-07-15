import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Heart, ArrowLeft, Save, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReloadFeatureFlags } from "@/contexts/FeatureFlagsContext";

const DEFAULTS = { locacao:25, buffet:20, decoracao:12, foto_video:10, musica:8, trajes:7, convites:3, beleza:3, lua_de_mel:7, outros:5 };

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  label: string;
  grupo: string;
  essencial: boolean;
  description: string | null;
};

const GRUPO_ORDER = ["Aquisição", "Casal", "Fornecedor", "Social", "Geral"];

export default function AdminSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reloadFlags = useReloadFeatureFlags();
  const [checked, setChecked] = useState(false);
  const [dist, setDist] = useState<Record<string, number>>(DEFAULTS);
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [pendingOff, setPendingOff] = useState<FeatureFlagRow | null>(null);

  const loadFlags = async () => {
    const { data } = await (supabase.from("feature_flags" as any).select("*").order("grupo").order("label") as any);
    if (data) setFlags(data as FeatureFlagRow[]);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      const { data: row } = await (supabase.from("system_settings" as any).select("value").eq("key", "budget_distribution").maybeSingle() as any);
      if (row?.value) setDist({ ...DEFAULTS, ...(row.value as any) });
      await loadFlags();
    });
  }, [user, authLoading, navigate]);

  const total = Object.values(dist).reduce((a, b) => a + Number(b || 0), 0);

  const save = async () => {
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: "Soma inválida", description: `O total precisa ser 100% (atual: ${total}%)`, variant: "destructive" });
      return;
    }
    const { error } = await (supabase.from("system_settings" as any) as any).upsert({
      key: "budget_distribution", value: dist, description: "Percentuais padrão de distribuição do orçamento", updated_by: user!.id, updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas" });
  };

  const applyFlagChange = async (flag: FeatureFlagRow, enabled: boolean) => {
    const { error } = await (supabase.from("feature_flags" as any) as any).upsert({
      key: flag.key, enabled, label: flag.label, grupo: flag.grupo,
      essencial: flag.essencial, description: flag.description,
      updated_by: user!.id, updated_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: enabled ? "Funcionalidade ativada" : "Funcionalidade desativada", description: flag.label });
    await loadFlags();
    await reloadFlags();
  };

  const toggleFlag = (flag: FeatureFlagRow, next: boolean) => {
    if (!next && flag.essencial) {
      setPendingOff(flag);
      return;
    }
    applyFlagChange(flag, next);
  };

  const grouped = flags.reduce<Record<string, FeatureFlagRow[]>>((acc, f) => {
    (acc[f.grupo] = acc[f.grupo] || []).push(f);
    return acc;
  }, {});
  const gruposOrdenados = Object.keys(grouped).sort((a, b) => {
    const ia = GRUPO_ORDER.indexOf(a); const ib = GRUPO_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Configurações globais</span>
          </div>
          <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </div>
      </header>
      <main className="container py-6 max-w-2xl space-y-10">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Flag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Funcionalidades</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ative ou desative áreas do produto. Alterações valem para todo mundo, inclusive visitantes deslogados.
          </p>
          <div className="space-y-6">
            {gruposOrdenados.map((grupo) => (
              <div key={grupo} className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {grupo}
                </div>
                <div className="divide-y">
                  {grouped[grupo].map((flag) => (
                    <div key={flag.key} className="flex items-start gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{flag.label}</span>
                          {flag.essencial && <Badge variant="secondary" className="text-[10px]">essencial</Badge>}
                        </div>
                        {flag.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(v) => toggleFlag(flag, v)}
                        aria-label={flag.label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
        <h2 className="text-lg font-semibold mb-1">Distribuição padrão do orçamento</h2>
        <p className="text-sm text-muted-foreground mb-4">Percentuais aplicados quando o casal não personaliza. A soma precisa ser 100%.</p>
        <div className="space-y-3 border rounded-lg p-4">
          {Object.entries(dist).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <Label className="w-32 capitalize">{k.replace(/_/g, " ")}</Label>
              <Input type="number" value={v} onChange={e => setDist({ ...dist, [k]: Number(e.target.value) })} className="w-24" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <div className={`pt-3 border-t font-medium ${Math.abs(total - 100) > 0.01 ? "text-destructive" : "text-primary"}`}>
            Total: {total}%
          </div>
        </div>
        </section>
      </main>

      <AlertDialog open={!!pendingOff} onOpenChange={(o) => !o && setPendingOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar funcionalidade essencial?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso desativa uma função central do produto{pendingOff ? ` (“${pendingOff.label}”)` : ""}. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingOff) applyFlagChange(pendingOff, false);
                setPendingOff(null);
              }}
            >
              Desativar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}