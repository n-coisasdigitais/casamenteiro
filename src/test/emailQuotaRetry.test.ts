import { afterEach, describe, expect, it, vi } from "vitest";
import { sendViaResend } from "../../supabase/functions/_shared/resend";

declare global {
  var Deno: { env: { get(name: string): string | undefined } };
}

afterEach(() => vi.unstubAllGlobals());

describe("retentativa de e-mail", () => {
  it("faz uma só tentativa quando a cota diária acabou", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "chave-apenas-para-teste" } });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "daily_quota_exceeded" }), { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    const result = await sendViaResend({ to: "teste@example.com", subject: "Teste", text: "Teste" }, 3);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("não repete um envio aceito", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "chave-apenas-para-teste" } });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-teste" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect((await sendViaResend({ to: "teste@example.com", subject: "Teste", text: "Teste" })).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});