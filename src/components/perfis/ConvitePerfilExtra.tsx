import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ONBOARDING_POR_PERFIL, perfilQuePodeAdicionar } from "@/lib/perfis";

const TEXTO = {
  supplier: { t: "Também tem empresa e atende casais?", b: "Crie seu perfil de fornecedor" },
  profissional: { t: "Também trabalha como freelancer em eventos?", b: "Ative seu perfil profissional e receba vagas" },
} as const;

/** Convite discreto e dispensável para adicionar o outro perfil de trabalho. */
export default function ConvitePerfilExtra() {
  const { user, profile, perfis, adicionarPerfil } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chave = `cz-convite-perfil-${user?.id}`;
  const [dispensado, setDispensado] = useState(() => typeof window !== "undefined" && localStorage.getItem(chave) === "1");
  const [enviando, setEnviando] = useState(false);
  const tipo = perfilQuePodeAdicionar(perfis, profile?.account_type);
  if (!user || !tipo || dispensado) return null;

  const criar = async () => {
    setEnviando(true);
    try {
      await adicionarPerfil(tipo);
      toast({ title: "Perfil criado", description: "Complete seus dados para começar." });
      navigate(ONBOARDING_POR_PERFIL[tipo]);
    } catch (e: any) {
      toast({ title: "Não foi possível criar o perfil", description: e.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
      <p className="flex-1 text-muted-foreground">
        {TEXTO[tipo].t}{" "}
        <button type="button" onClick={criar} disabled={enviando} className="font-semibold text-primary hover:underline disabled:opacity-60">
          {enviando ? "Criando…" : TEXTO[tipo].b}
        </button>
      </p>
      <button
        type="button"
        aria-label="Dispensar convite"
        onClick={() => { localStorage.setItem(chave, "1"); setDispensado(true); }}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
