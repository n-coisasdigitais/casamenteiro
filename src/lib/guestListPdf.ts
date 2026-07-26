import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import capaCasamentoDefault from "@/assets/capa-casamento-default.jpg";

export type PdfGuest = {
  id: string;
  name: string;
  guest_type: string; // adult | child | baby | couple
  rsvp_status: string; // confirmed | pending | declined
  table_number: number | null;
  group_id: string | null;
  notes?: string | null;
  max_companions?: number | null;
  rsvp_companions?: number | null;
};

export type PdfGroup = { id: string; name: string };

export type TipoEvento = "casamento" | "quinze_anos" | "formatura";

export type EventoConfig = {
  titulo: string;
  nomeFallback: string;
  imagemPadrao: string;
};

export const EVENTO_CONFIG: Record<TipoEvento, EventoConfig> = {
  casamento: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Os Noivos",
    imagemPadrao: capaCasamentoDefault,
  },
  quinze_anos: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "A Debutante",
    imagemPadrao: capaCasamentoDefault,
  },
  formatura: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Os Formandos",
    imagemPadrao: capaCasamentoDefault,
  },
};

export type GerarPdfInput = {
  tipoEvento?: TipoEvento;
  relatorios: {
    alfabetico?: boolean;
    porMesa?: boolean;
  };
  agruparAlfabeticoPor?: "letra" | "grupo";
  dados: {
    nomeCasal: string;
    fotoCapaUrl?: string | null;
    dataEvento?: string | null; // ISO
    horario?: string | null;
    localCerimonia?: string | null;
    localRecepcao?: string | null;
    contatoCerimonial?: string | null;
    ultimaAtualizacao?: string | null; // ISO
    impressoPor?: string | null;
    guests: PdfGuest[];
    groups: PdfGroup[];
  };
};

const MARK = { confirmed: "\u25CF", pending: "\u25CB", declined: "\u2014" } as const;
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  declined: "Recusado",
};

const GRAY_DARK: [number, number, number] = [51, 51, 51];
const GRAY_MED: [number, number, number] = [90, 90, 90];
const GRAY_LIGHT: [number, number, number] = [235, 235, 235];

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function isCoupleEntry(g: PdfGuest): boolean {
  if (g.guest_type === "couple") return true;
  return /\s(e|&|\+)\s/i.test(g.name);
}

function extraCompanions(g: PdfGuest): { count: number; names: string[] } {
  const notes = (g.notes || "").trim();
  const names: string[] = [];
  let count = 0;
  const declared = Number(g.rsvp_companions || 0);
  if (declared > 0) count = declared;
  const plus = notes.match(/\+\s*(\d+)/);
  if (plus) count = Math.max(count, parseInt(plus[1]));
  const trara = notes.match(/(?:ir[áa]\s+trazer|acompanhante[:\s]+|com\s+)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,40})/i);
  if (trara) {
    const nome = trara[1].trim().split(/[,.;]/)[0].trim();
    if (nome && nome.length > 1) {
      names.push(nome);
      count = Math.max(count, 1);
    }
  }
  return { count, names };
}

async function loadImageAsDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 800, h: 800 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function contarPresencas(guests: PdfGuest[]): number {
  return guests.reduce((s, g) => {
    const base = isCoupleEntry(g) ? 2 : 1;
    const extras = extraCompanions(g).count;
    return s + base + extras;
  }, 0);
}

function drawSquares(
  doc: jsPDF,
  x: number,
  y: number,
  guest: PdfGuest,
): number {
  const base = isCoupleEntry(guest) ? 2 : 1;
  const { count: extras, names } = extraCompanions(guest);
  const total = base + extras;
  const size = 4;
  const gap = 1.4;
  doc.setDrawColor(...GRAY_DARK);
  doc.setLineWidth(0.25);
  let cx = x;
  for (let i = 0; i < total; i++) {
    doc.rect(cx, y - size + 0.6, size, size);
    cx += size + gap;
  }
  return total * (size + gap);
}

function drawCover(doc: jsPDF, input: GerarPdfInput, coverImg: { data: string; w: number; h: number } | null) {
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;

  // Dados do evento (topo)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MED);
  const linhas = [
    input.dados.localCerimonia ? `Cerimônia: ${input.dados.localCerimonia}` : null,
    input.dados.localRecepcao ? `Recepção: ${input.dados.localRecepcao}` : null,
    input.dados.horario ? `Horário: ${input.dados.horario}` : null,
    input.dados.contatoCerimonial ? `Cerimonial: ${input.dados.contatoCerimonial}` : null,
  ].filter(Boolean) as string[];
  linhas.forEach((l, i) => {
    doc.text(l, pageW - M, M + 4 + i * 4.5, { align: "right" });
  });

  // Foto
  const imgW = pageW - 2 * M;
  const imgH = 130;
  const imgX = M;
  const imgY = M + 30;
  const img = coverImg;
  if (img) {
    try {
      doc.addImage(img.data, "JPEG", imgX, imgY, imgW, imgH, undefined, "FAST");
    } catch {
      try {
        doc.addImage(img.data, "PNG", imgX, imgY, imgW, imgH, undefined, "FAST");
      } catch {
        // ignore
      }
    }
  } else {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(imgX, imgY, imgW, imgH, "F");
  }

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text(cfg.titulo, pageW / 2, imgY + imgH + 22, { align: "center" });

  // Nome do casal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.setTextColor(...GRAY_DARK);
  doc.text(input.dados.nomeCasal || cfg.nomeFallback, pageW / 2, imgY + imgH + 34, { align: "center" });

  // Data
  if (input.dados.dataEvento) {
    doc.setFontSize(12);
    doc.text(fmtDate(input.dados.dataEvento), pageW / 2, imgY + imgH + 44, { align: "center" });
  }

  // Última atualização (rodapé da capa)
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MED);
  const atualizado = `Última atualização da lista em ${fmtDate(input.dados.ultimaAtualizacao)}`;
  doc.text(atualizado, pageW / 2, pageH - M - 6, { align: "center" });
  doc.setFontSize(8);
  doc.text("casamenteiro.com.br", pageW / 2, pageH - M, { align: "center" });
}

function drawSummaryHeader(
  doc: jsPDF,
  title: string,
  guests: PdfGuest[],
  y: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const M = 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, M, y);

  const total = guests.length;
  const conf = guests.filter((g) => g.rsvp_status === "confirmed").length;
  const pend = guests.filter((g) => g.rsvp_status === "pending").length;
  const rec = guests.filter((g) => g.rsvp_status === "declined").length;
  const mesas = new Set(guests.map((g) => g.table_number).filter((n): n is number => n != null)).size;
  const pessoas = contarPresencas(guests);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_DARK);
  const linha = `Total: ${total}  ·  Presenças: ${pessoas}  ·  Confirmados: ${conf}  ·  Pendentes: ${pend}  ·  Recusados: ${rec}  ·  Mesas: ${mesas}`;
  doc.text(linha, pageW - M, y, { align: "right" });
  return y + 8;
}

function drawGuestRow(
  doc: jsPDF,
  g: PdfGuest,
  y: number,
  showTable: boolean,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const M = 15;
  const lineHeight = 5;

  // status marker
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_DARK);
  doc.text(MARK[g.rsvp_status as keyof typeof MARK] || MARK.pending, M, y);

  // nome
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(g.name, M + 6, y);

  // quadrados de presença (direita, antes da mesa)
  const squaresWidth = drawSquares(doc, pageW - M - 55, y, g);

  // mesa
  if (showTable) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MED);
    const mesa = g.table_number != null ? `Mesa ${g.table_number}` : "—";
    doc.text(mesa, pageW - M, y, { align: "right" });
  }

  let cursorY = y;
  // observações em itálico
  if (g.notes && g.notes.trim()) {
    cursorY += lineHeight;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MED);
    const txt = `Observações: ${g.notes.trim()}`;
    const wrapped = doc.splitTextToSize(txt, pageW - 2 * M - 12);
    doc.text(wrapped, M + 6, cursorY);
    cursorY += (wrapped.length - 1) * 4;
  }

  // nomes de acompanhantes extras (itálico) sob os quadrados
  const extras = extraCompanions(g);
  if (extras.names.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MED);
    doc.text(`+ ${extras.names.join(", ")}`, pageW - M - 55, y + 4);
  }

  return cursorY + lineHeight + 1;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, footerFn: () => void): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    footerFn();
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSectionHeader(doc: jsPDF, label: string, y: number, big = false): number {
  const pageW = doc.internal.pageSize.getWidth();
  const M = 15;
  doc.setFillColor(...GRAY_LIGHT);
  const h = big ? 14 : 9;
  doc.rect(M, y - h + 3, pageW - 2 * M, h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 20 : 11);
  doc.setTextColor(0, 0, 0);
  doc.text(label, M + 3, y + (big ? 2 : 0));
  return y + h + 2;
}

function drawFooterAllPages(doc: jsPDF, input: GerarPdfInput) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(15, pageH - 12, pageW - 15, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MED);
    const left = `Lista de convidados: ${input.dados.nomeCasal}`;
    const center = "casamenteiro.com.br";
    const impresso = input.dados.impressoPor ? `Impresso por ${input.dados.impressoPor} · ${fmtDateTime(new Date().toISOString())}` : fmtDateTime(new Date().toISOString());
    doc.text(left, 15, pageH - 7);
    doc.text(center, pageW / 2, pageH - 7, { align: "center" });
    doc.text(`${impresso}  ·  Página ${i - 1} de ${pageCount - 1}`, pageW - 15, pageH - 7, { align: "right" });
  }
}

function drawAlfabetico(doc: jsPDF, input: GerarPdfInput, footerFn: () => void) {
  const { guests, groups } = input.dados;
  const ordered = [...guests].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  let y = drawSummaryHeader(doc, "Lista alfabética", ordered, 20);

  if (input.agruparAlfabeticoPor === "grupo") {
    const byGroup = new Map<string, PdfGuest[]>();
    for (const g of ordered) {
      const key = g.group_id || "__none__";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(g);
    }
    const groupName = (id: string) => id === "__none__" ? "Sem grupo" : (groups.find((gr) => gr.id === id)?.name || "Grupo");
    const sortedKeys = Array.from(byGroup.keys()).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return groupName(a).localeCompare(groupName(b), "pt-BR");
    });
    for (const key of sortedKeys) {
      y = ensureSpace(doc, y, 14, footerFn);
      y = drawSectionHeader(doc, `${groupName(key)} (${byGroup.get(key)!.length})`, y, false);
      for (const g of byGroup.get(key)!) {
        y = ensureSpace(doc, y, 10, footerFn);
        y = drawGuestRow(doc, g, y, true);
      }
    }
  } else {
    let currentLetter = "";
    for (const g of ordered) {
      const letter = (g.name.trim()[0] || "#").toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        y = ensureSpace(doc, y, 18, footerFn);
        y = drawSectionHeader(doc, letter, y, true);
      }
      y = ensureSpace(doc, y, 10, footerFn);
      y = drawGuestRow(doc, g, y, true);
    }
  }
}

function drawPorMesa(doc: jsPDF, input: GerarPdfInput, footerFn: () => void) {
  const { guests } = input.dados;
  let y = drawSummaryHeader(doc, "Lista por mesa", guests, 20);

  const byTable = new Map<string, PdfGuest[]>();
  for (const g of guests) {
    const key = g.table_number != null ? String(g.table_number) : "__none__";
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key)!.push(g);
  }
  const keys = Array.from(byTable.keys()).sort((a, b) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return parseInt(a) - parseInt(b);
  });

  for (const key of keys) {
    const list = byTable.get(key)!;
    const label = key === "__none__" ? "Sem mesa" : `Mesa ${key}`;
    const pessoas = contarPresencas(list);
    const header = `${label}  ·  ${list.length} convidado${list.length === 1 ? "" : "s"}  ·  ${pessoas} presença${pessoas === 1 ? "" : "s"}`;
    y = ensureSpace(doc, y, 14, footerFn);
    y = drawSectionHeader(doc, header, y, false);
    for (const g of list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
      y = ensureSpace(doc, y, 10, footerFn);
      y = drawGuestRow(doc, g, y, false);
    }
  }
}

export async function gerarPdfConvidados(input: GerarPdfInput): Promise<void> {
  // silence unused import warning (autoTable reserved for future tabular fallback)
  void autoTable;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const coverSrc = input.dados.fotoCapaUrl || cfg.imagemPadrao;
  const coverImg = await loadImageAsDataUrl(coverSrc);

  drawCover(doc, input, coverImg);

  const footerFn = () => {}; // rodapé é aplicado no final via drawFooterAllPages

  if (input.relatorios.alfabetico) {
    doc.addPage();
    drawAlfabetico(doc, input, footerFn);
  }
  if (input.relatorios.porMesa) {
    doc.addPage();
    drawPorMesa(doc, input, footerFn);
  }

  drawFooterAllPages(doc, input);

  const filename = `lista-convidados-${(input.dados.nomeCasal || "casal").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}