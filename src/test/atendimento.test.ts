import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { comoAtende, separarCidadeUf, seloAtendimento } from "@/lib/atendimento";

const rio = { city: "Rio de Janeiro", state: "RJ" };
const bh = { lat: -19.9167, lng: -43.9345, estado: "MG" };

describe("comoAtende", () => {
  it("sem cidade na busca, todos contam", () => expect(comoAtende(rio, "")).toBe("local"));
  it("cidade principal", () => expect(comoAtende(rio, "Rio de Janeiro, RJ")).toBe("local"));
  it("cidade listada", () => expect(comoAtende({ ...rio, cidades_atendidas: ["Niterói"] }, "niteroi")).toBe("local"));
  it("raio cobre", () =>
    expect(
      comoAtende({ city: "Contagem", lat: -19.932, lng: -44.0539, raio_atendimento_km: 30 }, "Belo Horizonte", bh),
    ).toBe("local"));
  it("local de fora não aparece", () => expect(comoAtende(rio, "Belo Horizonte", bh)).toBeNull());
  it("nacional aparece como remoto", () =>
    expect(
      comoAtende({ ...rio, atendimento_modo: "nacional", atendimento_formas: ["online"] }, "Belo Horizonte", bh),
    ).toBe("remoto"));
  it("nacional na própria cidade é local", () =>
    expect(comoAtende({ ...rio, atendimento_modo: "nacional", atendimento_formas: ["online"] }, "Rio de Janeiro")).toBe(
      "local",
    ));
});

describe("seloAtendimento", () => {
  it("uma forma", () =>
    expect(seloAtendimento({ atendimento_modo: "nacional", atendimento_formas: ["online"] })).toBe(
      "Todo o Brasil · Online",
    ));
  it("várias formas", () =>
    expect(seloAtendimento({ atendimento_modo: "nacional", atendimento_formas: ["online", "envio"] })).toBe(
      "Atende todo o Brasil",
    ));
  it("local não tem selo", () => expect(seloAtendimento(rio)).toBeNull());
});

describe("separarCidadeUf", () => {
  it("com vírgula", () =>
    expect(separarCidadeUf("Rio de Janeiro, RJ")).toEqual({ cidade: "Rio de Janeiro", uf: "RJ" }));
  it("com traço", () => expect(separarCidadeUf("Bom Jesus - pi")).toEqual({ cidade: "Bom Jesus", uf: "PI" }));
  it("sem UF", () => expect(separarCidadeUf("Contagem")).toEqual({ cidade: "Contagem", uf: null }));
});
