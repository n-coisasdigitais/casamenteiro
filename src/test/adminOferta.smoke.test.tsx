import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const painel = {
  gerado_em: "",
  config: {
    foco_nome: "BH e região",
    foco_cidade: "Belo Horizonte",
    foco_uf: "MG",
    foco_lat: -19.9,
    foco_lng: -43.9,
    foco_raio_km: 60,
    meta: { essencial: 5, recomendada: 3, complementar: 1 },
  },
  categorias: [
    {
      id: "c1",
      nome: "Fotografia",
      slug: "fotografia",
      ativa: true,
      nivel: "essencial",
      meta: null,
      rascunho: false,
      ordem: 3,
      aprovados: 2,
      pendentes: 1,
      cidades: 1,
    },
    {
      id: "c2",
      nome: "Celebrante",
      slug: "celebrante",
      ativa: true,
      nivel: "essencial",
      meta: null,
      rascunho: true,
      ordem: 8,
      aprovados: 0,
      pendentes: 0,
      cidades: 0,
    },
  ],
  padrao: [{ slug: "buffet", nome: "Buffet", nivel: "essencial", ordem: 2, aliases: [] }],
  fornecedores: [
    {
      id: "f1",
      nome: "Foto A",
      slug: null,
      categoria_id: "c1",
      cidade: "Belo Horizonte",
      uf: "MG",
      lat: -19.92,
      lng: -43.94,
      raio_km: 150,
      modo: "local",
      cidades_atendidas: null,
      criado_em: "",
    },
  ],
  funil: { cadastrados: 5, aprovados: 1, perfil_completo: 1, receberam_orcamento: 1, fecharam: 0 },
  profissionais: [
    {
      funcoes: ["Garçom"],
      cidade: "Belo Horizonte",
      uf: "MG",
      lat: null,
      lng: null,
      raio_km: 30,
      disponivel: true,
      verificado: false,
    },
  ],
  vagas: [
    {
      id: "v1",
      funcao: "Garçom",
      cidade: "BH",
      uf: "MG",
      data: "2026-12-01",
      status: "aberta",
      vagas: 3,
      candidatos: 1,
    },
  ],
  saude: {
    orcamentos_30d: 4,
    resposta_mediana_horas: 5,
    pct_respondidos_48h: 75,
    contratados_30d: 1,
    pct_fornecedores_ativos_30d: 50,
  },
};

const comportamento = {
  kpis: [
    {
      visitantes: 120,
      visitantes_logados: 30,
      sessoes: 150,
      pageviews: 600,
      buscas: 40,
      buscas_sem_resultado: 6,
      pessoas_buscaram: 35,
      pessoas_viram_perfil: 25,
      pessoas_pediram_orcamento: 8,
      orcamentos: 9,
      cliques_whatsapp: 4,
      rage_clicks: 2,
      dead_clicks: 1,
    },
  ],
  sessoes_resumo: [{ sessoes: 150, duracao_mediana_s: 95, paginas_por_sessao: 3.2, pct_rejeicao: 41 }],
  diario: [{ dia: "2026-11-23", visitantes: 50, sessoes: 60, pageviews: 200, buscas: 10, orcamentos: 3 }],
  paginas: [{ pagina: "/", visualizacoes: 300, visitantes: 100, tempo_medio_s: 40, pct_saida: 30 }],
  caminhos: [{ de: "/", para: "/categoria/buffet", vezes: 50 }],
  buscas: [{ cidade: "Contagem", procura: "celebrante", buscas: 6, sem_resultado: 6, media_resultados: 0 }],
  sessoes_recentes: [
    {
      session_id: "s1",
      distinct_id: "d",
      tipo_conta: "couple",
      inicio: "2026-11-24T10:00:00Z",
      duracao_s: 120,
      paginas: 4,
      entrada: "/",
      saida: "/fornecedor/:id",
      buscas: 1,
      orcamentos: 1,
      whatsapp: 0,
      rage_clicks: 0,
      dispositivo: "Mobile",
      cidade: "Belo Horizonte",
    },
  ],
  erros: [],
  replay_base: "https://us.posthog.com/project/765085/replay/",
  gerado_em: "",
};

vi.mock("@/integrations/supabase/client", () => {
  const sel = { select: () => sel, eq: () => sel, range: async () => ({ data: [], error: null }) };
  return {
    supabase: {
      rpc: async () => ({ data: painel, error: null }),
      from: () => sel,
      functions: {
        invoke: async (_: string, { body }: any) => ({
          data: body.acao === "heatmap" ? { pontos: [], dobra: null, mais: false } : comportamento,
          error: null,
        }),
      },
    },
  };
});
vi.mock("leaflet", () => ({ default: {} }));
vi.mock("recharts", async () => {
  const React = await import("react");
  const Box = ({ children }: any) => React.createElement("div", null, children);
  return {
    ResponsiveContainer: Box,
    AreaChart: Box,
    Area: Box,
    CartesianGrid: Box,
    XAxis: Box,
    YAxis: Box,
    Tooltip: Box,
  };
});

globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as any;
globalThis.fetch = (async () => ({
  json: async () => ({ w: 10, h: 10, paths: { MG: "M0 0H5V5Z" }, cent: { MG: [2, 2] } }),
})) as any;
HTMLCanvasElement.prototype.getContext = (() => null) as any;

import AdminOferta from "@/pages/AdminOferta";
import AdminOfertaCategorias from "@/pages/AdminOfertaCategorias";
import AdminOfertaMapa from "@/pages/AdminOfertaMapa";
import AdminOfertaProfissionais from "@/pages/AdminOfertaProfissionais";
import AdminComportamento from "@/pages/AdminComportamento";

const montar = (el: JSX.Element) => render(<MemoryRouter>{el}</MemoryRouter>);

describe("telas novas do admin renderizam com dados", () => {
  it("painel de oferta", async () => {
    montar(<AdminOferta />);
    await waitFor(() => expect(screen.getByText(/Falta 1 categoria do padrão/)).toBeTruthy());
    expect(screen.getAllByText("Fotografia").length).toBeGreaterThan(0);
  });
  it("categorias", async () => {
    montar(<AdminOfertaCategorias />);
    await waitFor(() => expect(screen.getByText("2 categorias")).toBeTruthy());
    expect(screen.getByText(/Rascunho · publicar/)).toBeTruthy();
  });
  it("mapa", async () => {
    montar(<AdminOfertaMapa />);
    await waitFor(() => expect(screen.getByText(/Fornecedores com sede em MG/)).toBeTruthy());
  });
  it("profissionais", async () => {
    montar(<AdminOfertaProfissionais />);
    await waitFor(() => expect(screen.getByText("Função × cidade")).toBeTruthy());
    expect(screen.getAllByText("Garçom").length).toBeGreaterThan(0);
  });
  it("comportamento", async () => {
    montar(<AdminComportamento />);
    await waitFor(() => expect(screen.getByText("Buscas sem resultado")).toBeTruthy());
    expect(screen.getAllByText("Contagem").length).toBe(2);
    expect(screen.getByText(/Assistir/)).toBeTruthy();
  });
});
