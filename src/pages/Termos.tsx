import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";

export default function Termos() {
  return (
    <div className="min-h-screen bg-beige">
      <header className="border-b bg-background">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-semibold">Meu Grande Dia</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>
      <main className="container max-w-3xl py-12 prose prose-sm md:prose-base">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026</p>

        <section className="space-y-4 text-foreground/90">
          <h2 className="text-xl font-semibold mt-6">1. Aceitação</h2>
          <p>Ao criar uma conta no Meu Grande Dia ("plataforma"), você concorda com estes Termos de Uso e com a nossa <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.</p>

          <h2 className="text-xl font-semibold mt-6">2. O que é o Meu Grande Dia</h2>
          <p>Somos uma plataforma online que conecta casais a fornecedores de serviços para casamento, oferece ferramentas de planejamento (lista de tarefas, controle de orçamento, gestão de convidados, simulador) e facilita a troca de mensagens e orçamentos entre as partes.</p>
          <p>Não somos uma agência de casamento. Não respondemos por contratos firmados diretamente entre casais e fornecedores.</p>

          <h2 className="text-xl font-semibold mt-6">3. Cadastro</h2>
          <p>Você é responsável pela veracidade das informações que cadastra e por manter sua senha em segurança. Contas com informações falsas, conteúdo ofensivo ou uso comercial não autorizado podem ser suspensas.</p>

          <h2 className="text-xl font-semibold mt-6">4. Conduta</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Não publique conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros.</li>
            <li>Não envie spam nem use a plataforma para fraude.</li>
            <li>Não tente burlar mecanismos de segurança ou copiar dados massivamente.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">5. Avaliações e conteúdo</h2>
          <p>Avaliações de fornecedores devem ser baseadas em experiência real. Reservamo-nos o direito de remover avaliações falsas ou ofensivas.</p>

          <h2 className="text-xl font-semibold mt-6">6. Pagamentos</h2>
          <p>Eventuais pagamentos a fornecedores são feitos diretamente entre as partes. A plataforma não intermedia transações financeiras nesta versão.</p>

          <h2 className="text-xl font-semibold mt-6">7. Limitação de responsabilidade</h2>
          <p>A plataforma é fornecida "como está". Não garantimos disponibilidade ininterrupta nem nos responsabilizamos por danos decorrentes da relação contratual entre casais e fornecedores.</p>

          <h2 className="text-xl font-semibold mt-6">8. Encerramento</h2>
          <p>Você pode encerrar sua conta a qualquer momento. Podemos suspender contas que violem estes Termos.</p>

          <h2 className="text-xl font-semibold mt-6">9. Alterações</h2>
          <p>Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas por e-mail ou na plataforma.</p>

          <h2 className="text-xl font-semibold mt-6">10. Contato</h2>
          <p>Dúvidas? Fale com a gente pelo e-mail <a href="mailto:contato@meugrandedia.com" className="text-primary underline">contato@meugrandedia.com</a>.</p>
        </section>
      </main>
    </div>
  );
}
