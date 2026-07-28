// src/lib/guestListPdf.ts
// Gerador de PDF da lista de convidados (jsPDF).
// Reescrito para: (1) eliminar o bug "%Ë" (marcador de status desenhado, sem fonte),
// (2) capa mais próxima do layout de referência, (3) rótulos de contadores mais claros.
//
// >>> CONFERIR AO COLAR NO PROJETO <<<
// Os nomes de campo abaixo vieram dos trechos do seu código. Confirme que batem com os tipos reais:
//   PdfGuest.name, .rsvp_status ('confirmed'|'pending'|'declined'), .table_number,
//   .group_id, .notes, .is_couple (ou lógica isCoupleEntry), .companions/.extra (acompanhantes).
// Se algum nome for diferente no seu projeto, ajuste APENAS nas funções auxiliares marcadas com [CONFERIR].

import jsPDF from "jspdf";

// ---------------------------------------------------------------------------
// Tipos (ajuste para importar os tipos reais do seu projeto se já existirem)
// ---------------------------------------------------------------------------
export type RsvpStatus = "confirmed" | "pending" | "declined";

export type TipoEvento = "casamento" | "15anos" | "formatura" | "aniversario" | "corporativo";

export type PdfGuest = {
  name: string;
  rsvp_status: RsvpStatus | string | null;
  table_number: number | null;
  group_id: string | null;
  notes: string | null;
  // marcação de "entrada de casal/dupla" e acompanhantes extras — [CONFERIR nomes]
  is_couple?: boolean;
  companions_count?: number; // nº de acompanhantes já previstos
  companions_names?: string[]; // nomes de acompanhantes não listados (ex.: "+ Joana")
};

export type PdfGroup = { id: string; name: string };

export type GerarPdfDados = {
  nomeCasal: string;
  dataEvento?: string | null;
  ultimaAtualizacao?: string | null;
  fotoCapaUrl?: string | null;
  localCerimonia?: string | null;
  localRecepcao?: string | null;
  horario?: string | null;
  contatoCerimonial?: string | null;
  impressoPor?: string | null;
  guests: PdfGuest[];
  groups: PdfGroup[];
};

export type GerarPdfInput = {
  dados: GerarPdfDados;
  relatorios: { alfabetico: boolean; porMesa: boolean };
  agruparAlfabeticoPor?: "letra" | "grupo";
  tipoEvento?: TipoEvento;
  returnBlob?: boolean;
};

// ---------------------------------------------------------------------------
// Config por tipo de evento (extensível para o pivô de festas)
// ---------------------------------------------------------------------------
const EVENTO_CONFIG: Record<string, { titulo: string; nomeFallback: string; imagemPadrao: string }> = {
  casamento: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Os Noivos",
    imagemPadrao: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
  },
  "15anos": {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Aniversariante",
    imagemPadrao: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80",
  },
  formatura: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Formando(a)",
    imagemPadrao: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80",
  },
  aniversario: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Aniversariante",
    imagemPadrao: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1200&q=80",
  },
  corporativo: {
    titulo: "LISTA DE CONVIDADOS",
    nomeFallback: "Convidados",
    imagemPadrao: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80",
  },
};

// ---------------------------------------------------------------------------
// Paleta (tons da marca; tudo P&B-safe: informação em preto/cinza-escuro)
// ---------------------------------------------------------------------------
const BLACK: [number, number, number] = [20, 20, 20];
const GRAY_DARK: [number, number, number] = [70, 70, 70];
const GRAY_MED: [number, number, number] = [130, 130, 130];
const GRAY_LIGHT: [number, number, number] = [235, 233, 228];
const BRAND_SOFT: [number, number, number] = [247, 236, 231]; // bege/terracota bem claro (faixa do título)

const M = 15; // margem em mm

// ---------------------------------------------------------------------------
// Utilidades de data
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Lógica de pessoas / acompanhantes — [CONFERIR nomes de campo]
// ---------------------------------------------------------------------------
function isCoupleEntry(g: PdfGuest): boolean {
  // heurística: campo explícito OU " e " no nome (ex.: "Maria e Francisco")
  if (typeof g.is_couple === "boolean") return g.is_couple;
  return / e /i.test(g.name || "");
}
function extraCompanions(g: PdfGuest): { count: number; names: string[] } {
  const names = g.companions_names || [];
  const count = g.companions_count ?? names.length;
  return { count, names };
}
function pessoasNaEntrada(g: PdfGuest): number {
  const base = isCoupleEntry(g) ? 2 : 1;
  return base + extraCompanions(g).count;
}
function contarPessoas(guests: PdfGuest[]): number {
  return guests.reduce((s, g) => s + pessoasNaEntrada(g), 0);
}

// ---------------------------------------------------------------------------
// Carregar imagem como dataURL (para a capa)
// ---------------------------------------------------------------------------
async function loadImageAsDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = data;
    });
    return { data, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CAPA
// ---------------------------------------------------------------------------
function drawCover(doc: jsPDF, input: GerarPdfInput, coverImg: { data: string; w: number; h: number } | null) {
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const d = input.dados;

  // Dados do evento (topo direito, discretos)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MED);
  const linhas = [
    d.localCerimonia ? `Cerimônia: ${d.localCerimonia}` : null,
    d.localRecepcao ? `Recepção: ${d.localRecepcao}` : null,
    d.horario ? `Horário: ${d.horario}` : null,
    d.contatoCerimonial ? `Cerimonial: ${d.contatoCerimonial}` : null,
  ].filter(Boolean) as string[];
  linhas.forEach((l, i) => doc.text(l, pageW - M, M + 4 + i * 4.5, { align: "right" }));

  // Foto de capa (área grande no topo, com moldura fina)
  const imgW = pageW - 2 * M;
  const imgH = 135;
  const imgX = M;
  const imgY = M + 26;
  if (coverImg) {
    try {
      doc.addImage(coverImg.data, "JPEG", imgX, imgY, imgW, imgH, undefined, "FAST");
    } catch {
      try {
        doc.addImage(coverImg.data, "PNG", imgX, imgY, imgW, imgH, undefined, "FAST");
      } catch {
        doc.setFillColor(...GRAY_LIGHT);
        doc.rect(imgX, imgY, imgW, imgH, "F");
      }
    }
  } else {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(imgX, imgY, imgW, imgH, "F");
  }
  // moldura fina
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.4);
  doc.rect(imgX, imgY, imgW, imgH);

  // Faixa suave atrás do título
  const faixaY = imgY + imgH + 8;
  const faixaH = 16;
  doc.setFillColor(...BRAND_SOFT);
  doc.rect(M, faixaY, pageW - 2 * M, faixaH, "F");

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BLACK);
  doc.text(cfg.titulo, pageW / 2, faixaY + 11, { align: "center" });

  // Nome do casal / pessoa
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor(...GRAY_DARK);
  doc.text(d.nomeCasal || cfg.nomeFallback, pageW / 2, faixaY + faixaH + 12, { align: "center" });

  // Data do evento
  if (d.dataEvento) {
    doc.setFontSize(12);
    doc.setTextColor(...GRAY_MED);
    doc.text(fmtDate(d.dataEvento), pageW / 2, faixaY + faixaH + 22, { align: "center" });
  }

  // Rodapé da capa
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MED);
  if (d.ultimaAtualizacao) {
    doc.text(`Última atualização da lista em ${fmtDate(d.ultimaAtualizacao)}`, pageW / 2, pageH - M - 6, {
      align: "center",
    });
  }
  doc.setFontSize(8);
  doc.text("casamenteiro.com.br", pageW / 2, pageH - M, { align: "center" });
}

// ---------------------------------------------------------------------------
// Cabeçalho de resumo (contadores) — rótulos claros
// ---------------------------------------------------------------------------
function drawSummaryHeader(doc: jsPDF, title: string, guests: PdfGuest[], y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text(title, M, y);

  const convidados = guests.length;
  const pessoas = contarPessoas(guests);
  const conf = guests.filter((g) => g.rsvp_status === "confirmed").length;
  const pend = guests.filter((g) => g.rsvp_status === "pending").length;
  const rec = guests.filter((g) => g.rsvp_status === "declined").length;
  const mesas = new Set(guests.map((g) => g.table_number).filter((n): n is number => n != null)).size;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_DARK);
  const linha =
    `Convidados: ${convidados}  ·  Pessoas: ${pessoas}  ·  Confirmados: ${conf}  ·  ` +
    `Pendentes: ${pend}  ·  Recusados: ${rec}  ·  Mesas: ${mesas}`;
  doc.text(linha, pageW - M, y, { align: "right" });
  return y + 9;
}

// ---------------------------------------------------------------------------
// Marcador de status DESENHADO (sem fonte -> sem "%Ë")
// ---------------------------------------------------------------------------
function drawStatusMarker(doc: jsPDF, x: number, y: number, status: PdfGuest["rsvp_status"]) {
  const cy = y - 1.2;
  if (status === "confirmed") {
    doc.setFillColor(...GRAY_DARK);
    doc.setDrawColor(...GRAY_DARK);
    doc.circle(x + 1.5, cy, 1.4, "F"); // cheio = confirmado
  } else if (status === "declined") {
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(x, cy - 1.4, x + 3, cy + 1.4); // "x" = recusado
    doc.line(x, cy + 1.4, x + 3, cy - 1.4);
  } else {
    doc.setDrawColor(...GRAY_DARK);
    doc.setLineWidth(0.3);
    doc.circle(x + 1.5, cy, 1.4, "S"); // vazio = pendente
  }
}

// ---------------------------------------------------------------------------
// Quadrados de presença (nº = pessoas da entrada)
// ---------------------------------------------------------------------------
function drawSquares(doc: jsPDF, x: number, y: number, g: PdfGuest): number {
  const total = pessoasNaEntrada(g);
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

// ---------------------------------------------------------------------------
// Linha de convidado
// ---------------------------------------------------------------------------
function drawGuestRow(doc: jsPDF, g: PdfGuest, y: number, showTable: boolean): number {
  const pageW = doc.internal.pageSize.getWidth();
  const lineHeight = 5;

  // marcador de status (desenhado)
  drawStatusMarker(doc, M, y, g.rsvp_status);

  // nome
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(g.name, M + 6, y);

  // quadrados de presença (à direita, antes da mesa)
  const squaresX = pageW - M - 55;
  drawSquares(doc, squaresX, y, g);

  // acompanhantes extras não listados (itálico, sob os quadrados)
  const extras = extraCompanions(g);
  if (extras.names.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MED);
    doc.text(`+ ${extras.names.join(", ")}`, squaresX, y + 4);
  }

  // mesa
  if (showTable) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MED);
    const mesa = g.table_number != null ? `Mesa ${g.table_number}` : "—";
    doc.text(mesa, pageW - M, y, { align: "right" });
  }

  let cursorY = y;
  // observações (itálico)
  if (g.notes && g.notes.trim()) {
    cursorY += lineHeight;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MED);
    const wrapped = doc.splitTextToSize(`Observações: ${g.notes.trim()}`, pageW - 2 * M - 12);
    doc.text(wrapped, M + 6, cursorY);
    cursorY += (wrapped.length - 1) * 4;
  }

  return cursorY + lineHeight + 1;
}

// ---------------------------------------------------------------------------
// Cabeçalho de seção (letra grande / grupo / mesa)
// ---------------------------------------------------------------------------
function drawSectionHeader(doc: jsPDF, label: string, y: number, big = false): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GRAY_LIGHT);
  const h = big ? 14 : 9;
  doc.rect(M, y - h + 3, pageW - 2 * M, h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 20 : 11);
  doc.setTextColor(...BLACK);
  doc.text(label, M + 3, y + (big ? 2 : 0));
  return y + h + 2;
}

// ---------------------------------------------------------------------------
// Controle de quebra de página
// ---------------------------------------------------------------------------
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Relatório ALFABÉTICO
// ---------------------------------------------------------------------------
function drawAlfabetico(doc: jsPDF, input: GerarPdfInput) {
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
    const groupName = (id: string) =>
      id === "__none__" ? "Sem grupo" : groups.find((gr) => gr.id === id)?.name || "Grupo";
    const keys = Array.from(byGroup.keys()).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return groupName(a).localeCompare(groupName(b), "pt-BR");
    });
    for (const key of keys) {
      y = ensureSpace(doc, y, 16);
      y = drawSectionHeader(doc, `${groupName(key)} (${byGroup.get(key)!.length})`, y, false);
      for (const g of byGroup.get(key)!) {
        y = ensureSpace(doc, y, 10);
        y = drawGuestRow(doc, g, y, true);
      }
    }
  } else {
    let currentLetter = "";
    for (const g of ordered) {
      const letter = (g.name.trim()[0] || "#").toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        y = ensureSpace(doc, y, 18);
        y = drawSectionHeader(doc, letter, y, true);
      }
      y = ensureSpace(doc, y, 10);
      y = drawGuestRow(doc, g, y, true);
    }
  }
}

// ---------------------------------------------------------------------------
// Relatório POR MESA
// ---------------------------------------------------------------------------
function drawPorMesa(doc: jsPDF, input: GerarPdfInput) {
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
    const pessoas = contarPessoas(list);
    const header =
      `${label}  ·  ${list.length} convidado${list.length === 1 ? "" : "s"}  ·  ` +
      `${pessoas} pessoa${pessoas === 1 ? "" : "s"}`;
    y = ensureSpace(doc, y, 16);
    y = drawSectionHeader(doc, header, y, false);
    for (const g of list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
      y = ensureSpace(doc, y, 10);
      y = drawGuestRow(doc, g, y, false);
    }
  }
}

// ---------------------------------------------------------------------------
// Rodapé em todas as páginas de conteúdo (a partir da página 2)
// ---------------------------------------------------------------------------
function drawFooterAllPages(doc: jsPDF, input: GerarPdfInput) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const d = input.dados;
  const impresso = d.impressoPor
    ? `Impresso por ${d.impressoPor} · ${fmtDateTime(new Date().toISOString())}`
    : fmtDateTime(new Date().toISOString());

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - 12, pageW - M, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MED);
    doc.text(`Lista de convidados: ${d.nomeCasal}`, M, pageH - 7);
    doc.text("casamenteiro.com.br", pageW / 2, pageH - 7, { align: "center" });
    doc.text(`${impresso}  ·  Página ${i - 1} de ${pageCount - 1}`, pageW - M, pageH - 7, {
      align: "right",
    });
  }
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------
export async function gerarPdfConvidados(input: GerarPdfInput): Promise<void | Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const coverSrc = input.dados.fotoCapaUrl || cfg.imagemPadrao;
  const coverImg = await loadImageAsDataUrl(coverSrc);

  drawCover(doc, input, coverImg);

  if (input.relatorios.alfabetico) {
    doc.addPage();
    drawAlfabetico(doc, input);
  }
  if (input.relatorios.porMesa) {
    doc.addPage();
    drawPorMesa(doc, input);
  }

  drawFooterAllPages(doc, input);

  if (input.returnBlob) return doc.output("blob");

  const filename = `lista-convidados-${(input.dados.nomeCasal || "casal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}
