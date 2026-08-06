import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

export type PublicJob = {
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

/**
 * Card público de uma vaga (staffing). Usado na vitrine /vagas e na landing
 * do profissional. Não expõe contato — candidatar exige login.
 */
export default function PublicJobCard({
  job,
  onCandidatar,
}: {
  job: PublicJob;
  onCandidatar: (job: PublicJob) => void;
}) {
  const dataFmt = job.data
    ? new Date(job.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : null;
  const horario = job.hora_inicio
    ? `${String(job.hora_inicio).slice(0, 5)}${job.hora_fim ? `–${String(job.hora_fim).slice(0, 5)}` : ""}`
    : null;

  return (
    <Card className="hover:shadow-md transition">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-lg">{job.funcao}</h3>
            {job.supplier?.company_name && <p className="text-sm text-muted-foreground">{job.supplier.company_name}</p>}
          </div>
          {job.valor_turno != null && (
            <Badge variant="secondary" className="text-sm shrink-0">
              R$ {Number(job.valor_turno).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
          {dataFmt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {dataFmt}
            </span>
          )}
          {horario && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {horario}
            </span>
          )}
          {(job.cidade || job.local) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {job.cidade || job.local}
            </span>
          )}
          {job.vagas != null && job.vagas > 1 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {job.vagas} vagas
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Pagamento combinado direto com o fornecedor.</span>
          <button
            onClick={() => onCandidatar(job)}
            className="rounded-full px-5 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition"
          >
            Candidatar-se
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
