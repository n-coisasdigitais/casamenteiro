import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type BudgetItem = {
  category: string;
  description: string;
  estimated_cost: number;
  final_cost: number | null;
  status: string;
  supplier_name?: string | null;
};

type Payment = {
  description: string | null;
  amount: number;
  payment_date: string;
  due_date: string | null;
  status: string;
  budget_item_description?: string | null;
};

type Couple = {
  partner_name?: string | null;
  user_full_name?: string | null;
  wedding_date?: string | null;
  wedding_city?: string | null;
  estimated_guests?: number | null;
  target_budget?: number | null;
  estimated_budget?: number | null;
};

const fmt = (n: number | null | undefined) =>
  `R$ ${(Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const statusLabel = (s: string) => {
  switch (s) {
    case "contracted": return "Contratado";
    case "estimated":  return "Estimado";
    case "paid":       return "Pago";
    case "pending":    return "Pendente";
    default:           return s;
  }
};

const categoryLabel = (s: string) =>
  (s || "").replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export function generateBudgetPdf(opts: {
  couple: Couple;
  items: BudgetItem[];
  payments: Payment[];
}) {
  const { couple, items, payments } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Orçamento do Casamento", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const coupleLine = [couple.user_full_name, couple.partner_name].filter(Boolean).join(" & ") || "Casal";
  doc.text(coupleLine, margin, y);
  y += 14;

  const detailParts: string[] = [];
  if (couple.wedding_date) detailParts.push(new Date(couple.wedding_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));
  if (couple.wedding_city) detailParts.push(couple.wedding_city);
  if (couple.estimated_guests) detailParts.push(`${couple.estimated_guests} convidados`);
  if (detailParts.length > 0) {
    doc.text(detailParts.join("  •  "), margin, y);
    y += 18;
  }

  // Resumo financeiro
  const totalEstimated = items.reduce((acc, it) => acc + (Number(it.estimated_cost) || 0), 0);
  const totalFinal = items.reduce((acc, it) => acc + (Number(it.final_cost) || 0), 0);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const target = couple.target_budget || couple.estimated_budget || 0;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo financeiro", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    body: [
      ["Orçamento alvo",         fmt(target)],
      ["Total estimado/contratado", fmt(totalFinal || totalEstimated)],
      ["Total pago",             fmt(totalPaid)],
      ["Saldo a pagar",          fmt((totalFinal || totalEstimated) - totalPaid)],
    ],
    columnStyles: {
      0: { cellWidth: 200, textColor: 110 },
      1: { cellWidth: "auto", fontStyle: "bold", halign: "right" },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Tabela de itens
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Itens do orçamento", margin, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Categoria", "Descrição", "Fornecedor", "Estimado", "Real", "Status"]],
    body: items.map((it) => [
      categoryLabel(it.category),
      it.description,
      it.supplier_name || "—",
      fmt(it.estimated_cost),
      it.final_cost ? fmt(it.final_cost) : "—",
      statusLabel(it.status),
    ]),
    headStyles: { fillColor: [120, 80, 60], textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
    },
    didDrawPage: () => {
      // rodapé com numeração
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Página ${page}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 16, { align: "right" });
      doc.setTextColor(0);
    },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Pagamentos
  if (payments.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 200) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Pagamentos", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Item", "Descrição", "Vencimento", "Valor", "Status"]],
      body: payments.map((p) => [
        p.budget_item_description || "—",
        p.description || "—",
        p.due_date ? new Date(p.due_date).toLocaleDateString("pt-BR") : new Date(p.payment_date).toLocaleDateString("pt-BR"),
        fmt(p.amount),
        statusLabel(p.status),
      ]),
      headStyles: { fillColor: [120, 80, 60], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  // Rodapé final
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(140);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(
      `Gerado pelo Meu Grande Dia em ${new Date().toLocaleDateString("pt-BR")}`,
      margin,
      doc.internal.pageSize.getHeight() - 16
    );
  }

  const filename = `orcamento-${(coupleLine || "casal").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}