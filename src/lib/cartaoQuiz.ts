/**
 * Card 1080×1920 do quiz "Um dia vou casar" para o story.
 * Desenhado em <canvas>; as fotos precisam aceitar CORS (Unsplash e Supabase Storage aceitam).
 */
import type { FormatoAdesivo } from "@/lib/quiz";

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
  link: string; // texto exibido, ex.: casamenteiro.com.br/quiz
};

const W = 1080;
const H = 1920;
const TINTA = "#2B211B";
const CORES_RESERVA = ["#D9B99A", "#C9A27E", "#B7A99A"];

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
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
function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const escala = Math.max(w / img.width, h / img.height);
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

function desenharAdesivo(ctx: CanvasRenderingContext2D, d: DadosCartaoQuiz, cx: number, cy: number) {
  if (!d.adesivo) return;
  ctx.save();
  if (d.formato === "postit") {
    ctx.translate(cx, cy);
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
    ctx.translate(cx, cy);
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
    ctx.translate(cx, cy);
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.font = "400 36px Inter, system-ui, sans-serif";
    const linhas = quebrarLinhas(ctx, texto, 400);
    const h = 70 + linhas.length * 46 + 40;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E3D3C4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-230 + 12, -h / 2);
    ctx.arcTo(230, -h / 2, 230, h / 2, 36);
    ctx.arcTo(230, h / 2, -230, h / 2, 36);
    ctx.arcTo(-230, h / 2, -230, -h / 2, 36);
    ctx.lineTo(-230, -h / 2);
    ctx.closePath();
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

export async function gerarCartaoQuiz(d: DadosCartaoQuiz): Promise<Blob> {
  try {
    await Promise.all([document.fonts?.load("700 80px Inter"), document.fonts?.load("600 58px Caveat")]);
  } catch {
    /* segue com a fonte do sistema */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const imgs = await Promise.all(d.fotos.slice(0, 3).map(carregarImagem));
  const perfil = d.fotoPerfil ? await carregarImagem(d.fotoPerfil) : null;

  // fundo e moldura
  ctx.fillStyle = "#F6EBE1";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FBF4EC";
  arredondado(ctx, 36, 36, W - 72, H - 72, 60);
  ctx.fill();
  ctx.strokeStyle = "#E3D3C4";
  ctx.lineWidth = 3;
  ctx.stroke();

  const M = 96;
  ctx.fillStyle = TINTA;
  ctx.font = "700 40px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("casamenteiro", M, 150);

  let y = 230;
  if (perfil) {
    const r = 120;
    const cx = M + r;
    const cy = y + r;
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
    desenharAdesivo(ctx, d, cx + 300, cy + 40);
    y += r * 2 + 70;
  }

  // título
  const { tam, linhas } = tituloQueCabe(ctx, d.titulo, W - M * 2);
  ctx.fillStyle = TINTA;
  ctx.textAlign = "left";
  linhas.forEach((l) => {
    y += tam * 1.05;
    ctx.fillText(l, M, y);
  });
  y += 70;
  ctx.font = "400 44px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#5E4F45";
  quebrarLinhas(ctx, `Meu casamento vai ser ${d.nomeEstilo.toLowerCase()}`, W - M * 2).forEach((l) => {
    ctx.fillText(l, M, y);
    y += 56;
  });

  // selo opcional (lista do Match)
  if (d.selo) {
    y += 10;
    ctx.font = "600 36px Inter, system-ui, sans-serif";
    const w = ctx.measureText(d.selo).width + 56;
    ctx.fillStyle = TINTA;
    arredondado(ctx, M, y, w, 68, 34);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(d.selo, M + 28, y + 46);
    y += 90;
  }

  // fotos
  const gap = 24;
  const fw = (W - M * 2 - gap * 2) / 3;
  const fh = 460;
  const topoFotos = Math.min(y + 50, 1080);
  for (let i = 0; i < 3; i++) {
    const x = M + i * (fw + gap);
    const fy = topoFotos + (i === 1 ? 60 : 0);
    ctx.save();
    arredondado(ctx, x, fy, fw, fh, 36);
    ctx.clip();
    const img = imgs[i];
    if (img) cobrir(ctx, img, x, fy, fw, fh);
    else {
      ctx.fillStyle = CORES_RESERVA[i];
      ctx.fillRect(x, fy, fw, fh);
    }
    ctx.restore();
  }
  if (!perfil) desenharAdesivo(ctx, d, M + fw / 2 + 10, topoFotos + fh - 40);

  // paleta
  const yPaleta = topoFotos + fh + 120;
  d.paleta.slice(0, 4).forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(M + 30 + i * 80, yPaleta, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(43,33,27,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // rodapé
  const yRod = H - 36 - 60 - 200;
  ctx.fillStyle = "#FFFFFF";
  arredondado(ctx, M - 24, yRod, W - (M - 24) * 2, 200, 44);
  ctx.fill();
  ctx.fillStyle = TINTA;
  ctx.font = "700 52px Inter, system-ui, sans-serif";
  ctx.fillText("E o seu, como seria?", M + 16, yRod + 88);
  ctx.fillStyle = "#A9582D";
  ctx.font = "600 38px Inter, system-ui, sans-serif";
  ctx.fillText(d.link, M + 16, yRod + 148);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/jpeg", 0.9),
  );
}

/** Compartilha a imagem + link; sem suporte, baixa a imagem e copia o link. */
export async function compartilharCartaoQuiz(
  blob: Blob,
  url: string,
  texto: string,
): Promise<"compartilhado" | "imagem-baixada" | "cancelado"> {
  const arquivo = new File([blob], "um-dia-vou-casar.jpg", { type: "image/jpeg" });
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
  a.download = "um-dia-vou-casar.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /* noop */
  }
  return "imagem-baixada";
}
