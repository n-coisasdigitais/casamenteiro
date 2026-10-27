import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronDown, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { traduzirErro } from "@/lib/errorMessages";
import { buildWhatsAppLink } from "@/lib/phone";
import { AttachmentPicker } from "@/components/QuoteAttachments";

/** Assunto extra conforme a categoria (o resto vale para todos). */
function assuntoDaCategoria(slug: string, nome: string): string | null {
  const s = `${slug} ${nome}`.toLowerCase();
  if (/espa[cç]o|local|sal[aã]o/.test(s)) return "Hospedagem";
  if (/buffet|gastronomia|bolo|doce/.test(s)) return "Degustação";
  if (/foto|film|v[ií]deo/.test(s)) return "Pacotes";
  if (/banda|dj|m[uú]sica/.test(s)) return "Repertório";
  if (/vestido|noiva|traje/.test(s)) return "Provas";
  if (/decora|flor/.test(s)) return "Estilos de decoração";
  if (/cerimonial|assessoria|celebrante/.test(s)) return "Como funciona o trabalho";
  return null;
}

function juntar(lista: string[]) {
  return lista.length > 1 ? `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}` : lista[0];
}

type Props = {
  supplierId: string;
  supplierName: string;
  categoriaSlug: string;
  categoriaNome: string;
  /** "a partir de R$ X" ou null para "Sob consulta" */
  precoTexto: string | null;
  tempoResposta: number | null;
  olhando: number;
  whatsapp: string | null;
  onEnviado?: () => void;
};

/** Pedido de orçamento direto na página (sem abrir janela). Data e convidados começam vazios. */
export default function OrcamentoInline({
  supplierId,
  supplierName,
  categoriaSlug,
  categoriaNome,
  precoTexto,
  tempoResposta,
  olhando,
  whatsapp,
  onEnviado,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [ehCasal, setEhCasal] = useState<boolean | null>(null);
  const [data, setData] = useState("");
  const [semData, setSemData] = useState(false);
  const [convidados, setConvidados] = useState("");
  const [assuntos, setAssuntos] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [editada, setEditada] = useState(false);
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [telefoneVisivel, setTelefoneVisivel] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const opcoes = useMemo(() => {
    const extra = assuntoDaCategoria(categoriaSlug, categoriaNome);
    return ["Valores", "Disponibilidade da data", "Agendar visita", ...(extra ? [extra] : [])];
  }, [categoriaSlug, categoriaNome]);

  useEffect(() => {
    if (!user) {
      setEhCasal(null);
      return;
    }
    supabase
      .from("couples")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: c }) => setEhCasal(!!c));
  }, [user]);

  // mensagem que se monta sozinha até a pessoa editar
  useEffect(() => {
    if (editada) return;
    if (!data && !semData && !convidados && !assuntos.length) {
      setMensagem("");
      return;
    }
    let t = "Olá! Estamos planejando nosso casamento";
    if (data && !semData) {
      const [a, m, d] = data.split("-");
      t += ` para ${d}/${m}/${a}`;
    } else if (semData) t += " (ainda sem data definida)";
    if (convidados) t += `, com cerca de ${convidados} convidados`;
    t += ".";
    if (assuntos.length) t += ` Gostaríamos de saber sobre ${juntar(assuntos.map((a) => a.toLowerCase()))}.`;
    setMensagem(t);
  }, [data, semData, convidados, assuntos, editada]);

  const linkLogin = `/login?redirect=${encodeURIComponent(location.pathname)}`;
  const hoje = new Date().toISOString().slice(0, 10);

  const enviar = async () => {
    if (!user || !ehCasal) return;
    if (!mensagem.trim()) {
      toast({ title: "Escreva uma mensagem", description: "Ou escolha um assunto acima que ela se monta sozinha." });
      return;
    }
    setEnviando(true);
    const { data: casal } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
    if (!casal) {
      setEnviando(false);
      toast({ title: "Apenas casais podem pedir orçamento", variant: "destructive" });
      return;
    }
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        couple_id: casal.id,
        supplier_id: supplierId,
        user_id: user.id,
        event_date: semData ? null : data || null,
        guest_count: convidados ? parseInt(convidados, 10) : null,
        message: mensagem.trim(),
        phone: telefone.trim() || null,
        phone_visible: telefoneVisivel,
      })
      .select()
      .maybeSingle();
    if (error) {
      setEnviando(false);
      toast({ title: "Erro ao enviar", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    if (anexos.length && quote) {
      const urls: string[] = [];
      for (const file of anexos) {
        const caminho = `${quote.id}/${Date.now()}-${file.name}`;
        const { error: e } = await supabase.storage.from("quote-attachments").upload(caminho, file);
        if (e) continue;
        urls.push(supabase.storage.from("quote-attachments").getPublicUrl(caminho).data.publicUrl);
      }
      if (urls.length) {
        await (supabase.from("quote_messages") as any).insert({
          quote_id: quote.id,
          sender_id: user.id,
          message: mensagem.trim(),
          attachment_url: urls[0],
          attachment_urls: urls,
        });
      }
    }
    analytics.formSubmit("pedido_orcamento", { supplier_id: supplierId });
    analytics.contactCtaClick({ supplier_id: supplierId, origem: "form_orcamento" });
    setEnviando(false);
    setEnviado(true);
    onEnviado?.();
  };

  const linkZap = whatsapp ? buildWhatsAppLink(whatsapp, "Olá! Vim pelo Casamenteiro, acabei de pedir um orçamento.") : null;

  return (
    <div className="pf-orc">
      <div className="pf-olhando">
        <span className="pf-pulso" />
        {olhando} {olhando === 1 ? "pessoa está olhando" : "pessoas estão olhando"} este fornecedor
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2">
        {precoTexto ? (
          <>
            <small className="w-full text-xs font-semibold text-[var(--pf-muted)]">a partir de</small>
            <b className="pf-serif text-[28px] leading-tight">{precoTexto}</b>
          </>
        ) : (
          <>
            <small className="w-full text-xs font-semibold text-[var(--pf-muted)]">Preço</small>
            <b className="pf-serif text-[22px] leading-tight">Sob consulta</b>
            <span className="text-[13px] text-[var(--pf-body)]">peça um orçamento para sua data</span>
          </>
        )}
      </div>

      {enviado ? (
        <div className="flex flex-col items-center gap-2.5 py-4 text-center">
          <span className="pf-ok-ic">
            <Check className="h-7 w-7" strokeWidth={2.6} />
          </span>
          <b className="text-[17px]">Pedido enviado!</b>
          <span className="text-sm text-[var(--pf-body)]">
            {supplierName} responde no seu painel.{linkZap ? " O WhatsApp já está liberado." : ""}
          </span>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {linkZap && (
              <a
                className="pf-pill"
                href={linkZap}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.contactCtaClick({ supplier_id: supplierId, origem: "whatsapp" })}
              >
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
              </a>
            )}
            <Link className="pf-pill" to="/meus-fornecedores">
              Ver meus pedidos
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="pf-campo">
              Data do casamento
              <input type="date" min={hoje} value={data} disabled={semData} onChange={(e) => setData(e.target.value)} />
            </label>
            <label className="pf-campo">
              Convidados
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Ex.: 120"
                value={convidados}
                onChange={(e) => setConvidados(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </label>
          </div>
          <label className="-mt-1 flex items-center gap-2 text-[13px] text-[var(--pf-body)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--pf-clay)]"
              checked={semData}
              onChange={(e) => {
                setSemData(e.target.checked);
                if (e.target.checked) setData("");
              }}
            />
            Ainda não temos a data
          </label>

          <div className="pf-campo">
            <span>O que você quer saber?</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assuntos">
              {opcoes.map((o) => {
                const on = assuntos.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    className="pf-rapido"
                    aria-pressed={on}
                    onClick={() => setAssuntos((a) => (on ? a.filter((x) => x !== o) : [...a, o]))}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="pf-campo">
            Mensagem
            <textarea
              maxLength={2000}
              value={mensagem}
              placeholder="Conte um pouco sobre o casamento que vocês imaginam. A mensagem se monta sozinha conforme você preenche acima."
              onChange={(e) => {
                setEditada(true);
                setMensagem(e.target.value);
              }}
            />
          </label>

          {user && ehCasal && (
            <>
              <button
                type="button"
                className="-mt-1 inline-flex items-center gap-1 self-start text-[13px] font-semibold text-[var(--pf-clay)]"
                onClick={() => setMaisOpcoes((v) => !v)}
                aria-expanded={maisOpcoes}
              >
                Telefone e anexos (opcional)
                <ChevronDown className={`h-4 w-4 transition-transform ${maisOpcoes ? "rotate-180" : ""}`} />
              </button>
              {maisOpcoes && (
                <div className="flex flex-col gap-2.5">
                  <label className="pf-campo">
                    Telefone
                    <input type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                  </label>
                  {telefone && (
                    <label className="flex items-center gap-2 text-[13px] text-[var(--pf-body)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--pf-clay)]"
                        checked={telefoneVisivel}
                        onChange={(e) => setTelefoneVisivel(e.target.checked)}
                      />
                      Permitir que o fornecedor veja meu telefone
                    </label>
                  )}
                  <AttachmentPicker files={anexos} onChange={setAnexos} />
                </div>
              )}
            </>
          )}

          {!user ? (
            <Link to={linkLogin} className="pf-cta grid place-items-center">
              Entrar e pedir orçamento
            </Link>
          ) : ehCasal === false ? (
            <p className="rounded-xl bg-[var(--pf-amber)] p-3 text-[13px] text-[var(--pf-body)]">
              Pedidos de orçamento são feitos por contas de casal. Você está conectado com outro tipo de conta.
            </p>
          ) : (
            <button type="button" className="pf-cta" disabled={enviando || ehCasal === null} onClick={enviar}>
              {enviando ? "Enviando..." : "Pedir orçamento grátis"}
            </button>
          )}

          <ul className="flex flex-col gap-1.5 text-[12.5px] text-[var(--pf-body)]">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[var(--pf-ok)]" strokeWidth={3} /> Grátis e sem compromisso
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[var(--pf-ok)]" strokeWidth={3} />
              {tempoResposta != null ? `Responde em cerca de ${formatarHoras(tempoResposta)}` : "Você recebe a resposta no seu painel"}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[var(--pf-ok)]" strokeWidth={3} /> WhatsApp liberado depois do primeiro pedido
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export function formatarHoras(h: number) {
  if (h < 1) return "1 h";
  if (h < 24) return `${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 dia" : `${d} dias`;
}
