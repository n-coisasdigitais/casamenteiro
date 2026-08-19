// src/lib/guestListPdf.ts
// Gerador de PDF da lista de convidados (jsPDF) — REDESENHADO para o layout de referência.
// Mudou o DESENHO (capa + páginas de listagem: fontes Poppins/Cormorant, letras grandes,
// linha pontilhada, "Mesa X" sobre a linha, quadrados pontilhados, cabeçalho/rodapé fixos,
// fundo bege). A LÓGICA foi preservada: 3 relatórios, resumo, cabeçalhos com contagem,
// contagem de pessoas/acompanhantes, status e observações.
//
// >>> CONFERIR AO COLAR NO PROJETO <<<
// - Campos usados de PdfGuest: name, rsvp_status, table_number, group_id, notes,
//   is_couple?, companions_count?, companions_names?  (ajuste [CONFERIR] se diferirem).
// - Requer o novo arquivo src/lib/pdfFonts.ts (fontes embutidas). É importado de forma
//   DINÂMICA aqui, então o bundle inicial não engorda; se a importação falhar, cai em
//   Helvetica/Times automaticamente (sem quebrar).

import jsPDF from "jspdf";

// ---------------------------------------------------------------------------
// Tipos (inalterados)
// ---------------------------------------------------------------------------
export type RsvpStatus = "confirmed" | "pending" | "declined";
export type TipoEvento = "casamento" | "15anos" | "formatura" | "aniversario" | "corporativo";

export type PdfGuest = {
  name: string;
  rsvp_status: RsvpStatus | string | null;
  table_number: number | null;
  group_id: string | null;
  notes: string | null;
  is_couple?: boolean;
  companions_count?: number;
  companions_names?: string[];
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
// Config por tipo de evento
// ---------------------------------------------------------------------------
const EVENTO_CONFIG: Record<string, { titulo: string; nomeFallback: string; imagemPadrao: string }> = {
  casamento:   { titulo: "LISTA DE CONVIDADOS", nomeFallback: "Os Noivos",     imagemPadrao: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80" },
  "15anos":    { titulo: "LISTA DE CONVIDADOS", nomeFallback: "Aniversariante", imagemPadrao: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80" },
  formatura:   { titulo: "LISTA DE CONVIDADOS", nomeFallback: "Formando(a)",    imagemPadrao: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80" },
  aniversario: { titulo: "LISTA DE CONVIDADOS", nomeFallback: "Aniversariante", imagemPadrao: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1200&q=80" },
  corporativo: { titulo: "LISTA DE CONVIDADOS", nomeFallback: "Convidados",     imagemPadrao: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80" },
};

// ---------------------------------------------------------------------------
// Paleta (P&B-safe; informação em preto/cinza)
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const INK: RGB = [28, 28, 28];
const GRAY_DARK: RGB = [70, 70, 70];
const SOFT: RGB = [111, 109, 104];
const MESA_C: RGB = [176, 174, 167];
const LINE_C: RGB = [190, 188, 181];
const PAGE_BG: RGB = [237, 236, 231];   // bege claro (páginas de lista)
const COVER_GRAY: RGB = [232, 230, 224]; // bloco da capa
const CORAL: RGB = [214, 142, 118];      // endereço / detalhes da capa
const SERIF_GRAY: RGB = [139, 137, 131]; // subtítulo serifado do cabeçalho
const WHITE: RGB = [255, 255, 255];

const M = 15;          // margem lateral (mm)
const TOP_LIST = 49;   // topo do conteúdo nas páginas de lista (abaixo do cabeçalho)
const BOTTOM_LIMIT = 20;

// Famílias resolvidas em runtime (custom ou fallback)
type FF = { sans: string; sansLight: string; serif: string; ok: boolean };
const FALLBACK_FF: FF = { sans: "helvetica", sansLight: "helvetica", serif: "times", ok: false };

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Pessoas / acompanhantes — [CONFERIR nomes de campo]
// ---------------------------------------------------------------------------
function isCoupleEntry(g: PdfGuest): boolean {
  if (typeof g.is_couple === "boolean") return g.is_couple;
  return / e /i.test(g.name || "");
}
function extraCompanions(g: PdfGuest): { count: number; names: string[] } {
  const names = g.companions_names || [];
  const count = g.companions_count ?? names.length;
  return { count, names };
}
function pessoasNaEntrada(g: PdfGuest): number {
  return (isCoupleEntry(g) ? 2 : 1) + extraCompanions(g).count;
}
function contarPessoas(guests: PdfGuest[]): number {
  return guests.reduce((s, g) => s + pessoasNaEntrada(g), 0);
}

// ---------------------------------------------------------------------------
// Imagem de capa -> dataURL (browser). Em Node/SSR retorna null com segurança.
// ---------------------------------------------------------------------------
async function loadImageAsDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  if (typeof window === "undefined") {
    return src.startsWith("data:") ? { data: src, w: 1, h: 1 } : null;
  }
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
// Buquê (ícone do logo) desenhado com primitivas
// ---------------------------------------------------------------------------
function drawBouquet(doc: jsPDF, x: number, y: number, s: number, color: RGB) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3 * s);
  const r = 1.15 * s;
  const flores: [number, number][] = [
    [x, y], [x + 2.4 * s, y], [x + 1.2 * s, y - 1.6 * s],
    [x - 1.1 * s, y + 1.8 * s], [x + 3.5 * s, y + 1.8 * s], [x + 1.2 * s, y + 1.8 * s],
  ];
  flores.forEach(([cx, cy]) => doc.circle(cx, cy, r, "S"));
  // hastes convergindo
  doc.line(x - 0.2 * s, y + 3 * s, x + 1.2 * s, y + 7 * s);
  doc.line(x + 2.6 * s, y + 3 * s, x + 1.2 * s, y + 7 * s);
  doc.line(x + 1.2 * s, y + 3 * s, x + 1.2 * s, y + 7.2 * s);
  // laço / envoltório
  doc.line(x - 0.3 * s, y + 6.6 * s, x + 2.7 * s, y + 6.6 * s);
  doc.line(x - 0.3 * s, y + 6.6 * s, x + 0.4 * s, y + 9 * s);
  doc.line(x + 2.7 * s, y + 6.6 * s, x + 2.0 * s, y + 9 * s);
  doc.line(x + 0.4 * s, y + 9 * s, x + 2.0 * s, y + 9 * s);
}

// ---------------------------------------------------------------------------
// CAPA
// ---------------------------------------------------------------------------
function drawCover(doc: jsPDF, input: GerarPdfInput, ff: FF, coverImg: { data: string; w: number; h: number } | null) {
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const d = input.dados;

  // bloco bege inferior
  const grayTop = 118;
  doc.setFillColor(...COVER_GRAY);
  doc.rect(0, grayTop, pageW, pageH - grayTop, "F");

  // logo (topo-esquerda)
  drawBouquet(doc, M + 2, 22, 1.5, INK);
  doc.setFont(ff.sans, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("LOGOMARCA", M + 12, 26, { charSpace: 0.3 });

  // endereço / detalhes (topo-direita, coral)
  doc.setFont(ff.sans, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...CORAL);
  const detalhes = [
    d.localCerimonia ? `Cerimônia: ${d.localCerimonia}` : null,
    d.localRecepcao ? `Recepção: ${d.localRecepcao}` : null,
    d.horario ? `Horário: ${d.horario}` : null,
    d.contatoCerimonial ? `Cerimonial: ${d.contatoCerimonial}` : null,
  ].filter(Boolean) as string[];
  detalhes.forEach((l, i) => doc.text(l, pageW - M, 22 + i * 5, { align: "right" }));

  // título (duas linhas, esquerda)
  const partes = cfg.titulo.split(" ");
  const linha1 = partes.slice(0, -1).join(" ");
  const linha2 = partes.slice(-1).join(" ");
  doc.setFont(ff.sans, "normal");
  doc.setFontSize(40);
  doc.setTextColor(...INK);
  doc.text(linha1, M, 46);
  doc.text(linha2, M, 62);

  // foto quadrada
  const boxX = M, boxY = 84, boxW = 118, boxH = 118;
  let drew = false;
  if (coverImg) {
    for (const fmt of ["JPEG", "PNG"] as const) {
      try { doc.addImage(coverImg.data, fmt, boxX, boxY, boxW, boxH, undefined, "FAST"); drew = true; break; } catch { /* tenta próximo */ }
    }
  }
  if (!drew) {
    doc.setFillColor(210, 208, 201);
    doc.rect(boxX, boxY, boxW, boxH, "F");
    doc.setFont(ff.sans, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("FOTO DO CASAL", boxX + boxW / 2, boxY + boxH / 2, { align: "center", charSpace: 1 });
  }

  // faixa translúcida com o nome do casal (Cormorant itálico)
  const bandH = 30, bandY = boxY + boxH - 42, bandW = 110;
  const g: any = (doc as any).GState;
  if (g) { doc.setGState(new g({ opacity: 0.55 })); }
  doc.setFillColor(...WHITE);
  doc.rect(boxX, bandY, bandW, bandH, "F");
  if (g) { doc.setGState(new g({ opacity: 1 })); }
  doc.setFont(ff.serif, "italic");
  doc.setFontSize(34);
  doc.setTextColor(59, 59, 56);
  doc.text(d.nomeCasal || cfg.nomeFallback, boxX + 9, bandY + bandH / 2 + 5);

  // última atualização (discreta, acima do rodapé)
  if (d.ultimaAtualizacao) {
    doc.setFont(ff.sans, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text(`Última atualização em ${fmtDate(d.ultimaAtualizacao)}`, pageW / 2, pageH - 24, { align: "center" });
  }

  // rodapé da capa
  doc.setFont(ff.sans, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("CASAMENTEIRO.COM.BR", M, pageH - 14, { charSpace: 0.6 });
  if (d.dataEvento) {
    const dt = fmtDate(d.dataEvento).toUpperCase();
    doc.text(dt, pageW - M, pageH - 14, { align: "right", charSpace: 0.6 });
  }
}

// ---------------------------------------------------------------------------
// Contexto de renderização das páginas de lista
// ---------------------------------------------------------------------------
type Ctx = {
  doc: jsPDF; input: GerarPdfInput; ff: FF;
  pageW: number; pageH: number; y: number;
  sectionRedraw: ((c: Ctx) => void) | null; // redesenha cabeçalho de seção ao quebrar página
};

function paintPageChrome(c: Ctx) {
  const { doc, ff } = c;
  // fundo bege
  doc.setFillColor(...PAGE_BG);
  doc.rect(0, 0, c.pageW, c.pageH, "F");
  // cabeçalho fixo: logo + subtítulo serifado
  drawBouquet(doc, M + 1, 12.5, 1.05, INK);
  doc.setFont(ff.sans, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("LOGOMARCA", M + 9.5, 16, { charSpace: 0.3 });
  doc.setFont(ff.serif, "bold");
  doc.setFontSize(17);
  doc.setTextColor(...SERIF_GRAY);
  ["lista de", "convidados", "da cerimônia"].forEach((l, i) => doc.text(l, M, 30 + i * 5.6));
}

function newListPage(c: Ctx, isFirst = false) {
  if (!isFirst) c.doc.addPage();
  paintPageChrome(c);
  c.y = TOP_LIST;
}

function ensureSpace(c: Ctx, needed: number) {
  if (c.y + needed > c.pageH - BOTTOM_LIMIT) {
    newListPage(c);
    if (c.sectionRedraw) c.sectionRedraw(c);
  }
}

// ---------------------------------------------------------------------------
// Intro do relatório (título + linha de resumo) — 1x no início de cada relatório
// ---------------------------------------------------------------------------
function drawReportIntro(c: Ctx, titulo: string, guests: PdfGuest[]) {
  const { doc, ff } = c;
  doc.setFont(ff.sans, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(titulo.toUpperCase(), M, c.y, { charSpace: 1.2 });

  const convidados = guests.length;
  const pessoas = contarPessoas(guests);
  const conf = guests.filter((g) => g.rsvp_status === "confirmed").length;
  const pend = guests.filter((g) => g.rsvp_status === "pending").length;
  const rec = guests.filter((g) => g.rsvp_status === "declined").length;
  const mesas = new Set(guests.map((g) => g.table_number).filter((n): n is number => n != null)).size;

  doc.setFont(ff.sansLight, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  const resumo =
    `Convidados: ${convidados}   ·   Pessoas: ${pessoas}   ·   Confirmados: ${conf}   ·   ` +
    `Pendentes: ${pend}   ·   Recusados: ${rec}   ·   Mesas: ${mesas}`;
  doc.text(resumo, M, c.y + 5.5);

  doc.setDrawColor(...LINE_C);
  doc.setLineWidth(0.2);
  doc.line(M, c.y + 9, c.pageW - M, c.y + 9);
  c.y += 16;
}

// ---------------------------------------------------------------------------
// Marcador de status (discreto, na sarjeta à esquerda do nome)
// ---------------------------------------------------------------------------
function drawStatusMarker(doc: jsPDF, x: number, y: number, status: PdfGuest["rsvp_status"]) {
  const cy = y - 1.1;
  if (status === "confirmed") {
    doc.setFillColor(...GRAY_DARK); doc.circle(x, cy, 1.1, "F");
  } else if (status === "declined") {
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3);
    doc.line(x - 1, cy - 1, x + 1, cy + 1); doc.line(x - 1, cy + 1, x + 1, cy - 1);
  } else {
    doc.setDrawColor(...GRAY_DARK); doc.setLineWidth(0.3); doc.circle(x, cy, 1.1, "S");
  }
}

// quadrados pontilhados (1 por pessoa)
function drawSquares(doc: jsPDF, xRight: number, y: number, g: PdfGuest): number {
  const total = pessoasNaEntrada(g);
  const size = 4.6, gap = 1.6;
  doc.setDrawColor(156, 154, 148);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([0.5, 0.6], 0);
  let cx = xRight - total * size - (total - 1) * gap;
  const startX = cx;
  for (let i = 0; i < total; i++) { doc.rect(cx, y - size + 0.4, size, size); cx += size + gap; }
  doc.setLineDashPattern([], 0);
  return startX; // x onde começam os quadrados
}

// ---------------------------------------------------------------------------
// Linha de convidado
// ---------------------------------------------------------------------------
function drawGuestRow(c: Ctx, g: PdfGuest, indentX: number, showTable: boolean) {
  const { doc, ff } = c;
  const y = c.y;
  const boxesRight = c.pageW - M;

  // status
  drawStatusMarker(doc, indentX - 6, y, g.rsvp_status);

  // nome (Poppins Light, rastreado)
  doc.setFont(ff.sansLight, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(g.name, indentX, y, { charSpace: 0.6 });
  const nameW = doc.getTextWidth(g.name) + 0.6 * Math.max(0, g.name.length - 1);

  // quadrados de presença (direita)
  const squaresStartX = drawSquares(doc, boxesRight, y, g);

  // linha pontilhada entre nome e quadrados
  const leaderX1 = indentX + nameW + 3;
  const leaderX2 = squaresStartX - 3;
  if (leaderX2 > leaderX1) {
    doc.setDrawColor(...LINE_C);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([0.4, 0.9], 0);
    doc.line(leaderX1, y - 0.6, leaderX2, y - 0.6);
    doc.setLineDashPattern([], 0);

    // "Mesa X" numa COLUNA FIXA (alinhada em todas as linhas), sobre a pontilhada
    if (showTable) {
      const mesa = g.table_number != null ? `Mesa ${g.table_number}` : "—";
      const mesaCX = c.pageW - M - 50; // coluna fixa; igual em todas as linhas
      doc.setFont(ff.sans, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MESA_C);
      doc.text(mesa, mesaCX, y - 2.6, { align: "center" });
    }
  }

  // acompanhantes extras não listados
  const extras = extraCompanions(g);
  let extraLine = 0;
  if (extras.names.length > 0) {
    doc.setFont(ff.sansLight, "italic");
    doc.setFontSize(7);
    doc.setTextColor(...MESA_C);
    doc.text(`+ ${extras.names.join(", ")}`, squaresStartX, y + 4);
    extraLine = 3;
  }

  c.y = y + 6.6 + extraLine;

  // observações
  if (g.notes && g.notes.trim()) {
    doc.setFont(ff.sansLight, "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...MESA_C);
    const wrapped = doc.splitTextToSize(`Observações: ${g.notes.trim()}`, c.pageW - indentX - M);
    doc.text(wrapped, indentX, c.y - 1.5);
    c.y += wrapped.length * 3.4 + 1.4;
  }
}

// ---------------------------------------------------------------------------
// Cabeçalhos de seção
// ---------------------------------------------------------------------------
function drawBigLetter(c: Ctx, letter: string) {
  const { doc, ff } = c;
  doc.setFont(ff.serif, "normal");
  doc.setFontSize(52);
  doc.setTextColor(...INK);
  doc.text(letter, M, c.y + 13);
  c.y += 4; // nomes começam logo abaixo do topo da letra, indentados à direita
}

function drawGroupHeader(c: Ctx, label: string, count: number) {
  const { doc, ff } = c;
  doc.setFont(ff.serif, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(label, M, c.y + 4);
  const w = doc.getTextWidth(label);
  doc.setFont(ff.sansLight, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  doc.text(`(${count})`, M + w + 3, c.y + 4);
  doc.setDrawColor(...LINE_C);
  doc.setLineWidth(0.2);
  doc.line(M, c.y + 7, c.pageW - M, c.y + 7);
  c.y += 13;
}

// ---------------------------------------------------------------------------
// Relatório ALFABÉTICO
// ---------------------------------------------------------------------------
function drawAlfabetico(c: Ctx) {
  const { guests, groups } = c.input.dados;
  const ordered = [...guests].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  drawReportIntro(c, "Lista alfabética", ordered);

  const nameIndent = M + 24; // à direita da letra grande

  if (c.input.agruparAlfabeticoPor === "grupo") {
    const byGroup = new Map<string, PdfGuest[]>();
    for (const g of ordered) {
      const key = g.group_id || "__none__";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(g);
    }
    const groupName = (id: string) => id === "__none__" ? "Sem grupo" : groups.find((gr) => gr.id === id)?.name || "Grupo";
    const keys = Array.from(byGroup.keys()).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return groupName(a).localeCompare(groupName(b), "pt-BR");
    });
    for (const key of keys) {
      const list = byGroup.get(key)!;
      ensureSpace(c, 22);
      c.sectionRedraw = (cc) => drawGroupHeader(cc, groupName(key) + " (cont.)", list.length);
      drawGroupHeader(c, groupName(key), list.length);
      for (const g of list) { ensureSpace(c, 12); drawGuestRow(c, g, M + 4, true); }
      c.sectionRedraw = null;
      c.y += 3;
    }
  } else {
    let currentLetter = "";
    for (const g of ordered) {
      const letter = (g.name.trim()[0] || "#").toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        ensureSpace(c, 26);
        const secTop = c.y;
        c.sectionRedraw = (cc) => drawBigLetter(cc, letter);
        drawBigLetter(c, letter);
        (c as any)._secTop = secTop;
      }
      ensureSpace(c, 12);
      drawGuestRow(c, g, nameIndent, true);
    }
    c.sectionRedraw = null;
  }
}

// ---------------------------------------------------------------------------
// Relatório POR MESA
// ---------------------------------------------------------------------------
function drawPorMesa(c: Ctx) {
  const { guests } = c.input.dados;
  drawReportIntro(c, "Lista por mesa", guests);

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
    const list = byTable.get(key)!.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const label = key === "__none__" ? "Sem mesa" : `Mesa ${key}`;
    const pessoas = contarPessoas(list);
    const header =
      `${label}  ·  ${list.length} convidado${list.length === 1 ? "" : "s"}  ·  ${pessoas} pessoa${pessoas === 1 ? "" : "s"}`;
    ensureSpace(c, 22);
    c.sectionRedraw = (cc) => drawMesaHeader(cc, header + "  (cont.)");
    drawMesaHeader(c, header);
    for (const g of list) { ensureSpace(c, 12); drawGuestRow(c, g, M + 4, false); }
    c.sectionRedraw = null;
    c.y += 3;
  }
}

function drawMesaHeader(c: Ctx, header: string) {
  const { doc, ff } = c;
  doc.setFont(ff.serif, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(header, M, c.y + 3);
  doc.setDrawColor(...LINE_C);
  doc.setLineWidth(0.2);
  doc.line(M, c.y + 6.5, c.pageW - M, c.y + 6.5);
  c.y += 12;
}

// ---------------------------------------------------------------------------
// Rodapé (páginas de lista, a partir da pág. 2)
// ---------------------------------------------------------------------------
function drawFooterAllPages(doc: jsPDF, input: GerarPdfInput, ff: FF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const d = input.dados;
  const impresso = d.impressoPor
    ? `Impresso por ${d.impressoPor} · ${fmtDateTime(new Date().toISOString())}`
    : `Impressão em ${fmtDateTime(new Date().toISOString())}`;

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE_C);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - 12, pageW - M, pageH - 12);
    doc.setFontSize(6.5);
    doc.setFont(ff.sans, "normal");
    doc.setTextColor(...SOFT);
    doc.text(`LISTA DE CONVIDADOS: ${(d.nomeCasal || "").toUpperCase()}`, M, pageH - 7.5, { charSpace: 0.3 });
    doc.setFont(ff.sans, "bold");
    doc.setTextColor(74, 72, 66);
    doc.text("CASAMENTEIRO.COM.BR", pageW / 2, pageH - 7.5, { align: "center", charSpace: 0.4 });
    doc.setFont(ff.sans, "normal");
    doc.setTextColor(...SOFT);
    doc.text(`${impresso}  ·  Pág. ${i - 1}/${pageCount - 1}`, pageW - M, pageH - 7.5, { align: "right", charSpace: 0.3 });
  }
}

// ---------------------------------------------------------------------------
// Registro de fontes (dinâmico; fallback seguro)
// ---------------------------------------------------------------------------
async function resolveFonts(doc: jsPDF): Promise<FF> {
  try {
    const mod = await import("./pdfFonts");
    mod.registerPdfFonts(doc);
    return { sans: "Poppins", sansLight: "PoppinsLight", serif: "Cormorant", ok: true };
  } catch (e) {
    // Sem as fontes embutidas: usa Helvetica/Times (documento ainda é gerado).
    return FALLBACK_FF;
  }
}

// ---------------------------------------------------------------------------
// Função principal (API inalterada)
// ---------------------------------------------------------------------------
export async function gerarPdfConvidados(input: GerarPdfInput): Promise<void | Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const ff = await resolveFonts(doc);
  const cfg = EVENTO_CONFIG[input.tipoEvento || "casamento"];
  const coverSrc = input.dados.fotoCapaUrl || cfg.imagemPadrao;
  const coverImg = await loadImageAsDataUrl(coverSrc);

  drawCover(doc, input, ff, coverImg);

  const c: Ctx = { doc, input, ff, pageW: doc.internal.pageSize.getWidth(), pageH: doc.internal.pageSize.getHeight(), y: TOP_LIST, sectionRedraw: null };

  if (input.relatorios.alfabetico) { newListPage(c); drawAlfabetico(c); }
  if (input.relatorios.porMesa)   { newListPage(c); drawPorMesa(c); }

  drawFooterAllPages(doc, input, ff);

  if (input.returnBlob) return doc.output("blob");

  const filename = `lista-convidados-${(input.dados.nomeCasal || "casal").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}