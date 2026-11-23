import { describe, expect, it } from "vitest";
import { filtroComunicacao } from "@/lib/comunicacao";

describe("filtro de pendências na comunicação", () => {
  it("filtra fornecedores pelos dados incompletos", () => expect(filtroComunicacao("suppliers", "dados")).toBe("dados"));
  it("preserva a seleção de documentos dos profissionais", () => expect(filtroComunicacao("profissionais", "documentos")).toBe("documentos"));
  it("preserva dados ou documentos incompletos dos profissionais", () => expect(filtroComunicacao("profissionais", "incompleto")).toBe("incompleto"));
  it("não impõe documentos obrigatórios aos fornecedores", () => expect(filtroComunicacao("suppliers", "documentos")).toBe("dados"));
  it("não aplica pendências de trabalho a casais", () => expect(filtroComunicacao("couples", "dados")).toBe("todos"));
  it("não aplica pendências de trabalho a todos os usuários", () => expect(filtroComunicacao("all", "documentos")).toBe("todos"));
});