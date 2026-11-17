/**
 * Apresentação do mural em um vídeo só, para postar de uma vez no story (MP4 720×1280, 16 s).
 * Mesmas 5 telas da página /sonho/:codigo: capa, frase, fotos, lugar e convite para o quiz.
 * Sem som: a música da Apple só pode tocar dentro do site; no Instagram, a pessoa usa o adesivo de música.
 * Sem MP4 no aparelho, gera as 5 telas como imagens.
 */
import logoMarca from "@/assets/casamenteiro-logo.svg.asset.json";
import { formatoVideoSuportado, gravarCanvas } from "@/lib/cartaoQuiz";

export type DadosVideoApresentacao = {
  nome: string;
  foto: string | null;
  titulo: string;
  adesivo: string | null;
  frase: string;
  nomeEstilo: string | null;
  paleta: string[];
  fotos: string[];
  lugar: { nome: string; cidade: string | null; uf: string | null } | null;
  /** previewUrl/appleUrl só servem para ouvir a prévia na tela; o arquivo de vídeo sai sem som. */
  musica: { titulo: string; artista: string; previewUrl?: string | null; appleUrl?: string | null } | null;
  madrinha: string | null;
  /** texto exibido no fim, ex.: casamenteiro.com.br/quiz */
  link: string;
};

const W = 1080;
const H = 1920;
const TINTA = "#2B211B";
const TERRA = "#A9582D";
const CREME = "#F6EBE1";
/** Segundos de cada tela: capa, frase (um pouco mais, para dar tempo de ler), fotos, lugar, fim. */
export const TEMPOS = [3, 4, 3, 3, 3];
export const DURACAO_APRESENTACAO = TEMPOS.reduce((a, b) => a + b, 0);
const INICIOS = TEMPOS.map((_, i) => TEMPOS.slice(0, i).reduce((a, b) => a + b, 0));

type Recursos = { foto: HTMLImageElement | null; fotos: (HTMLImageElement | null)[]; logo: HTMLImageElement | null };

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function carregarRecursos(d: DadosVideoApresentacao): Promise<Recursos> {
  try {
    await document.fonts?.load("700 80px Inter");
  } catch {
    /* fonte do sistema */
  }
  const [foto, fotos, logo] = await Promise.all([
    d.foto ? carregarImagem(d.foto) : Promise.resolve(null),
    Promise.all(d.fotos.slice(0, 3).map(carregarImagem)),
    carregarImagem(logoMarca.url),
  ]);
  return { foto, fotos, logo };
}

// ---------- utilidades de desenho ----------
const suave = (x: number) => 1 - Math.pow(1 - x, 3);
const prog = (t: number, ini: number, dur: number) => (t <= ini ? 0 : t >= ini + dur ? 1 : suave((t - ini) / dur));

function entrada(ctx: CanvasRenderingContext2D, p: number, dy: number, desenho: () => void) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= p;
  ctx.translate(0, (1 - p) * dy);
  desenho();
  ctx.restore();
}

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom = 1) {
  const r = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(/\s+/).filter(Boolean)) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Maior fonte em que o texto cabe no número de linhas; corta com reticências se precisar. */
function textoQueCabe(ctx: CanvasRenderingContext2D, texto: string, largura: number, peso: number, max: number, min: number, maxLinhas: number) {
  for (let tam = max; tam >= min; tam -= 4) {
    ctx.font = `${peso} ${tam}px Inter, system-ui, sans-serif`;
    const l = quebrar(ctx, texto, largura);
    if (l.length <= maxLinhas) return { tam, linhas: l };
  }
  ctx.font = `${peso} ${min}px Inter, system-ui, sans-serif`;
  const l = quebrar(ctx, texto, largura).slice(0, maxLinhas);
  l[l.length - 1] = l[l.length - 1].replace(/\s*\S*$/, "") + "…";
  return { tam: min, linhas: l };
}

function fundoFoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cor: string, local: number, dur: number, escuro: number) {
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    cobrir(ctx, img, 0, 0, W, H, 1 + 0.12 * Math.min(1, local / dur));
    ctx.restore();
  } else {
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = `rgba(30,20,14,${escuro})`;
  ctx.fillRect(0, 0, W, H);
}

function barras(ctx: CanvasRenderingContext2D, tela: number, local: number) {
  // telas claras (fotos e fim) usam barras escuras
  const claro = tela === 2 || tela === 4;
  const x0 = 42;
  const gap = 12;
  const w = (W - x0 * 2 - gap * 4) / 5;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = claro ? "rgba(43,33,27,.18)" : "rgba(255,255,255,.35)";
    arredondado(ctx, x, 42, w, 8, 4);
    ctx.fill();
    const f = i < tela ? 1 : i === tela ? Math.min(1, local / TEMPOS[i]) : 0;
    if (f > 0) {
      ctx.fillStyle = claro ? TINTA : "#FFFFFF";
      arredondado(ctx, x, 42, Math.max(8, w * f), 8, 4);
      ctx.fill();
    }
  }
}

function faixaMusica(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao) {
  if (!d.musica) return;
  const x = 42;
  const h = 128;
  const y = H - 54 - h;
  ctx.fillStyle = "rgba(20,14,10,.78)";
  arredondado(ctx, x, y, W - x * 2, h, 36);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.font = "700 46px Inter, system-ui, sans-serif";
  ctx.fillText("♪", x + 40, y + 82);
  const larg = W - x * 2 - 140;
  ctx.font = "600 38px Inter, system-ui, sans-serif";
  const t1 = quebrar(ctx, d.musica.titulo, larg)[0] || "";
  ctx.fillText(t1, x + 110, y + 58);
  ctx.font = "400 32px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#E9DFD6";
  ctx.fillText(quebrar(ctx, d.musica.artista, larg)[0] || "", x + 110, y + 100);
}

// ---------- as 5 telas ----------
function telaCapa(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  ctx.fillStyle = d.madrinha ? "#8A6420" : TERRA;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = 640;
  const raio = 200;
  entrada(ctx, prog(t, 0, 0.7), 40, () => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.clip();
    if (r.foto) cobrir(ctx, r.foto, cx - raio, cy - raio, raio * 2, raio * 2);
    else {
      ctx.fillStyle = "#F3E3D3";
      ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
      ctx.fillStyle = TERRA;
      ctx.font = "400 160px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("♥", cx, cy + 56);
    }
    ctx.restore();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.stroke();
  });
  if (d.adesivo) {
    const p = prog(t, 0.9, 0.45);
    if (p > 0) {
      ctx.save();
      ctx.translate(cx + 210, cy + 150);
      ctx.rotate((-8 * Math.PI) / 180);
      ctx.scale(p, p);
      ctx.font = "700 38px Inter, system-ui, sans-serif";
      const w = ctx.measureText(d.adesivo).width + 56;
      ctx.fillStyle = TINTA;
      arredondado(ctx, -w / 2, -44, w, 88, 20);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(d.adesivo, 0, 13);
      ctx.restore();
    }
  }
  let y = cy + raio + 120;
  if (d.nome) {
    entrada(ctx, prog(t, 0.3, 0.6), 30, () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "500 46px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.nome, cx, y);
    });
    y += 40;
  }
  const { tam, linhas } = textoQueCabe(ctx, d.titulo, W - 160, 700, 96, 60, 4);
  linhas.forEach((l, i) => {
    const yy = y + (i + 1) * tam * 1.1;
    entrada(ctx, prog(t, 0.5 + i * 0.15, 0.6), 40, () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(l, cx, yy);
    });
  });
  if (d.madrinha) {
    const yM = y + (linhas.length + 1) * tam * 1.1 + 20;
    entrada(ctx, prog(t, 1.1, 0.5), 20, () => {
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      const w = ctx.measureText(d.madrinha!).width + 56;
      ctx.fillStyle = "#F3E2B8";
      arredondado(ctx, cx - w / 2, yM - 46, w, 66, 33);
      ctx.fill();
      ctx.fillStyle = "#5C4310";
      ctx.textAlign = "center";
      ctx.fillText(d.madrinha!, cx, yM);
    });
  }
}

function telaFrase(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  fundoFoto(ctx, r.fotos[0], "#9E7B5B", t, TEMPOS[1], 0.6);
  const x = 84;
  entrada(ctx, prog(t, 0, 0.6), 30, () => {
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Meu sonho", x, 560);
  });
  const { tam, linhas } = textoQueCabe(ctx, `“${d.frase}”`, W - x * 2, 600, 84, 52, 8);
  linhas.forEach((l, i) => {
    entrada(ctx, prog(t, 0.25 + i * 0.12, 0.6), 40, () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `600 ${tam}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(l, x, 660 + (i + 1) * tam * 1.25);
    });
  });
}

function telaFotos(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  ctx.fillStyle = CREME;
  ctx.fillRect(0, 0, W, H);
  const x0 = 48;
  const gap = 24;
  const topo = 150;
  const base = d.musica ? H - 260 : H - 120;
  const faixa = 200;
  const altGrade = base - topo - faixa - gap;
  const cw = (W - x0 * 2 - gap) / 2;
  const ch = (altGrade - gap) / 2;
  const caixas = [
    { x: x0, y: topo, w: cw, h: altGrade },
    { x: x0 + cw + gap, y: topo, w: cw, h: ch },
    { x: x0 + cw + gap, y: topo + ch + gap, w: cw, h: ch },
  ];
  const reserva = d.paleta.length ? d.paleta : ["#D9B99A", "#C9A27E", "#B7A99A"];
  caixas.forEach((c, i) => {
    entrada(ctx, prog(t, i * 0.2, 0.6), 60, () => {
      ctx.save();
      arredondado(ctx, c.x, c.y, c.w, c.h, 40);
      ctx.clip();
      const img = r.fotos[i];
      if (img) cobrir(ctx, img, c.x, c.y, c.w, c.h, 1.06 - 0.06 * Math.min(1, t / TEMPOS[2]));
      else {
        ctx.fillStyle = reserva[i % reserva.length];
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
      ctx.restore();
    });
  });
  const yF = topo + altGrade + gap;
  entrada(ctx, prog(t, 0.6, 0.6), 40, () => {
    ctx.fillStyle = reserva[2 % reserva.length];
    arredondado(ctx, x0, yF, W - x0 * 2, faixa, 40);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    const { tam, linhas } = textoQueCabe(ctx, d.nomeEstilo || "Meu casamento dos sonhos", W - x0 * 2 - 80, 600, 56, 40, 2);
    linhas.forEach((l, i) => {
      ctx.font = `600 ${tam}px Inter, system-ui, sans-serif`;
      ctx.fillText(l, x0 + 40, yF + faixa - 44 - (linhas.length - 1 - i) * tam * 1.15);
    });
  });
}

function telaLugar(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  fundoFoto(ctx, r.fotos[1] || r.fotos[0], "#C9A27E", t, TEMPOS[3], 0.55);
  const x = 84;
  const nome = d.lugar?.nome || "Ainda estou escolhendo";
  const extra = d.lugar
    ? [d.lugar.cidade, d.lugar.uf].filter(Boolean).join(", ")
    : d.nomeEstilo
      ? `Mas já sei: ${d.nomeEstilo.toLowerCase()}`
      : "";
  const { tam, linhas } = textoQueCabe(ctx, nome, W - x * 2, 700, 100, 64, 3);
  const base = d.musica ? H - 330 : H - 200;
  const yExtra = base;
  const yNomeFim = extra ? yExtra - 70 : base;
  const yRotulo = yNomeFim - linhas.length * tam * 1.1 - 30;
  entrada(ctx, prog(t, 0, 0.6), 30, () => {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Onde eu sonho casar", x, yRotulo);
  });
  linhas.forEach((l, i) => {
    entrada(ctx, prog(t, 0.25 + i * 0.12, 0.6), 40, () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(l, x, yNomeFim - (linhas.length - 1 - i) * tam * 1.1);
    });
  });
  if (extra) {
    entrada(ctx, prog(t, 0.6, 0.6), 30, () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "400 46px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(extra, x, yExtra);
    });
  }
}

function telaFim(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  // no story nada é clicável: em vez de botão, o endereço grande e fácil de digitar
  ctx.fillStyle = CREME;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  entrada(ctx, prog(t, 0, 0.6), 30, () => {
    ctx.font = "700 48px Inter, system-ui, sans-serif";
    const larguraNome = ctx.measureText("casamenteiro.").width;
    const lh = 96;
    const lw = (lh * 932) / 430;
    const total = (r.logo ? lw * 0.75 : 0) + larguraNome;
    let x = cx - total / 2;
    if (r.logo) {
      ctx.drawImage(r.logo, x, 560 - lh + 22, lw, lh);
      x += lw * 0.75;
    }
    ctx.fillStyle = TINTA;
    ctx.textAlign = "left";
    ctx.fillText("casamenteiro", x, 560);
    ctx.fillStyle = "#D9905A";
    ctx.fillText(".", x + ctx.measureText("casamenteiro").width, 560);
  });
  ["E o seu casamento,", "como seria?"].forEach((l, i) => {
    entrada(ctx, prog(t, 0.25 + i * 0.15, 0.6), 40, () => {
      ctx.fillStyle = TINTA;
      ctx.font = "700 100px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(l, cx, 760 + i * 116);
    });
  });
  entrada(ctx, prog(t, 0.6, 0.6), 30, () => {
    ctx.fillStyle = "#5E4F45";
    ctx.font = "400 46px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Faça o quiz e descubra em 1 minuto:", cx, 1040);
  });
  entrada(ctx, prog(t, 0.85, 0.6), 30, () => {
    // endereço em destaque, numa caixa clara com borda (parece endereço, não botão)
    let tam = 68;
    ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
    while (ctx.measureText(d.link).width > W - 200 && tam > 40) {
      tam -= 2;
      ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
    }
    const w = ctx.measureText(d.link).width + 96;
    const h = tam + 84;
    const y = 1100;
    ctx.fillStyle = "#FFFFFF";
    arredondado(ctx, cx - w / 2, y, w, h, 28);
    ctx.fill();
    ctx.strokeStyle = TERRA;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = TERRA;
    ctx.textAlign = "center";
    ctx.fillText(d.link, cx, y + h / 2 + tam * 0.36);
  });
  entrada(ctx, prog(t, 1.1, 0.6), 20, () => {
    ctx.fillStyle = "#6E625A";
    ctx.font = "400 38px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("É só digitar no navegador.", cx, 1340);
  });
}

const TELAS = [telaCapa, telaFrase, telaFotos, telaLugar, telaFim];

/** Desenha o instante `t` (segundos) do vídeo. */
function desenhar(ctx: CanvasRenderingContext2D, d: DadosVideoApresentacao, r: Recursos, t: number) {
  const tt = Math.min(t, DURACAO_APRESENTACAO - 0.001);
  let tela = INICIOS.length - 1;
  while (tela > 0 && tt < INICIOS[tela]) tela--;
  const local = tt - INICIOS[tela];
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  TELAS[tela](ctx, d, r, local);
  // as telas escuras usam faixa clara; a tela clara do fim não leva a faixa da música
  if (tela < 4) faixaMusica(ctx, d);
  barras(ctx, tela, local);
  // transição curta: escurece no começo de cada tela
  if (tela > 0 && local < 0.25) {
    ctx.fillStyle = `rgba(20,14,10,${0.6 * (1 - local / 0.25)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** Grava o vídeo (MP4 720×1280). Retorna null quando o aparelho não grava MP4. */
export async function gerarVideoApresentacao(d: DadosVideoApresentacao, aoProgresso?: (p: number) => void): Promise<Blob | null> {
  const tipo = formatoVideoSuportado();
  if (!tipo) return null;
  const rec = await carregarRecursos(d);
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(720 / W, 1280 / H);
  return gravarCanvas(canvas, tipo, DURACAO_APRESENTACAO, (t) => desenhar(ctx, d, rec, t), aoProgresso);
}

/** Alternativa sem vídeo: as 5 telas prontas, em JPG 1080×1920. */
export async function gerarImagensApresentacao(d: DadosVideoApresentacao): Promise<Blob[]> {
  const rec = await carregarRecursos(d);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const blobs: Blob[] = [];
  for (let i = 0; i < 5; i++) {
    desenhar(ctx, d, rec, INICIOS[i] + TEMPOS[i] - 0.05);
    blobs.push(
      await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/jpeg", 0.9),
      ),
    );
  }
  return blobs;
}
