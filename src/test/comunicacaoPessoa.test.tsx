import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MensagemParaPessoa from "@/components/admin/MensagemParaPessoa";

const { invoke, rpc, toast } = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, rpc } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/UserAvatar", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

async function preencher() {
  vi.stubGlobal("confirm", () => true);
  rpc.mockResolvedValue({ data: [{ user_id: "destinatario", nome: "Teste", email: "teste@example.com" }], error: null });
  render(<MensagemParaPessoa inicial="destinatario" />);
  await screen.findByText("teste@example.com");
  fireEvent.change(screen.getByLabelText("Título *"), { target: { value: "Mensagem teste" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar para esta pessoa" }));
  await waitFor(() => expect(toast).toHaveBeenCalled());
}

describe("resultados por canal", () => {
  it("não reenvia na plataforma quando só o email falhou", async () => {
    invoke.mockResolvedValue({ data: { ok: true, push: true, email: false, emailErro: "daily_quota_exceeded" }, error: null });
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Enviar para esta pessoa" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].body).toMatchObject({ push: false, email: true });
  });
  it("mantém o conteúdo quando nenhum canal confirmou o envio", async () => {
    invoke.mockResolvedValue({ data: { ok: false, push: false, email: false }, error: null });
    await preencher();
    expect(screen.getByLabelText("Título *")).toHaveValue("Mensagem teste");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});