import { formatBRL } from "@/lib/platformPricing";

export type ContratoInput = {
  casalNome: string;
  fornecedorNome: string;
  dataEvento: string; // YYYY-MM-DD
  valorOfertado: number;
  cidade?: string | null;
};

function fmtData(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Gera o corpo HTML do contrato de corretagem entre casal e fornecedor.
 * Placeholder: assinatura eletrônica entrará em versão futura.
 */
export function gerarCorpoContratoHtml(input: ContratoInput): string {
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `
  <article class="prose max-w-none">
    <h2>Contrato de reserva de data</h2>
    <p><strong>Contratante (Casal):</strong> ${input.casalNome}</p>
    <p><strong>Contratado (Fornecedor):</strong> ${input.fornecedorNome}</p>
    <p><strong>Data do evento:</strong> ${fmtData(input.dataEvento)}${input.cidade ? ` — ${input.cidade}` : ""}</p>
    <p><strong>Valor total contratado:</strong> ${formatBRL(input.valorOfertado)}</p>

    <h3>1. Objeto</h3>
    <p>O presente instrumento tem por objeto a reserva da data indicada acima para prestação de serviços do Fornecedor ao Casal, mediante pagamento do valor total contratado, processado pela plataforma Casamenteiro (a “Plataforma”).</p>

    <h3>2. Papel da Plataforma</h3>
    <p>A Plataforma atua como <strong>intermediadora da oferta</strong> e do pagamento, não sendo parte da execução do serviço. A responsabilidade pela prestação do serviço é exclusiva do Fornecedor. Eventuais reclamações sobre execução devem ser tratadas diretamente entre as partes, podendo a Plataforma auxiliar na mediação.</p>

    <h3>3. Pagamento</h3>
    <p>O pagamento é realizado dentro da Plataforma via Mercado Pago com split automático. O valor líquido combinado é repassado ao Fornecedor; a Plataforma retém sua comissão pela intermediação. O Casal quita o valor total em uma única transação.</p>

    <h3>4. Cancelamento</h3>
    <p>Cancelamentos seguirão a política vigente da Plataforma no momento da contratação. Cancelamentos por parte do Fornecedor após a confirmação sujeitam o Fornecedor à devolução integral ao Casal e a penalidades previstas nos Termos.</p>

    <h3>5. Foro</h3>
    <p>Fica eleito o foro da comarca do Casal para dirimir eventuais controvérsias oriundas deste contrato.</p>

    <p style="margin-top:2rem"><em>Documento emitido eletronicamente em ${hoje}.</em></p>
  </article>
  `;
}