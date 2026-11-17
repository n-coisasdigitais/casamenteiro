import { describe, it, expect } from "vitest";
import { abaInicial, economiaAnual, normalizar, perguntasVisiveis, preencherAjuda, statusCard, type FaqItem, type ValoresAjuda } from "@/lib/ajudaTexto";

const base = (o: Partial<FaqItem>): FaqItem => ({ id: o.slug || "x", publico: "todos", categoria: "Geral", pergunta: "P", slug: "p", resposta: "R", feature_flag: null, ordem: 0, ativo: true, ...o });
const valores = (planos: ValoresAjuda["planos"]): ValoresAjuda => ({ taxaReserva: 100, carenciaDias: 7, testeDias: 60, aprovacaoHoras: 24, planos });

describe("Central de Ajuda", () => {
  it("preço do Pro vem do plano: mudar o preço muda o texto", () => {
    const t = "Pro por {preco_pro}/mês";
    expect(preencherAjuda(t, valores([{ slug: "pro", nome: "Pro", preco_mensal: 99.9, preco_anual: 999 }]))).toContain("99,90");
    expect(preencherAjuda(t, valores([{ slug: "pro", nome: "Pro", preco_mensal: 129.9, preco_anual: 999 }]))).toContain("129,90");
  });
  it("plano inativo (fora da lista) não mostra preço", () => {
    expect(preencherAjuda("{preco_premium}", valores([{ slug: "pro", nome: "Pro", preco_mensal: 99.9, preco_anual: 999 }]))).toBe("consulte os planos");
  });
  it("troca taxa, carência, teste e aprovação", () => {
    expect(preencherAjuda("{taxa_reserva}|{carencia_dias}|{teste_dias}|{aprovacao_horas}", valores([]))).toMatch(/100.*\|7\|60\|24/);
  });
  it("economia anual de 999 contra 99,90/mês é 17%", () => {
    expect(economiaAnual(99.9, 999)).toBe(17);
    expect(economiaAnual(0, 0)).toBe(0);
  });
  it("flag desligada esconde a pergunta", () => {
    const itens = [base({ slug: "a", feature_flag: "rsvp_convidados", publico: "casal" }), base({ slug: "b", publico: "casal" })];
    expect(perguntasVisiveis(itens, "casal", { rsvp_convidados: false }).map((i) => i.slug)).toEqual(["b"]);
    expect(perguntasVisiveis(itens, "casal", { rsvp_convidados: true })).toHaveLength(2);
  });
  it("pergunta inativa ou de outro público não aparece; 'todos' aparece em toda aba", () => {
    const itens = [base({ slug: "a", ativo: false }), base({ slug: "b", publico: "fornecedor" }), base({ slug: "c" })];
    expect(perguntasVisiveis(itens, "casal", {}).map((i) => i.slug)).toEqual(["c"]);
  });
  it("busca ignora acento e maiúscula", () => {
    expect(normalizar("Ociosa É")).toBe("ociosa e");
    const itens = [base({ slug: "a", pergunta: "O que é data ociosa?" }), base({ slug: "b", pergunta: "RSVP" })];
    expect(perguntasVisiveis(itens, "casal", {}, "DATA OCIOSA").map((i) => i.slug)).toEqual(["a"]);
    expect(perguntasVisiveis(itens, "casal", {}, "é").length).toBeGreaterThan(0);
  });
  it("?para= abre a aba; senão perfil ativo; padrão casal", () => {
    expect(abaInicial("profissional", "supplier")).toBe("profissional");
    expect(abaInicial(null, "supplier")).toBe("fornecedor");
    expect(abaInicial("xyz", null)).toBe("casal");
  });
  it("card: ligado normal, desligado com Em breve tem selo, sem Em breve some", () => {
    expect(statusCard({ vagas: true }, {}, "vagas")).toBe("ativo");
    expect(statusCard({ vagas: false }, { vagas: true }, "vagas")).toBe("em_breve");
    expect(statusCard({ vagas: false }, { vagas: false }, "vagas")).toBe("oculto");
  });
});
