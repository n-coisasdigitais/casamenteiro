import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import FormFeedback from "@/components/feedback/FormFeedback";

const { invoke, toast } = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "usuario-teste" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function preencher(onEnviado: () => void) {
  render(<MemoryRouter><FormFeedback origem="fornecedor" onEnviado={onEnviado} /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText("Ex.: Não consigo salvar as fotos do perfil"), { target: { value: "Erro ao salvar" } });
  fireEvent.change(screen.getByPlaceholderText("O que você tentou fazer, o que aconteceu e em qual tela estava?"), { target: { value: "O perfil não salva" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
}

describe("registro de feedback", () => {
  it("não conclui nem limpa o formulário sem confirmação de registro", async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    const enviado = vi.fn();
    preencher(enviado);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(enviado).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Erro ao salvar")).toBeTruthy();
  });
  it("conclui um relato guardado mesmo quando o email falha", async () => {
    invoke.mockResolvedValue({ data: { ok: true, id: "reporte-teste", emailEnviado: false }, error: null });
    const enviado = vi.fn();
    preencher(enviado);
    await waitFor(() => expect(enviado).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith("reportar-erro", { body: { origem: "fornecedor", tipo: "erro", assunto: "Erro ao salvar", descricao: "O perfil não salva", solucao_sugerida: null, pagina: "/", anexo_path: null } });
  });
});