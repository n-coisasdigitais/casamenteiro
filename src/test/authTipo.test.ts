import { describe, it, expect } from "vitest";
import { deveResetarProfissional, tipoInicial } from "@/lib/authTipo";

describe("tipo do cadastro", () => {
  it("?tipo= define o tipo, inclusive em português", () => {
    expect(tipoInicial("profissional", "/cadastro")).toBe("profissional");
    expect(tipoInicial("supplier", "/cadastro")).toBe("supplier");
    expect(tipoInicial("fornecedor", "/cadastro")).toBe("supplier");
    expect(tipoInicial("couple", "/fornecedor/cadastro")).toBe("couple");
    expect(tipoInicial(null, "/cadastro")).toBe("couple");
  });
  it("não volta para casal enquanto os recursos carregam", () => {
    expect(deveResetarProfissional("profissional", false, true)).toBe(false);
    expect(deveResetarProfissional("profissional", true, false)).toBe(false);
    expect(deveResetarProfissional("profissional", false, false)).toBe(true);
    expect(deveResetarProfissional("supplier", false, false)).toBe(false);
  });
});
