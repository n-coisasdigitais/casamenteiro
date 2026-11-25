import { describe, expect, it } from "vitest";
import {
  CONFIG_PADRAO,
  cobertura,
  distanciaKm,
  duracao,
  faixaCor,
  linhasCategorias,
  matrizProfissionais,
  padraoFaltando,
  resumoCategorias,
  statusMeta,
  vagasPorFuncao,
  type PainelOferta,
} from "./oferta";

const BH = { lat: -19.9167, lng: -43.9345 };
const CONTAGEM = { lat: -19.9317, lng: -44.0536 }; // ~13 km de BH
const UBERLANDIA = { lat: -18.9186, lng: -48.2772 }; // ~470 km de BH

function painel(parcial: Partial<PainelOferta>): PainelOferta {
  return {
    gerado_em: "",
    config: CONFIG_PADRAO,
    categorias: [],
    padrao: [],
    fornecedores: [],
    funil: { cadastrados: 0, aprovados: 0, perfil_completo: 0, receberam_orcamento: 0, fecharam: 0 },
    profissionais: [],
    vagas: [],
    saude: {
      orcamentos_30d: 0,
      resposta_mediana_horas: null,
      pct_respondidos_48h: null,
      contratados_30d: 0,
      pct_fornecedores_ativos_30d: null,
    },
    ...parcial,
  };
}

const cat = (id: string, nivel: any, extra: any = {}) => ({
  id,
  nome: id,
  slug: id,
  ativa: true,
  nivel,
  meta: null,
  rascunho: false,
  ordem: null,
  aprovados: 0,
  pendentes: 0,
  cidades: 0,
  ...extra,
});
const forn = (categoria_id: string, p: { lat: number; lng: number }, extra: any = {}) => ({
  id: Math.random().toString(),
  nome: "x",
  slug: null,
  categoria_id,
  cidade: null,
  uf: "MG",
  raio_km: 150,
  modo: "local",
  cidades_atendidas: null,
  criado_em: "",
  ...p,
  ...extra,
});

describe("distância", () => {
  it("BH → Uberlândia fica perto de 470 km", () => {
    const d = distanciaKm(BH.lat, BH.lng, UBERLANDIA.lat, UBERLANDIA.lng);
    expect(d).toBeGreaterThan(440);
    expect(d).toBeLessThan(500);
  });
});

describe("meta por categoria", () => {
  it("classifica vazia, abaixo e ok", () => {
    expect(statusMeta(0, 5)).toBe("vazia");
    expect(statusMeta(3, 5)).toBe("abaixo");
    expect(statusMeta(5, 5)).toBe("ok");
  });

  it("conta só quem está na região foco (ou atende o Brasil todo)", () => {
    const p = painel({
      categorias: [cat("foto", "essencial"), cat("vestido", "complementar")],
      fornecedores: [
        forn("foto", BH),
        forn("foto", CONTAGEM),
        forn("foto", UBERLANDIA),
        forn("foto", UBERLANDIA, { modo: "nacional" }),
      ],
    });
    const [foto, vestido] = linhasCategorias(p);
    expect(foto.naRegiao).toBe(3);
    expect(foto.metaEfetiva).toBe(5);
    expect(foto.status).toBe("abaixo");
    expect(foto.faltam).toBe(2);
    expect(vestido.status).toBe("vazia");
    const r = resumoCategorias([foto, vestido]);
    expect(r).toMatchObject({ total: 2, vazias: 1, abaixo: 1, essenciaisOk: 0, essenciaisTotal: 1 });
  });

  it("meta própria da categoria vence a meta do nível", () => {
    const p = painel({ categorias: [cat("buffet", "essencial", { meta: 1 })], fornecedores: [forn("buffet", BH)] });
    expect(linhasCategorias(p)[0].status).toBe("ok");
  });

  it("acha as categorias do padrão que faltam, aceitando apelidos", () => {
    const p = painel({
      categorias: [cat("fotografo", "essencial")],
      padrao: [
        { slug: "fotografia", nome: "Fotografia", nivel: "essencial", ordem: 1, aliases: ["fotografo"] },
        { slug: "buffet", nome: "Buffet", nivel: "essencial", ordem: 2, aliases: [] },
      ],
    });
    expect(padraoFaltando(p).map((x) => x.slug)).toEqual(["buffet"]);
  });
});

describe("cobertura de cidades", () => {
  it("raio de 150 km a partir de BH não cobre Uberlândia", () => {
    const r = cobertura([BH, CONTAGEM, UBERLANDIA], [{ ...BH, raio_km: 150, modo: "local" }]);
    expect(r.cobertas).toBe(2);
    expect(r.pct).toBeCloseTo(66.7, 1);
  });
  it("atendimento nacional cobre tudo", () => {
    expect(cobertura([BH, UBERLANDIA], [{ lat: null, lng: null, raio_km: 0, modo: "nacional" }]).pct).toBe(100);
  });
});

describe("profissionais e vagas", () => {
  it("monta a matriz função × cidade", () => {
    const m = matrizProfissionais([
      {
        funcoes: ["Garçom", "Barman"],
        cidade: "Belo Horizonte",
        uf: "MG",
        lat: null,
        lng: null,
        raio_km: 30,
        disponivel: true,
        verificado: true,
      },
      {
        funcoes: ["Garçom"],
        cidade: "Contagem",
        uf: "MG",
        lat: null,
        lng: null,
        raio_km: 30,
        disponivel: false,
        verificado: false,
      },
    ]);
    expect(m.funcoes[0]).toBe("Garçom");
    expect(m.valor("Garçom", "Contagem")).toBe(1);
    expect(matrizProfissionais([], true).funcoes).toEqual([]);
  });
  it("ordena vagas pelas que têm menos candidatos", () => {
    const r = vagasPorFuncao([
      { id: "1", funcao: "Garçom", cidade: null, uf: null, data: "", status: "aberta", vagas: 4, candidatos: 8 },
      { id: "2", funcao: "Barman", cidade: null, uf: null, data: "", status: "aberta", vagas: 2, candidatos: 0 },
    ]);
    expect(r[0].funcao).toBe("Barman");
    expect(r[1].candidatosPorVaga).toBe(2);
  });
});

describe("formatação", () => {
  it("duração legível", () => {
    expect(duracao(42)).toBe("42s");
    expect(duracao(125)).toBe("2min 05s");
    expect(duracao(null)).toBe("—");
  });
  it("cor do mapa cresce com o valor", () => {
    expect(faixaCor(0, 10)).toBe("#f3ede5");
    expect(faixaCor(10, 10)).toBe("#a9551f");
  });
});
