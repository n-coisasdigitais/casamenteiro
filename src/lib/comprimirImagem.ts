/**
 * Compressão de imagem no navegador, antes do upload.
 * Foto de celular (4–10 MB) → ~200–400 KB, sem perda visível.
 *
 * - Redimensiona para no máximo `maxLado` px no maior lado.
 * - Converte para WebP (ou JPEG/PNG, se pedido) com qualidade `qualidade`.
 * - Não mexe em SVG/GIF, em arquivos já pequenos, nem quando o resultado não fica menor.
 * - Se o navegador não conseguir ler a imagem (ex.: HEIC no Chrome), devolve o original.
 */

export type OpcoesCompressao = {
  maxLado?: number;
  qualidade?: number;
  /** Formato de saída. "auto" = WebP. */
  formato?: "auto" | "image/webp" | "image/jpeg" | "image/png";
  /** Abaixo disso, não comprime (bytes). */
  minBytes?: number;
};

export const FOTO_GALERIA: OpcoesCompressao = { maxLado: 1600, qualidade: 0.82, minBytes: 350 * 1024 };
export const FOTO_PERFIL: OpcoesCompressao = { maxLado: 800, qualidade: 0.85, minBytes: 150 * 1024 };
export const LOGO: OpcoesCompressao = { maxLado: 512, qualidade: 0.9, minBytes: 100 * 1024 };

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export type ImagemComprimida = {
  blob: Blob;
  tipo: string;
  extensao: string;
  comprimiu: boolean;
};

async function carregar(
  blob: Blob,
): Promise<{
  largura: number;
  altura: number;
  desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  fechar: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation respeita a rotação EXIF das fotos de celular
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return {
        largura: bmp.width,
        altura: bmp.height,
        desenhar: (c, w, h) => c.drawImage(bmp, 0, 0, w, h),
        fechar: () => bmp.close(),
      };
    } catch {
      // navegador antigo: tenta pelo <img> abaixo (que também respeita o EXIF)
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return {
    largura: img.naturalWidth,
    altura: img.naturalHeight,
    desenhar: (c, w, h) => c.drawImage(img, 0, 0, w, h),
    fechar: () => URL.revokeObjectURL(url),
  };
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob((b) => ok(b), tipo, qualidade));
}

export async function comprimirImagem(
  arquivo: Blob,
  opcoes: OpcoesCompressao = FOTO_GALERIA,
): Promise<ImagemComprimida> {
  const { maxLado = 1600, qualidade = 0.82, formato = "auto", minBytes = 350 * 1024 } = opcoes;
  const tipoOriginal = arquivo.type || "image/jpeg";
  const original: ImagemComprimida = {
    blob: arquivo,
    tipo: tipoOriginal,
    extensao:
      EXT[tipoOriginal] || (arquivo instanceof File ? arquivo.name.split(".").pop()?.toLowerCase() || "jpg" : "jpg"),
    comprimiu: false,
  };
  if (/svg|gif/.test(tipoOriginal)) return original;

  let img;
  try {
    img = await carregar(arquivo);
  } catch {
    return original;
  }
  try {
    const escala = Math.min(1, maxLado / Math.max(img.largura, img.altura));
    if (escala === 1 && arquivo.size <= minBytes) return original;

    const w = Math.max(1, Math.round(img.largura * escala));
    const h = Math.max(1, Math.round(img.altura * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.imageSmoothingQuality = "high";

    let tipo = formato === "auto" ? "image/webp" : formato;
    if (tipo === "image/jpeg") {
      // JPEG não tem transparência: fundo branco
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }
    img.desenhar(ctx, w, h);

    let blob = await paraBlob(canvas, tipo, qualidade);
    // Safari antigo não gera WebP: cai para JPEG
    if (blob && tipo === "image/webp" && blob.type !== "image/webp") {
      tipo = "image/jpeg";
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      blob = await paraBlob(canvas, tipo, qualidade);
    }
    if (!blob || blob.size >= arquivo.size) return original;
    return { blob, tipo, extensao: EXT[tipo], comprimiu: true };
  } finally {
    img.fechar();
  }
}

/** Nome de arquivo seguro com a extensão certa: "Foto Praia (1).HEIC" → "foto-praia-1.webp" */
export function nomeArquivo(nomeOriginal: string, extensao: string): string {
  const base =
    (nomeOriginal || "foto")
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "foto";
  return `${base}.${extensao}`;
}
