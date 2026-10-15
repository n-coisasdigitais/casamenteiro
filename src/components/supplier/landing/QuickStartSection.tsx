import { Link } from "react-router-dom";
import { UserPlus, Image, Inbox, MessageCircle, FileCheck, BadgeCheck } from "lucide-react";

const passos = [
  { icon: UserPlus, titulo: "Crie sua conta", texto: "Nome, e-mail e categoria. Leva menos de 2 minutos." },
  { icon: Image, titulo: "Monte seu perfil", texto: "Fotos, cidades atendidas e faixa de preço." },
  { icon: BadgeCheck, titulo: "Aprovação e vitrine", texto: "Revisamos seu perfil e ele aparece para os casais." },
];

const orcamento = [
  { icon: Inbox, titulo: "O casal pede um orçamento", texto: "Com data, cidade, número de convidados e verba já informados." },
  { icon: MessageCircle, titulo: "Você conversa pelo chat", texto: "Tire dúvidas, envie anexos e responda tudo em um só lugar." },
  { icon: FileCheck, titulo: "Envie a proposta e feche", texto: "O casal aceita pela plataforma e você acompanha no seu painel." },
];

export default function QuickStartSection() {
  return (
    <section className="py-20 px-4" id="como-funciona-orcamento">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pedidos de orçamento</p>
          <h2 className="text-3xl font-bold mb-6">Como chegam os clientes</h2>
          <ol className="space-y-5">
            {orcamento.map((p, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{p.titulo}</p>
                  <p className="text-sm text-muted-foreground">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted-foreground">
            No plano gratuito você já recebe e responde pedidos de orçamento, sem comissão por contato.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cadastro rápido</p>
          <h2 className="text-3xl font-bold mb-6">Comece grátis em 3 passos</h2>
          <ol className="space-y-5 mb-8">
            {passos.map((p, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{p.titulo}</p>
                  <p className="text-sm text-muted-foreground">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            to="/fornecedor/cadastro"
            className="block rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground hover:opacity-90"
          >
            Criar meu perfil grátis
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">Sem cartão de crédito. Sem fidelidade.</p>
        </div>
      </div>
    </section>
  );
}
