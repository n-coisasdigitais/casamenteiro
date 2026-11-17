import { describe, it, expect } from "vitest";
import { perfilQuePodeAdicionar, possui, contarPerfis } from "@/lib/perfis";

describe("perfis da conta", () => {
  it("profissional pode adicionar fornecedor", () => {
    expect(perfilQuePodeAdicionar({ casal: false, fornecedor: false, profissional: true }, "profissional")).toBe("supplier");
  });
  it("fornecedor pode adicionar profissional", () => {
    expect(perfilQuePodeAdicionar({ casal: false, fornecedor: true, profissional: false }, "supplier")).toBe("profissional");
  });
  it("casal não pode adicionar perfil de trabalho", () => {
    expect(perfilQuePodeAdicionar({ casal: true, fornecedor: false, profissional: false }, "couple")).toBeNull();
  });
  it("conta de sonhos (genérico) não pode adicionar", () => {
    expect(perfilQuePodeAdicionar({ casal: false, fornecedor: false, profissional: false }, "generico")).toBeNull();
  });
  it("quem já tem os dois não vê convite", () => {
    expect(perfilQuePodeAdicionar({ casal: false, fornecedor: true, profissional: true }, "supplier")).toBeNull();
  });
  it("seletor só com 2+ perfis", () => {
    expect(contarPerfis({ casal: false, fornecedor: true, profissional: true })).toBe(2);
    expect(possui({ casal: false, fornecedor: true, profissional: false }, "profissional")).toBe(false);
  });
});
