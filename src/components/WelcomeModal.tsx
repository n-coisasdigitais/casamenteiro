import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Tipo = "supplier" | "profissional";

const CONTEUDO: Record<Tipo, { titulo: string; descricao: string; itens: { titulo: string; texto: string }[] }> = {
  supplier: {
    titulo: "Bem-vindo ao painel do fornecedor",
    descricao: "Um resumo rápido do que você encontra por aqui.",
    itens: [
      { titulo: "Complete seu perfil", texto: "Fotos, descrição, cidade de atendimento e faixa de preço deixam seu perfil pronto para aparecer nas buscas." },
      { titulo: "Orçamentos e leads", texto: "Casais enviam pedidos de orçamento; responda pelo chat e acompanhe cada negociação no CRM." },
      { titulo: "Agenda e datas ociosas", texto: "Bloqueie datas indisponíveis e publique datas ociosas com desconto para atrair novos casais." },
      { titulo: "Planos e assinatura", texto: "Escolha seu plano, acompanhe faturas e destaque seu perfil na plataforma." },
    ],
  },
  profissional: {
    titulo: "Bem-vindo ao painel do profissional",
    descricao: "Um resumo rápido do que você encontra por aqui.",
    itens: [
      { titulo: "Complete seu perfil", texto: "Foto, funções, cidade e raio de atendimento aumentam suas chances de ser chamado." },
      { titulo: "Vagas disponíveis", texto: "Veja as vagas publicadas pelos fornecedores e filtre por função, cidade e data." },
      { titulo: "Candidate-se e converse", texto: "Ao ser aceito, o contato é liberado e vocês conversam pelo chat da vaga." },
      { titulo: "Avaliações", texto: "Depois do evento, você e o fornecedor se avaliam — boas notas trazem mais convites." },
    ],
  },
};

export default function WelcomeModal({ tipo }: { tipo: Tipo }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const chave = user ? `welcome_seen_${tipo}_${user.id}` : null;

  useEffect(() => {
    if (!chave) return;
    if (!localStorage.getItem(chave)) setOpen(true);
  }, [chave]);

  const fechar = () => {
    if (chave) localStorage.setItem(chave, "1");
    setOpen(false);
  };

  const c = CONTEUDO[tipo];

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : fechar())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.titulo}</DialogTitle>
          <DialogDescription>{c.descricao}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {c.itens.map((i) => (
            <li key={i.titulo} className="text-sm">
              <p className="font-medium">{i.titulo}</p>
              <p className="text-muted-foreground">{i.texto}</p>
            </li>
          ))}
        </ul>
        <Button onClick={fechar} className="w-full">Entendi</Button>
      </DialogContent>
    </Dialog>
  );
}