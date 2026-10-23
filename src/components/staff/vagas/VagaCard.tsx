import { Link } from "react-router-dom";
import { Calendar, Check, Clock, MapPin, Users } from "lucide-react";
import { formatBRL } from "@/lib/platformPricing";

export type VagaListada = {
  id: string;
  funcao: string;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  cidade?: string | null;
  local?: string | null;
  vagas?: number | null;
  valor_turno?: number | null;
  supplier?: { company_name?: string | null } | null;
};

/** Situação do profissional logado em relação à vaga (vem de staff_applications). */
export type SituacaoVaga = "livre" | "enviando" | "candidato" | "convidado" | "aceito" | "encerrada";

export const fmtDataVaga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "");
export const fmtHoraVaga = (i?: string | null, f?: string | null) =>
  i ? `${String(i).slice(0, 5)}${f ? `–${String(f).slice(0, 5)}` : ""}` : null;

/** Mapeia o status da candidatura para o que o card mostra. */
export function situacaoDoStatus(status?: string | null): SituacaoVaga {
  if (!status) return "livre";
  if (status === "candidato") return "candidato";
  if (status === "convidado") return "convidado";
  if (status === "aceito" || status === "concluido") return "aceito";
  return "encerrada"; // recusado, expirado, retirada, no_show
}

/** Card de vaga no padrão novo. Usado em /vagas e na /profissional. */
export default function VagaCard({
  vaga,
  situacao = "livre",
  destaque = false,
  paraVoce = false,
  onCandidatar,
  href,
}: {
  vaga: VagaListada;
  situacao?: SituacaoVaga;
  destaque?: boolean;
  paraVoce?: boolean;
  onCandidatar?: (v: VagaListada) => void;
  /** quando informado, o card inteiro vira link (ex.: na /profissional) */
  href?: string;
}) {
  const hora = fmtHoraVaga(vaga.hora_inicio, vaga.hora_fim);
  const lugar = vaga.cidade || vaga.local;

  const corpo = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          {paraVoce && (
            <span className="self-start rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase" style={{ letterSpacing: ".05em", background: "#E7EFEB", color: "#3B6656" }}>
              Para você
            </span>
          )}
          <strong className="text-[20px] leading-tight" style={{ letterSpacing: "-0.02em" }}>{vaga.funcao}</strong>
          {vaga.supplier?.company_name && <span className="truncate text-[14px]" style={{ color: "var(--hv-body)" }}>{vaga.supplier.company_name}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[20px] font-extrabold">{vaga.valor_turno ? formatBRL(Number(vaga.valor_turno)) : "A combinar"}</span>
          {vaga.valor_turno ? <span className="text-[12px]" style={{ color: "var(--hv-body)" }}>por turno</span> : null}
        </span>
      </span>
      <span className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]" style={{ color: "var(--hv-body)" }}>
        <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{fmtDataVaga(vaga.data)}</span>
        {hora && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{hora}</span>}
        {lugar && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{lugar}</span>}
        {vaga.vagas && vaga.vagas > 1 ? <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />{vaga.vagas} vagas</span> : null}
      </span>
    </>
  );

  const estilo = {
    borderColor: destaque ? "var(--vg-acento, var(--hv-clay))" : "var(--vg-linha, #E7E2DB)",
    boxShadow: "0 1px 2px rgba(60,40,20,.04), 0 4px 14px rgba(60,40,20,.04)",
    background: "#fff",
    color: "var(--hv-ink)",
  };

  if (href)
    return (
      <Link to={href} className="hv-lift flex flex-col gap-3 rounded-[24px] border bg-white p-6" style={estilo}>
        {corpo}
        <span className="mt-auto text-right text-sm font-bold" style={{ color: "var(--hv-clay)" }}>Ver vaga ›</span>
      </Link>
    );

  // lista da /vagas: linha limpa, sem blocos de cor; ação com contorno (só o estado muda de cor)
  return (
    <article id={`vaga-${vaga.id}`} className="flex scroll-mt-28 flex-col gap-4 rounded-2xl border p-5 transition-colors hover:border-[#D6CEC4] sm:flex-row sm:items-center sm:justify-between" style={estilo}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <strong className="text-[17px] font-semibold" style={{ letterSpacing: "-0.01em" }}>{vaga.funcao}</strong>
          {vaga.supplier?.company_name && <span className="text-[14px]" style={{ color: "#8A8178" }}>{vaga.supplier.company_name}</span>}
          {paraVoce && <span className="text-[12px] font-semibold" style={{ color: "#3B6656" }}>· combina com você</span>}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]" style={{ color: "#6B635B" }}>
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-[15px] w-[15px]" aria-hidden="true" />{fmtDataVaga(vaga.data)}</span>
          {hora && <span className="inline-flex items-center gap-1.5"><Clock className="h-[15px] w-[15px]" aria-hidden="true" />{hora}</span>}
          {lugar && <span className="inline-flex items-center gap-1.5"><MapPin className="h-[15px] w-[15px]" aria-hidden="true" />{lugar}</span>}
          {vaga.vagas && vaga.vagas > 1 ? <span className="inline-flex items-center gap-1.5"><Users className="h-[15px] w-[15px]" aria-hidden="true" />{vaga.vagas} vagas</span> : null}
        </span>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
        <span className="text-[16px] font-semibold">{vaga.valor_turno ? formatBRL(Number(vaga.valor_turno)) : <span style={{ color: "#8A8178", fontWeight: 500 }}>A combinar</span>}</span>
        <BotaoSituacao situacao={situacao} onClick={() => onCandidatar?.(vaga)} />
      </div>
    </article>
  );
}

function BotaoSituacao({ situacao, onClick }: { situacao: SituacaoVaga; onClick: () => void }) {
  if (situacao === "livre" || situacao === "enviando")
    return (
      <button type="button" onClick={onClick} disabled={situacao === "enviando"} className="min-h-[42px] whitespace-nowrap rounded-full border px-5 text-[14px] font-semibold transition-colors hover:bg-[#1F1D1B] hover:text-white disabled:opacity-60" style={{ borderColor: "#1F1D1B", color: "#1F1D1B" }}>
        {situacao === "enviando" ? "Enviando..." : "Candidatar-se"}
      </button>
    );
  const info: Record<Exclude<SituacaoVaga, "livre" | "enviando">, { t: string; fg: string; link?: boolean }> = {
    candidato: { t: "Candidatura enviada", fg: "#3B6656" },
    convidado: { t: "Convite recebido · responder", fg: "var(--hv-clay)", link: true },
    aceito: { t: "Vaga confirmada", fg: "#3B6656", link: true },
    encerrada: { t: "Encerrada", fg: "#8A8178" },
  };
  const i = info[situacao];
  const conteudo = (
    <span className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold" style={{ color: i.fg }}>
      {situacao !== "encerrada" && <Check className="h-4 w-4" aria-hidden="true" />}
      {i.t}
    </span>
  );
  return i.link ? <Link to="/profissional/painel">{conteudo}</Link> : <span role="status">{conteudo}</span>;
}
