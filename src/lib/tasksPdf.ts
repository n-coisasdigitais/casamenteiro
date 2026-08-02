// Relatório PDF da agenda de tarefas do casal (P&B), substituindo window.print().
import jsPDF from "jspdf";

export type PdfTask = {
  title: string;
  category: string;
  due_period: string | null;
  due_date: string | null;
  is_completed: boolean;
  supplier_name?: string | null;
};

export type TasksPdfInput = {
  nomeCasal: string;
  dataEvento?: string | null;
  tasks: PdfTask[];
  periodOrder: string[];
  periodLabels: Record<string, string>;
  returnBlob?: boolean;
};

const fmtData = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
};

export function gerarTarefasPdf(input: TasksPdfInput): Blob | void {
  const { nomeCasal, dataEvento, tasks, periodOrder, periodLabels } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const hoje = new Date();
  const concluidas = tasks.filter((t) => t.is_completed).length;
  const pendentes = tasks.length - concluidas;
  const atrasadas = tasks.filter(
    (t) => !t.is_completed && t.due_date && new Date(`${t.due_date}T00:00:00`) < hoje
  ).length;

  const rodape = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`${nomeCasal} — Agenda de tarefas`, M, H - 24);
      doc.text(`Página ${i} de ${total}`, W - M, H - 24, { align: "right" });
      doc.setTextColor(0);
    }
  };

  const quebra = (altura: number) => {
    if (y + altura > H - 56) {
      doc.addPage();
      y = M;
    }
  };

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Agenda de tarefas", M, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(nomeCasal, M, y);
  y += 15;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Casamento: ${fmtData(dataEvento)}  ·  Emitido em ${hoje.toLocaleDateString("pt-BR")}`,
    M,
    y
  );
  doc.setTextColor(0);
  y += 22;

  // Resumo
  doc.setDrawColor(200);
  doc.rect(M, y, W - M * 2, 46);
  const cols = [
    { l: "Total", v: String(tasks.length) },
    { l: "Concluídas", v: String(concluidas) },
    { l: "Pendentes", v: String(pendentes) },
    { l: "Fora do prazo", v: String(atrasadas) },
  ];
  const cw = (W - M * 2) / cols.length;
  cols.forEach((c, i) => {
    const cx = M + cw * i + cw / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(c.v, cx, y + 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(c.l, cx, y + 36, { align: "center" });
    doc.setTextColor(0);
  });
  y += 66;

  // Agrupamento por período
  const buckets = new Map<string, PdfTask[]>();
  for (const t of tasks) {
    const key = t.due_period && periodOrder.includes(t.due_period) ? t.due_period : "__outros";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  const ordem = [...periodOrder.filter((p) => buckets.has(p)), ...(buckets.has("__outros") ? ["__outros"] : [])];

  for (const key of ordem) {
    const lista = buckets.get(key)!;
    quebra(46);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(periodLabels[key] || "Outras tarefas", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `${lista.filter((t) => t.is_completed).length}/${lista.length} concluídas`,
      W - M,
      y,
      { align: "right" }
    );
    doc.setTextColor(0);
    y += 8;
    doc.setDrawColor(180);
    doc.line(M, y, W - M, y);
    y += 14;

    for (const t of lista) {
      quebra(26);
      // caixinha de status
      doc.setDrawColor(120);
      doc.rect(M, y - 8, 9, 9);
      if (t.is_completed) {
        doc.setLineWidth(1.2);
        doc.line(M + 1.5, y - 3.5, M + 3.8, y - 1);
        doc.line(M + 3.8, y - 1, M + 7.5, y - 6.5);
        doc.setLineWidth(0.4);
      }
      doc.setFont("helvetica", t.is_completed ? "normal" : "bold");
      doc.setFontSize(10);
      const titulo = doc.splitTextToSize(t.title, W - M * 2 - 150)[0];
      doc.text(titulo, M + 16, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      const meta = [
        t.category,
        t.due_date ? `prazo ${fmtData(t.due_date)}` : null,
        t.supplier_name ? `fornecedor: ${t.supplier_name}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      doc.text(meta, W - M, y, { align: "right" });
      doc.setTextColor(0);
      y += 18;
    }
    y += 8;
  }

  rodape();

  if (input.returnBlob) return doc.output("blob");
  doc.save("agenda-de-tarefas.pdf");
}