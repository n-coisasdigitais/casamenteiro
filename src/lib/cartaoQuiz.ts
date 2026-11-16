/**
 * Card do quiz "Um dia vou casar" para o story: imagem (JPG 1080×1920) e vídeo animado (MP4 720×1280).
 * Desenhado em <canvas>; as fotos precisam aceitar CORS (Unsplash e Supabase Storage aceitam).
 * O vídeo não leva música: no Instagram, a pessoa usa o adesivo de música (licenciado).
 */
import type { FormatoAdesivo } from "@/lib/quiz";
import logoMarca from "@/assets/casamenteiro-logo.svg.asset.json";

export type DadosCartaoQuiz = {
  titulo: string;
  nomeEstilo: string;
  paleta: string[];
  fotos: string[]; // até 3
  fotoPerfil?: string | null;
  adesivo?: string | null;
  mensagem?: string | null;
  formato: FormatoAdesivo;
  /** Selo opcional, ex.: "Topo conhecer alguém" (só para quem entrou na lista do Match). */
  selo?: string | null;
  /** Nível de Madrinha, ex.: "Madrinha de honra": moldura dourada + etiqueta. */
  madrinha?: string | null;
  link: string; // texto exibido, ex.: casamenteiro.com.br/quiz
};

type Recursos = { imgs: (HTMLImageElement | null)[]; perfil: HTMLImageElement | null; logo: HTMLImageElement | null };

const W = 1080;
const H = 1920;
const TINTA = "#2B211B";
const OURO = "#C49A3C";
const CORES_RESERVA = ["#D9B99A", "#C9A27E", "#B7A99A"];
/** Duração do vídeo em segundos: a animação termina em ~4 s e o card fica parado até o fim. */
export const DURACAO_VIDEO = 7;

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function carregarRecursos(d: DadosCartaoQuiz): Promise<Recursos> {
  try {
    await Promise.all([document.fonts?.load("700 80px Inter"), document.fonts?.load("600 58px Caveat")]);
  } catch {
    /* segue com a fonte do sistema */
  }
  const [imgs, perfil, logo] = await Promise.all([
    Promise.all(d.fotos.slice(0, 3).map(carregarImagem)),
    d.fotoPerfil ? carregarImagem(d.fotoPerfil) : Promise.resolve(null),
    carregarImagem(logoMarca.url),
  ]);
  return { imgs, perfil, logo };
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

/** Desenha a imagem cobrindo a área (object-fit: cover). */
function cobrir(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom = 1,
) {
  const escala = Math.max(w / img.width, h / img.height) * zoom;
  const sw = w / escala;
  const sh = h / escala;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  palavras.forEach((p) => {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  });
  if (atual) linhas.push(atual);
  return linhas;
}

/** Ajusta o tamanho da fonte até o título caber em no máximo 4 linhas. */
function tituloQueCabe(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  for (let tam = 104; tam >= 56; tam -= 4) {
    ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
    const linhas = quebrarLinhas(ctx, texto, largura);
    if (linhas.length <= 4) return { tam, linhas };
  }
  ctx.font = "700 56px Inter, system-ui, sans-serif";
  return { tam: 56, linhas: quebrarLinhas(ctx, texto, largura).slice(0, 5) };
}

// ---------- animação ----------
const suave = (x: number) => 1 - Math.pow(1 - x, 3);
/** Progresso 0→1 de um trecho da animação que começa em `ini` e dura `dur` segundos. */
const prog = (t: number, ini: number, dur: number) => (t <= ini ? 0 : t >= ini + dur ? 1 : suave((t - ini) / dur));
/** "Pulo" do adesivo: passa um pouco do tamanho final e volta. */
const pulo = (t: number, ini: number) => {
  if (t <= ini) return 0;
  const x = Math.min(1, (t - ini) / 0.45);
  return x < 1 ? suave(x) * (1 + 0.18 * Math.sin(x * Math.PI)) : 1;
};

function comEntrada(ctx: CanvasRenderingContext2D, p: number, dy: number, desenho: () => void) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= p;
  ctx.translate(0, (1 - p) * dy);
  desenho();
  ctx.restore();
}

function desenharAdesivo(ctx: CanvasRenderingContext2D, d: DadosCartaoQuiz, cx: number, cy: number, escala: number) {
  if (!d.adesivo || escala <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(escala, escala);
  if (d.formato === "postit") {
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.fillStyle = "#F7E27A";
    ctx.fillRect(-130, -120, 260, 240);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.save();
    ctx.rotate((4 * Math.PI) / 180);
    ctx.fillRect(-55, -140, 110, 38);
    ctx.restore();
    ctx.fillStyle = "#3A2E05";
    ctx.font = "600 58px Caveat, 'Comic Sans MS', cursive";
    ctx.textAlign = "center";
    const linhas = quebrarLinhas(ctx, d.adesivo, 220);
    linhas.forEach((l, i) => ctx.fillText(l, 0, 12 + (i - (linhas.length - 1) / 2) * 56));
  } else if (d.formato === "etiqueta") {
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    const w = ctx.measureText(d.adesivo).width + 56;
    ctx.fillStyle = "#FFFFFF";
    arredondado(ctx, -w / 2 - 6, -42, w + 12, 84, 24);
    ctx.fill();
    ctx.fillStyle = TINTA;
    arredondado(ctx, -w / 2, -36, w, 72, 20);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(d.adesivo, 0, 14);
  } else {
    const texto = d.mensagem || d.adesivo;
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.font = "400 36px Inter, system-ui, sans-serif";
    const linhas = quebrarLinhas(ctx, texto, 400);
    const h = 70 + linhas.length * 46 + 40;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E3D3C4";
    ctx.lineWidth = 3;
    arredondado(ctx, -230, -h / 2, 460, h, 30);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#A9582D";
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.fillText("Cupido", -200, -h / 2 + 52);
    ctx.fillStyle = TINTA;
    ctx.font = "400 36px Inter, system-ui, sans-serif";
    linhas.forEach((l, i) => ctx.fillText(l, -200, -h / 2 + 104 + i * 46));
    ctx.fillStyle = "#6E625A";
    ctx.font = "400 26px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("23:47", 200, h / 2 - 22);
  }
  ctx.restore();
}

/** Desenha o card no instante `t` (segundos). Com t = Infinity, desenha o card pronto. */
function desenhar(ctx: CanvasRenderingContext2D, d: DadosCartaoQuiz, rec: Recursos, t: number) {
  const { imgs, perfil } = rec;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#F6EBE1";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = d.madrinha ? "#FBF4E8" : "#FBF4EC";
  arredondado(ctx, 36, 36, W - 72, H - 72, 60);
  ctx.fill();
  ctx.strokeStyle = d.madrinha ? OURO : "#E3D3C4";
  ctx.lineWidth = d.madrinha ? 9 : 3;
  ctx.stroke();

  const M = 96;
  comEntrada(ctx, prog(t, 0, 0.5), 0, () => {
    ctx.fillStyle = TINTA;
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    // marca: símbolo (proporção 932x430, como no site) + nome com o ponto terracota
    let xNome = M;
    if (rec.logo) {
      const lh = 84;
      const lw = (lh * 932) / 430;
      ctx.drawImage(rec.logo, M - 18, 150 - lh + 20, lw, lh);
      xNome = M - 18 + lw * 0.75;
    }
    ctx.fillText("casamenteiro", xNome, 150);
    ctx.fillStyle = "#D9905A";
    ctx.fillText(".", xNome + ctx.measureText("casamenteiro").width, 150);
    if (d.madrinha) {
      ctx.font = "600 32px Inter, system-ui, sans-serif";
      const w = ctx.measureText(d.madrinha).width + 48;
      ctx.fillStyle = "#F3E2B8";
      arredondado(ctx, W - M - w, 106, w, 60, 30);
      ctx.fill();
      ctx.fillStyle = "#5C4310";
      ctx.textAlign = "center";
      ctx.fillText(d.madrinha, W - M - w / 2, 147);
    }
  });

  let y = 230;
  if (perfil) {
    const r = 120;
    const cx = M + r;
    const cy = y + r;
    comEntrada(ctx, prog(t, 0.2, 0.6), 30, () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      cobrir(ctx, perfil, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    desenharAdesivo(ctx, d, cx + 300, cy + 40, pulo(t, 2.6));
    y += r * 2 + 70;
  }

  // título, linha a linha
  const { tam, linhas } = tituloQueCabe(ctx, d.titulo, W - M * 2);
  linhas.forEach((l, i) => {
    y += tam * 1.05;
    const yy = y;
    comEntrada(ctx, prog(t, 0.45 + i * 0.18, 0.5), 40, () => {
      ctx.font = `700 ${tam}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = TINTA;
      ctx.textAlign = "left";
      ctx.fillText(l, M, yy);
    });
  });
  y += 70;
  ctx.font = "400 44px Inter, system-ui, sans-serif";
  const sub = quebrarLinhas(ctx, `Meu casamento vai ser ${d.nomeEstilo.toLowerCase()}`, W - M * 2);
  const ySub = y;
  comEntrada(ctx, prog(t, 1.2, 0.5), 30, () => {
    ctx.font = "400 44px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#5E4F45";
    ctx.textAlign = "left";
    sub.forEach((l, i) => ctx.fillText(l, M, ySub + i * 56));
  });
  y += sub.length * 56;

  // selo opcional (lista do Match)
  if (d.selo) {
    y += 10;
    const ySelo = y;
    comEntrada(ctx, prog(t, 1.5, 0.4), 20, () => {
      ctx.font = "600 36px Inter, system-ui, sans-serif";
      const w = ctx.measureText(d.selo!).width + 56;
      ctx.fillStyle = TINTA;
      arredondado(ctx, M, ySelo, w, 68, 34);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.fillText(d.selo!, M + 28, ySelo + 46);
    });
    y += 90;
  }

  // fotos: entram uma a uma, com zoom lento
  const gap = 24;
  const fw = (W - M * 2 - gap * 2) / 3;
  const fh = 460;
  const topoFotos = Math.min(y + 50, 1080);
  for (let i = 0; i < 3; i++) {
    const x = M + i * (fw + gap);
    const fy = topoFotos + (i === 1 ? 60 : 0);
    const p = prog(t, 1.5 + i * 0.3, 0.6);
    const zoom = Number.isFinite(t) ? 1.08 - 0.08 * prog(t, 1.5 + i * 0.3, 4) : 1;
    comEntrada(ctx, p, 80, () => {
      ctx.save();
      arredondado(ctx, x, fy, fw, fh, 36);
      ctx.clip();
      const img = imgs[i];
      if (img) cobrir(ctx, img, x, fy, fw, fh, zoom);
      else {
        ctx.fillStyle = CORES_RESERVA[i];
        ctx.fillRect(x, fy, fw, fh);
      }
      ctx.restore();
    });
  }
  if (!perfil) desenharAdesivo(ctx, d, M + fw / 2 + 10, topoFotos + fh - 40, pulo(t, 2.6));

  // paleta
  const yPaleta = topoFotos + fh + 120;
  d.paleta.slice(0, 4).forEach((c, i) => {
    comEntrada(ctx, prog(t, 3 + i * 0.1, 0.3), 0, () => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(M + 30 + i * 80, yPaleta, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(43,33,27,.15)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // rodapé
  const yRod = H - 36 - 60 - 200;
  comEntrada(ctx, prog(t, 3.4, 0.5), 60, () => {
    ctx.fillStyle = "#FFFFFF";
    arredondado(ctx, M - 24, yRod, W - (M - 24) * 2, 200, 44);
    ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.textAlign = "left";
    ctx.font = "700 52px Inter, system-ui, sans-serif";
    ctx.fillText("E o seu, como seria?", M + 16, yRod + 88);
    ctx.fillStyle = "#A9582D";
    ctx.font = "600 38px Inter, system-ui, sans-serif";
    ctx.fillText(d.link, M + 16, yRod + 148);
  });
  ctx.restore();
}

/** Card parado, em JPG 1080×1920. */
export async function gerarCartaoQuiz(d: DadosCartaoQuiz): Promise<Blob> {
  const rec = await carregarRecursos(d);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  desenhar(canvas.getContext("2d")!, d, rec, Infinity);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/jpeg", 0.9),
  );
}

/** Formato de vídeo que o aparelho grava e o Instagram aceita (MP4). Sem MP4, não há vídeo. */
export function formatoVideoSuportado(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  const tipos = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"];
  return tipos.find((t) => MediaRecorder.isTypeSupported(t)) || null;
}

/**
 * Vídeo animado (MP4 720×1280, ~7 s), gravado em tempo real no aparelho.
 * Retorna null se o navegador não grava MP4: nesse caso, use a imagem.
 */
export async function gerarVideoCartaoQuiz(
  d: DadosCartaoQuiz,
  aoProgresso?: (p: number) => void,
): Promise<Blob | null> {
  const tipo = formatoVideoSuportado();
  if (!tipo) return null;
  const rec = await carregarRecursos(d);
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(720 / W, 1280 / H);
  desenhar(ctx, d, rec, 0);

  const stream = canvas.captureStream(30);
  const gravador = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 4_000_000 });
  const pedacos: Blob[] = [];
  gravador.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
  const fim = new Promise<void>((resolve) => (gravador.onstop = () => resolve()));
  gravador.start(250);

  await new Promise<void>((resolve) => {
    const t0 = performance.now();
    const quadro = () => {
      const t = (performance.now() - t0) / 1000;
      desenhar(ctx, d, rec, t);
      aoProgresso?.(Math.min(1, t / DURACAO_VIDEO));
      if (t < DURACAO_VIDEO) requestAnimationFrame(quadro);
      else resolve();
    };
    requestAnimationFrame(quadro);
  });
  gravador.stop();
  await fim;
  stream.getTracks().forEach((tr) => tr.stop());
  const blob = new Blob(pedacos, { type: "video/mp4" });
  return blob.size > 0 ? blob : null;
}

/** Compartilha o arquivo (imagem ou vídeo) + link; sem suporte, baixa o arquivo e copia o link. */
export async function compartilharCartaoQuiz(
  blob: Blob,
  url: string,
  texto: string,
): Promise<"compartilhado" | "arquivo-baixado" | "cancelado"> {
  const video = blob.type.startsWith("video/");
  const nome = video ? "um-dia-vou-casar.mp4" : "um-dia-vou-casar.jpg";
  const arquivo = new File([blob], nome, { type: video ? "video/mp4" : "image/jpeg" });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: `${texto} ${url}` });
      return "compartilhado";
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelado";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /* noop */
  }
  return "arquivo-baixado";
}
