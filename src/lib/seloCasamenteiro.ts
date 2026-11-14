import QRCode from "qrcode";
import logo from "@/assets/casamenteiro-logo.svg.asset.json";

/**
 * Selo "Estou no Casamenteiro": imagem com QR code que leva ao perfil do fornecedor.
 * O fornecedor posta no story, no status do WhatsApp ou imprime no balcão/stand.
 * Cada leitura do QR chega com utm_source=selo, então dá para medir no GA4 quantos casais vieram por ele.
 */

export type FormatoSelo = "story" | "quadrado";

export type DadosSelo = {
  nome: string;
  categoria?: string | null;
  cidade?: string | null;
  fotoUrl?: string | null;
  url: string; // link público do perfil, sem UTM
};

const TINTA = "#1f1d1b";
const TERRACOTA = "#D9905A";
const BARRO = "#a9551f";
const FUNDO = "#faf7f2";

const TAMANHO: Record<FormatoSelo, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  quadrado: { w: 1080, h: 1080 },
};

export function urlComUtm(url: string, formato: FormatoSelo) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "selo");
  u.searchParams.set("utm_medium", formato === "story" ? "story" : "qr");
  u.searchParams.set("utm_campaign", "estou-no-casamenteiro");
  return u.toString();
}

function carregar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let url = src;
    if (/^https?:/.test(src)) {
      img.crossOrigin = "anonymous";
      url = `${src}${src.includes("?") ? "&" : "?"}selo=1`;
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, Math.max(0, (img.naturalHeight - sh) * 0.35), sw, sh, x, y, w, h);
}

function cortar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  let t = texto;
  while (ctx.measureText(t).width > max && t.length > 1) t = t.slice(0, -1);
  return t === texto ? t : `${t.trimEnd()}…`;
}

async function desenharMarca(ctx: CanvasRenderingContext2D, xCentro: number, y: number, tamanho: number) {
  ctx.font = `800 ${tamanho}px Inter, system-ui, sans-serif`;
  const marca = "casamenteiro";
  const larguraTexto = ctx.measureText(marca).width + ctx.measureText(".").width;
  const logoImg = await carregar(logo.url);
  const lh = tamanho * 1.35;
  const lw = logoImg ? (logoImg.naturalWidth / logoImg.naturalHeight) * lh : 0;
  const sobreposicao = logoImg ? lh * 0.4 : 0;
  const total = lw - sobreposicao + larguraTexto;
  let x = xCentro - total / 2;
  if (logoImg) {
    ctx.drawImage(logoImg, x, y - lh * 0.8, lw, lh);
    x += lw - sobreposicao;
  }
  ctx.textAlign = "left";
  ctx.fillStyle = TINTA;
  ctx.fillText(marca, x, y);
  ctx.fillStyle = TERRACOTA;
  ctx.fillText(".", x + ctx.measureText(marca).width, y);
}

export async function gerarSelo(d: DadosSelo, formato: FormatoSelo): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonte do sistema */
  }
  const { w: W, h: H } = TAMANHO[formato];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = FUNDO;
  ctx.fillRect(0, 0, W, H);

  const qrCanvas = document.createElement("canvas");
  const story = formato === "story";
  const qrTam = story ? 480 : 400;
  await QRCode.toCanvas(qrCanvas, urlComUtm(d.url, formato), {
    width: qrTam,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: TINTA, light: "#ffffff" },
  });

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (story) {
    // Foto no topo
    const M = 64;
    const fotoH = 640;
    const foto = d.fotoUrl ? await carregar(d.fotoUrl) : null;
    ctx.save();
    retangulo(ctx, M, M, W - M * 2, fotoH, 40);
    ctx.clip();
    if (foto) cobrir(ctx, foto, M, M, W - M * 2, fotoH);
    else {
      ctx.fillStyle = "#efe2d4";
      ctx.fillRect(M, M, W - M * 2, fotoH);
    }
    ctx.restore();

    // Etiqueta
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    const etiqueta = "ESTOU NO CASAMENTEIRO";
    const ew = ctx.measureText(etiqueta).width + 72;
    ctx.fillStyle = BARRO;
    retangulo(ctx, cx - ew / 2, M + fotoH - 40, ew, 80, 40);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(etiqueta, cx, M + fotoH + 2);
    ctx.textBaseline = "alphabetic";

    // Nome e categoria
    ctx.fillStyle = TINTA;
    ctx.font = "800 68px Inter, system-ui, sans-serif";
    ctx.fillText(cortar(ctx, d.nome, W - 160), cx, 880);
    const sub = [d.categoria, d.cidade].filter(Boolean).join("  ·  ");
    if (sub) {
      ctx.fillStyle = "#6b625a";
      ctx.font = "500 38px Inter, system-ui, sans-serif";
      ctx.fillText(cortar(ctx, sub, W - 160), cx, 944);
    }

    // QR
    const qy = 1010;
    ctx.fillStyle = "#fff";
    retangulo(ctx, cx - qrTam / 2 - 32, qy, qrTam + 64, qrTam + 64, 36);
    ctx.fill();
    ctx.drawImage(qrCanvas, cx - qrTam / 2, qy + 32, qrTam, qrTam);

    ctx.fillStyle = TINTA;
    ctx.font = "700 42px Inter, system-ui, sans-serif";
    ctx.fillText("Aponte a câmera e peça seu orçamento", cx, qy + qrTam + 140);
    ctx.fillStyle = "#8a8079";
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    ctx.fillText(cortar(ctx, d.url.replace(/^https?:\/\/(www\.)?/, ""), W - 160), cx, qy + qrTam + 196);

    await desenharMarca(ctx, cx, H - 90, 46);
  } else {
    // Quadrado: para imprimir (balcão, stand de feira) ou colocar no site do fornecedor
    ctx.fillStyle = BARRO;
    ctx.font = "700 34px Inter, system-ui, sans-serif";
    ctx.fillText("ENCONTRE A GENTE NO", cx, 110);
    await desenharMarca(ctx, cx, 190, 64);

    const qy = 250;
    ctx.fillStyle = "#fff";
    retangulo(ctx, cx - qrTam / 2 - 28, qy, qrTam + 56, qrTam + 56, 32);
    ctx.fill();
    ctx.drawImage(qrCanvas, cx - qrTam / 2, qy + 28, qrTam, qrTam);

    ctx.fillStyle = TINTA;
    ctx.font = "800 54px Inter, system-ui, sans-serif";
    ctx.fillText(cortar(ctx, d.nome, W - 140), cx, 820);
    const sub = [d.categoria, d.cidade].filter(Boolean).join("  ·  ");
    if (sub) {
      ctx.fillStyle = "#6b625a";
      ctx.font = "500 34px Inter, system-ui, sans-serif";
      ctx.fillText(cortar(ctx, sub, W - 140), cx, 876);
    }
    ctx.fillStyle = TINTA;
    ctx.font = "600 34px Inter, system-ui, sans-serif";
    ctx.fillText("Veja fotos, avaliações e peça seu orçamento", cx, 960);
    ctx.fillStyle = "#8a8079";
    ctx.font = "500 26px Inter, system-ui, sans-serif";
    ctx.fillText(cortar(ctx, d.url.replace(/^https?:\/\/(www\.)?/, ""), W - 140), cx, 1010);
  }

  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}