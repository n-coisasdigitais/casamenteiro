import logo from "@/assets/casamenteiro-logo.svg.asset.json";

/**
 * Cartão de compartilhamento (1080x1350, formato de post/WhatsApp) com a foto
 * principal do fornecedor ou profissional, nome, categoria e cidade.
 *
 * Por que gerar a imagem aqui: o site é uma SPA, então o WhatsApp/Instagram
 * não leem a foto do perfil no preview do link (eles só enxergam a og-image
 * genérica do index.html). Mandando a imagem junto, a foto principal aparece.
 */

export type DadosCartao = {
  fotoUrl?: string | null;
  nome: string;
  linha1?: string | null; // ex.: "Fotografia" ou "Garçom · Copeira"
  linha2?: string | null; // ex.: "Belo Horizonte, MG"
  selo?: string | null; // ex.: "Verificado" ou "★ 4,9"
  url: string; // link do perfil (aparece escrito no rodapé)
};

const W = 1080;
const H = 1350;
const TINTA = "#1f1d1b";
const TERRACOTA = "#D9905A";

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let url = src;
    if (/^https?:/.test(src)) {
      // Pede com CORS e fura o cache (a cópia em cache veio sem CORS e travaria o canvas).
      img.crossOrigin = "anonymous";
      url = `${src}${src.includes("?") ? "&" : "?"}cartao=1`;
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function desenharCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.max(0, (img.naturalHeight - sh) / 2 - (img.naturalHeight - sh) * 0.15); // puxa um pouco para cima (rostos)
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function quebrarTexto(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= larguraMax) {
      atual = teste;
    } else {
      if (atual) linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const corte = linhas.slice(0, maxLinhas);
    let ultima = corte[maxLinhas - 1];
    while (ctx.measureText(`${ultima}…`).width > larguraMax && ultima.length > 1) ultima = ultima.slice(0, -1);
    corte[maxLinhas - 1] = `${ultima}…`;
    return corte;
  }
  return linhas;
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

export async function gerarCartao(d: DadosCartao): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
  } catch {
    /* segue com a fonte do sistema */
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo claro
  ctx.fillStyle = "#faf7f2";
  ctx.fillRect(0, 0, W, H);

  // Foto principal (área de cima, cantos arredondados)
  const M = 48;
  const fotoH = 860;
  const foto = d.fotoUrl ? await carregarImagem(d.fotoUrl) : null;
  ctx.save();
  arredondado(ctx, M, M, W - M * 2, fotoH, 36);
  ctx.clip();
  if (foto) {
    desenharCover(ctx, foto, M, M, W - M * 2, fotoH);
  } else {
    const g = ctx.createLinearGradient(0, M, 0, M + fotoH);
    g.addColorStop(0, "#f3e3d3");
    g.addColorStop(1, "#e9c9a9");
    ctx.fillStyle = g;
    ctx.fillRect(M, M, W - M * 2, fotoH);
    ctx.fillStyle = TINTA;
    ctx.font = "800 260px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((d.nome.trim()[0] || "C").toUpperCase(), W / 2, M + fotoH / 2);
  }
  ctx.restore();

  // Selo sobre a foto
  if (d.selo) {
    ctx.font = "700 34px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(d.selo).width;
    const bx = M + 32;
    const by = M + 32;
    ctx.fillStyle = "rgba(255,255,255,.94)";
    arredondado(ctx, bx, by, tw + 48, 64, 32);
    ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(d.selo, bx + 24, by + 33);
  }

  // Textos
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = M + fotoH + 92;
  ctx.fillStyle = TINTA;
  ctx.font = "800 64px Inter, system-ui, sans-serif";
  const linhasNome = quebrarTexto(ctx, d.nome, W - M * 2 - 8, 2);
  for (const l of linhasNome) {
    ctx.fillText(l, M + 4, y);
    y += 72;
  }
  const sub = [d.linha1, d.linha2].filter(Boolean).join("  ·  ");
  if (sub) {
    ctx.fillStyle = "#6b625a";
    ctx.font = "500 38px Inter, system-ui, sans-serif";
    ctx.fillText(quebrarTexto(ctx, sub, W - M * 2 - 8, 1)[0], M + 4, y + 2);
    y += 54;
  }
  const linkCurto = d.url.replace(/^https?:\/\/(www\.)?/, "");
  ctx.fillStyle = "#8a8079";
  ctx.font = "500 28px Inter, system-ui, sans-serif";
  ctx.fillText(quebrarTexto(ctx, linkCurto, W - M * 2 - 8, 1)[0], M + 4, y + 2);

  // Rodapé: marca + link
  const rodapeY = H - 70;
  ctx.fillStyle = TINTA;
  ctx.font = "800 40px Inter, system-ui, sans-serif";
  const marca = "casamenteiro";
  const logoImg = await carregarImagem(logo.url);
  let xMarca = M + 4;
  if (logoImg) {
    const lh = 56;
    const lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh || 120;
    ctx.drawImage(logoImg, xMarca - 8, rodapeY - 44, lw, lh);
    xMarca += lw - 22;
  }
  ctx.fillText(marca, xMarca, rodapeY);
  ctx.fillStyle = TERRACOTA;
  ctx.fillText(".", xMarca + ctx.measureText(marca).width, rodapeY);

  // Chamada à direita do rodapé
  ctx.fillStyle = "#a9551f";
  ctx.font = "700 32px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Veja o perfil completo →", W - M - 4, rodapeY);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    } catch {
      resolve(null); // imagem sem CORS: canvas "contaminado"
    }
  });
}

export type ResultadoCompartilhar = "compartilhado" | "link-copiado" | "imagem-baixada" | "cancelado";

function nomeDoArquivo(nome: string) {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "perfil"}-casamenteiro.jpg`;
}

/**
 * Gera o arquivo do cartão. Chame ANTES do clique (ex.: quando o perfil carregar):
 * o iPhone só deixa compartilhar se o share acontecer logo após o toque.
 */
export async function gerarArquivoCartao(d: DadosCartao): Promise<File | null> {
  const blob = await gerarCartao(d);
  return blob ? new File([blob], nomeDoArquivo(d.nome), { type: "image/jpeg" }) : null;
}

/**
 * Compartilha com a imagem quando o aparelho permite (celular), senão cai para
 * o compartilhamento só do link e, por último, copia o link + baixa a imagem.
 */
export async function compartilharPerfil(
  d: DadosCartao & { titulo: string; texto: string },
  arquivoPronto?: File | null,
): Promise<ResultadoCompartilhar> {
  const arquivo = arquivoPronto ?? (await gerarArquivoCartao(d));
  const textoComLink = `${d.texto}\n${d.url}`;

  if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
    try {
      // WhatsApp ignora "url" quando há arquivo; por isso o link vai no texto.
      await navigator.share({ files: [arquivo], title: d.titulo, text: textoComLink });
      return "compartilhado";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelado";
      // NotAllowedError etc.: tenta só o link
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: d.titulo, text: d.texto, url: d.url });
      return "compartilhado";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelado";
    }
  }

  try {
    await navigator.clipboard.writeText(textoComLink);
  } catch {
    /* sem permissão de área de transferência */
  }
  if (arquivo) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(arquivo);
    a.download = arquivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return "imagem-baixada";
  }
  return "link-copiado";
}
