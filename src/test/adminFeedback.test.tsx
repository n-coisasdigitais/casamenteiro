import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminFeedback from "@/pages/AdminFeedback";

const { rpc, toast } = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("consulta de feedback do administrador", () => {
  it("permite consultar novamente depois de uma falha", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Falha temporária" } }).mockResolvedValue({ data: [], error: null });
    render(<AdminFeedback />);
    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
  });
  it("consulta os relatos abertos sem restringir o tipo", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<AdminFeedback />);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("admin_listar_feedback", { _status: "aberto", _tipo: null }));
  });

  it("consulta todos os status e apenas sugestões quando selecionados", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<AdminFeedback />);
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /^Todos$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ideia nova" }));
    await waitFor(() => expect(rpc).toHaveBeenLastCalledWith("admin_listar_feedback", { _status: null, _tipo: "sugestao" }));
  });
});