import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";

export default function Privacidade() {
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
      <main className="container max-w-3xl py-12">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026</p>

        <section className="space-y-4 text-foreground/90">
          <p>Esta política descreve como o Meu Grande Dia coleta, usa e protege seus dados pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.</p>

          <h2 className="text-xl font-semibold mt-6">1. Dados que coletamos</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Cadastro:</strong> nome, e-mail, senha (criptografada), tipo de conta (casal ou fornecedor).</li>
            <li><strong>Casal:</strong> nome do parceiro, data e cidade do casamento, número de convidados, orçamento, lista de tarefas, lista de convidados, fotos de capa.</li>
            <li><strong>Fornecedor:</strong> nome da empresa, telefone, WhatsApp, e-mail, endereço, fotos do portfólio, faixa de preço, datas bloqueadas/promocionais.</li>
            <li><strong>Uso:</strong> orçamentos solicitados, mensagens trocadas, avaliações, simulações realizadas.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">2. Para que usamos</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Permitir o uso da plataforma (criar conta, planejar o casamento, contratar fornecedores).</li>
            <li>Conectar casais a fornecedores compatíveis.</li>
            <li>Enviar notificações importantes (novo orçamento, nova proposta, RSVP).</li>
            <li>Melhorar o produto com base em uso anônimo.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">3. Com quem compartilhamos</h2>
          <p>Compartilhamos dados apenas com o propósito de prestar o serviço:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Quando você envia um pedido de orçamento, o fornecedor recebe os dados necessários para responder.</li>
            <li>Provedores de infraestrutura (hospedagem, banco de dados, e-mail) operam sob contratos de confidencialidade.</li>
            <li><strong>Não vendemos seus dados.</strong></li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">4. Seus direitos (LGPD)</h2>
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Acessar seus dados.</li>
            <li>Corrigir informações.</li>
            <li>Solicitar exclusão da conta e dos dados associados.</li>
            <li>Solicitar portabilidade.</li>
            <li>Revogar consentimentos.</li>
          </ul>
          <p>Para exercer esses direitos, escreva para <a href="mailto:privacidade@meugrandedia.com" className="text-primary underline">privacidade@meugrandedia.com</a>.</p>

          <h2 className="text-xl font-semibold mt-6">5. Segurança</h2>
          <p>Aplicamos boas práticas: senhas criptografadas, conexão HTTPS, controle de acesso por linha (RLS), verificação de senhas vazadas, proteção contra ataques comuns.</p>

          <h2 className="text-xl font-semibold mt-6">6. Cookies</h2>
          <p>Usamos cookies essenciais para manter sua sessão ativa. Não usamos cookies de publicidade comportamental.</p>

          <h2 className="text-xl font-semibold mt-6">7. Retenção</h2>
          <p>Mantemos seus dados enquanto sua conta estiver ativa. Após exclusão, dados pessoais são apagados em até 30 dias, exceto quando a lei exigir retenção.</p>

          <h2 className="text-xl font-semibold mt-6">8. Encarregado (DPO)</h2>
          <p>Contato: <a href="mailto:privacidade@meugrandedia.com" className="text-primary underline">privacidade@meugrandedia.com</a>.</p>
        </section>
      </main>
    </div>
  );
}
