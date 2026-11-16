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

function abrir(path: string, loggedIn: boolean, isAdmin: boolean, loading = false) {
  Object.assign(auth, { user: loggedIn ? {} : null, profile: loggedIn ? { account_type: "admin" } : null, isAdmin, loading });
  render(<MemoryRouter initialEntries={[path]}><BotaoFeedback /></MemoryRouter>);
  return screen.queryByRole("button", { name: "Enviar feedback, sugestão ou reportar erro" });
}

describe("acesso ao feedback administrativo", () => {
  it.each(["/admin", "/admin/feedback", "/admin/usuarios"])("permite administrador logado em %s", (path) => {
    expect(abrir(path, true, true)).not.toBeNull();
  });
  it.each(["/", "/login", "/cadastro", "/fornecedor/painel", "/profissional/painel", "/dashboard", "/administrador"])("não exibe fora do admin em %s", (path) => {
    expect(abrir(path, true, true)).toBeNull();
  });
  it("não permite visitante na área administrativa", () => {
    expect(abrir("/admin", false, false)).toBeNull();
  });
  it("não permite conta sem papel administrativo", () => {
    expect(abrir("/admin", true, false)).toBeNull();
  });
  it("aguarda o carregamento da autenticação", () => {
    expect(abrir("/admin", true, true, true)).toBeNull();
  });
});