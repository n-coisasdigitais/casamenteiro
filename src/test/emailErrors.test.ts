import { describe, expect, it } from "vitest";
import { cotaEmailEsgotada, explicarErroEmail } from "../../supabase/functions/_shared/email-errors";
import { erroComunicacao } from "@/lib/comunicacao";

describe("limites e resultados de comunicação", () => {
  it("distingue cota diária de limite temporário", () => {
    expect(cotaEmailEsgotada('{"name":"daily_quota_exceeded","statusCode":429}')).toBe(true);
    expect(cotaEmailEsgotada('{"name":"rate_limit_exceeded","statusCode":429}')).toBe(false);
  });
  it("reconhece cota mensal", () => expect(cotaEmailEsgotada("monthly_quota_exceeded")).toBe(true));
  it("não classifica erro de endereço como cota", () => expect(cotaEmailEsgotada("invalid_recipient")).toBe(false));
  it("retorna a causa da resposta do servidor", async () => {
    expect(await erroComunicacao({ context: new Response(JSON.stringify({ error: "Acesso negado" })) })).toBe("Acesso negado");
  });
  it("trata resposta inválida sem lançar erro", async () => {
    expect(typeof await erroComunicacao({ context: new Response("invalid") })).toBe("string");
    expect(explicarErroEmail(null)).toBeTruthy();
  });
});