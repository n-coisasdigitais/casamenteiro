import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NOME_PERFIL, PAINEL_POR_PERFIL, possui, type TipoTrabalho } from "@/lib/perfis";

/** Troca entre fornecedor e profissional. Só aparece com os dois perfis. */
export default function SeletorPerfil() {
  const { profile, perfis, trocarPerfil } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tipos: TipoTrabalho[] = ["supplier", "profissional"];
  if (!tipos.every((t) => possui(perfis, t))) return null;

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Trocar perfil</DropdownMenuLabel>
      {tipos.map((t) => {
        const ativo = profile?.account_type === t;
        return (
          <DropdownMenuItem
            key={t}
            className="cursor-pointer"
            onClick={async () => {
              try {
                if (!ativo) await trocarPerfil(t);
                navigate(PAINEL_POR_PERFIL[t]);
              } catch (e: any) {
                toast({ title: "Não foi possível trocar de perfil", description: e.message, variant: "destructive" });
              }
            }}
          >
            <span className="flex-1">{NOME_PERFIL[t]}</span>
            {ativo && <Check className="h-4 w-4 text-primary" aria-label="perfil ativo" />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </>
  );
}
