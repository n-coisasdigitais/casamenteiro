import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import BotaoFeedback from "@/components/feedback/BotaoFeedback";

const { auth } = vi.hoisted(() => ({
  auth: { user: null as object | null, profile: null as { account_type: string } | null, isAdmin: false, loading: false },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/components/feedback/FormFeedback", () => ({ default: () => null }));

afterEach(cleanup);

function abrir(path: string, tipo: string | null, isAdmin = false, loading = false) {
  Object.assign(auth, { user: tipo ? {} : null, profile: tipo ? { account_type: tipo } : null, isAdmin, loading });
  render(<MemoryRouter initialEntries={[path]}><BotaoFeedback /></MemoryRouter>);
  return screen.queryByRole("button", { name: "Enviar feedback, sugestão ou reportar erro" });
}

describe("visibilidade do botão de feedback", () => {
  it("aparece para fornecedor logado no painel", () => expect(abrir("/fornecedor/painel", "supplier")).not.toBeNull());
  it("aparece para casal logado no painel", () => expect(abrir("/dashboard", "couple")).not.toBeNull());
  it("aparece para conta genérica logada", () => expect(abrir("/meu-sonho", "generico")).not.toBeNull());
  it("aparece para admin logado no admin", () => expect(abrir("/admin", "couple", true)).not.toBeNull());
  it("não aparece na página inicial, mesmo logado", () => expect(abrir("/", "supplier")).toBeNull());
  it("não aparece para visitante sem login", () => expect(abrir("/dashboard", null)).toBeNull());
  it("aguarda o carregamento do login", () => expect(abrir("/dashboard", "couple", false, true)).toBeNull());
});
