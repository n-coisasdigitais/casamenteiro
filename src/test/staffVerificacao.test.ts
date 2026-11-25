import { describe, expect, it } from "vitest";
import { atendeFiltroRequisitos } from "@/lib/staffVerificacao";

const perfilCompleto = {
  nome: "Maria Silva",
  foto_url: "https://exemplo.com/foto.jpg",
  telefone: "(31) 99999-9999",
  funcoes: ["Garçom"],
  cidade: "Belo Horizonte",
  estado: "MG",
  bio: "Profissional de eventos com experiência em atendimento.",
  consentimento_lgpd: true,
};

const documentoEnviado = [{ tipo: "identidade", status: "pendente" }];

describe("filtro de requisitos básicos dos profissionais", () => {
  it("considera pronto para aprovar quem enviou todos os dados e o documento", () => {
    expect(atendeFiltroRequisitos(perfilCompleto, documentoEnviado, "completos")).toBe(true);
    expect(atendeFiltroRequisitos(perfilCompleto, documentoEnviado, "dados")).toBe(false);
    expect(atendeFiltroRequisitos(perfilCompleto, documentoEnviado, "documentos")).toBe(false);
  });

  it("separa quem tem dados cadastrais incompletos", () => {
    const semTelefone = { ...perfilCompleto, telefone: "" };
    expect(atendeFiltroRequisitos(semTelefone, documentoEnviado, "dados")).toBe(true);
    expect(atendeFiltroRequisitos(semTelefone, documentoEnviado, "completos")).toBe(false);
    expect(atendeFiltroRequisitos(semTelefone, documentoEnviado, "documentos")).toBe(false);
  });

  it("separa quem ainda não enviou RG ou CNH", () => {
    expect(atendeFiltroRequisitos(perfilCompleto, [], "documentos")).toBe(true);
    expect(atendeFiltroRequisitos(perfilCompleto, [], "dados")).toBe(false);
    expect(atendeFiltroRequisitos(perfilCompleto, [], "completos")).toBe(false);
  });

  it("não considera documento recusado como requisito enviado", () => {
    const documentoRecusado = [{ tipo: "identidade", status: "rejeitado" }];
    expect(atendeFiltroRequisitos(perfilCompleto, documentoRecusado, "documentos")).toBe(true);
    expect(atendeFiltroRequisitos(perfilCompleto, documentoRecusado, "completos")).toBe(false);
  });
});
