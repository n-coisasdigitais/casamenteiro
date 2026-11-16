import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquareHeart } from "lucide-react";
import FormFeedback, { type OrigemFeedback } from "./FormFeedback";

function origemDaConta(tipo?: string | null): OrigemFeedback {
  if (tipo === "supplier") return "fornecedor";
  if (tipo === "profissional") return "profissional";
  if (tipo === "generico") return "generico";
  return "casal";
}

/**
 * Aba fixa na lateral direita ("Feedback") para administradores logados na área administrativa.
 * Abre o formulário de erro / melhoria / ideia sem sair da tela.
 */
export default function BotaoFeedback() {
  const { user, profile, isAdmin, loading } = useAuth();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);

  if (loading || !user || !profile || !isAdmin) return null;
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;

  return (
    <>
      {/* Aba vertical no meio da lateral direita: não briga com barras de baixo nem com o "voltar ao topo" */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Enviar feedback, sugestão ou reportar erro"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg bg-foreground/85 px-1.5 py-2.5 text-[11px] font-semibold text-background shadow-lg transition hover:bg-foreground sm:rounded-l-xl sm:px-2 sm:py-3 sm:text-xs"
        style={{ writingMode: "vertical-rl" }}
      >
        <MessageSquareHeart className="h-3.5 w-3.5 rotate-90 sm:h-4 sm:w-4" />
        Feedback
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajude a melhorar o Casamenteiro</DialogTitle>
            <DialogDescription>
              Achou um erro ou tem uma ideia? A equipe lê tudo e responde por e-mail.
            </DialogDescription>
          </DialogHeader>
          <FormFeedback origem={origemDaConta(profile.account_type)} onEnviado={() => setAberto(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
