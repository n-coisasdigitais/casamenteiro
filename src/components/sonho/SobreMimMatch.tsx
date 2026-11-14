import { useState } from "react";
import { ChevronDown, HeartHandshake } from "lucide-react";
import { textoPermitido } from "@/lib/quiz";

export type DadosSobreMim = {
  cidade: string | null;
  uf: string | null;
  sobre_mim: string | null;
  interesses: string[];
  match_lista: boolean;
  match_maior_idade: boolean;
  match_consentido_em: string | null;
  mostrar_selo_match: boolean;
};

/** Sem religião, política ou orientação: dado sensível na LGPD fica fora até o Match existir. */
export const INTERESSES = [
  "Viajar",
  "Música ao vivo",
  "Cozinhar",
  "Praia",
  "Cinema e séries",
  "Esportes",
  "Pets",
  "Balada",
  "Leitura",
  "Natureza",
  "Games",
  "Barzinho",
];

const SUAVE = "#6E625A";

/** Bloco opcional do mural: cidade, "sobre mim", interesses e a lista de espera do Casamenteiro Match. */
export default function SobreMimMatch({
  valor,
  bloqueadas,
  onSalvar,
}: {
  valor: DadosSobreMim;
  bloqueadas: string[];
  onSalvar: (campos: Partial<DadosSobreMim>) => Promise<void> | void;
}) {
  const preenchido = !!(valor.cidade || valor.sobre_mim || valor.interesses.length || valor.match_lista);
  const [aberto, setAberto] = useState(preenchido);
  const [cidade, setCidade] = useState(valor.cidade || "");
  const [uf, setUf] = useState(valor.uf || "");
  const [sobre, setSobre] = useState(valor.sobre_mim || "");
  const [erroSobre, setErroSobre] = useState("");
  const [maior, setMaior] = useState(valor.match_maior_idade);
  const [erroLista, setErroLista] = useState("");

  const salvarCidade = () => {
    const c = cidade.trim() || null;
    const u = uf.trim().toUpperCase().slice(0, 2) || null;
    if (c !== valor.cidade || u !== valor.uf) onSalvar({ cidade: c, uf: u });
  };

  const salvarSobre = () => {
    const t = sobre.trim().replace(/\s+/g, " ");
    if ((valor.sobre_mim || "") === t) return;
    if (t && !textoPermitido(t, bloqueadas)) return setErroSobre("Esse texto não pode. Tente outro jeito de dizer.");
    setErroSobre("");
    onSalvar({ sobre_mim: t || null });
  };

  const alternarInteresse = (i: string) => {
    const atual = valor.interesses;
    if (atual.includes(i)) return onSalvar({ interesses: atual.filter((x) => x !== i) });
    if (atual.length >= 3) return;
    onSalvar({ interesses: [...atual, i] });
  };

  const entrarNaLista = (quer: boolean) => {
    if (!quer) {
      onSalvar({ match_lista: false, mostrar_selo_match: false });
      return;
    }
    if (!maior) return setErroLista("Para entrar na lista, confirme que você tem 18 anos ou mais.");
    setErroLista("");
    onSalvar({ match_lista: true, match_maior_idade: true, match_consentido_em: new Date().toISOString() });
  };

  return (
    <section className="rounded-2xl border bg-white" style={{ borderColor: "#ECE3DA" }}>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <HeartHandshake className="h-5 w-5 shrink-0" style={{ color: "#A9582D" }} aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-semibold">Quer contar mais sobre você?</span>
          <span className="block text-[13px]" style={{ color: SUAVE }}>
            Opcional. Só preencha se quiser.
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 transition ${aberto ? "rotate-180" : ""}`}
          style={{ color: SUAVE }}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div className="flex flex-col gap-5 border-t p-4" style={{ borderColor: "#ECE3DA" }}>
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <div>
              <label htmlFor="sm-cidade" className="text-[13px] font-medium">
                Cidade onde você mora
              </label>
              <input
                id="sm-cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                onBlur={salvarCidade}
                maxLength={80}
                placeholder="Belo Horizonte"
                className="mt-1 h-11 w-full rounded-xl border px-3 text-[15px]"
                style={{ borderColor: "#DCCFC3" }}
              />
            </div>
            <div>
              <label htmlFor="sm-uf" className="text-[13px] font-medium">
                UF
              </label>
              <input
                id="sm-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                onBlur={salvarCidade}
                maxLength={2}
                placeholder="MG"
                className="mt-1 h-11 w-full rounded-xl border px-3 text-[15px] uppercase"
                style={{ borderColor: "#DCCFC3" }}
              />
            </div>
            <p className="col-span-2 text-xs" style={{ color: SUAVE }}>
              Usamos para sugerir fornecedores perto de você.
            </p>
          </div>

          <div>
            <label htmlFor="sm-sobre" className="text-[13px] font-medium">
              Sobre mim, em uma frase
            </label>
            <textarea
              id="sm-sobre"
              rows={2}
              maxLength={160}
              value={sobre}
              onChange={(e) => {
                setSobre(e.target.value);
                setErroSobre("");
              }}
              onBlur={salvarSobre}
              placeholder="Choro em casamento de desconhecido e danço até a última música."
              className="mt-1 w-full resize-none rounded-xl border p-3 text-[15px] leading-relaxed"
              style={{ borderColor: "#DCCFC3" }}
            />
            <div className="flex justify-between text-xs" style={{ color: SUAVE }}>
              <span style={{ color: erroSobre ? "#B42318" : undefined }}>{erroSobre}</span>
              <span>{sobre.length} de 160</span>
            </div>
          </div>

          <fieldset>
            <legend className="text-[13px] font-medium">Do que você gosta? Escolha até 3</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESSES.map((i) => {
                const on = valor.interesses.includes(i);
                const cheio = !on && valor.interesses.length >= 3;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => alternarInteresse(i)}
                    aria-disabled={cheio}
                    className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-medium transition ${on ? "text-white" : "border bg-white"} ${cheio ? "opacity-50" : ""}`}
                    style={on ? { background: "#2B211B" } : { borderColor: "#DCCFC3" }}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 rounded-xl p-3.5" style={{ background: "#F6EBE1" }}>
            <div>
              <p className="text-[15px] font-semibold">Casamenteiro Match</p>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
                Ainda não existe. Estamos medindo quantas pessoas querem conhecer alguém por aqui. Se você entrar na
                lista, avisamos quando lançar. Até lá, ninguém vê seu perfil e não apresentamos você a ninguém.
              </p>
            </div>
            {!valor.match_lista ? (
              <>
                <label className="flex items-start gap-2 text-[13px] leading-snug">
                  <input
                    type="checkbox"
                    checked={maior}
                    onChange={(e) => {
                      setMaior(e.target.checked);
                      setErroLista("");
                    }}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                    style={{ accentColor: "#A9582D" }}
                  />
                  Tenho 18 anos ou mais
                </label>
                <p className="text-xs leading-snug" style={{ color: "#5E4F45" }}>
                  Ao entrar, você autoriza o uso da sua cidade, da frase e dos interesses acima para avisar sobre o
                  lançamento do Match e, quando ele existir, montar seu perfil. Você pode sair da lista quando quiser.
                </p>
                {erroLista && (
                  <p className="text-[13px]" style={{ color: "#B42318" }}>
                    {erroLista}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => entrarNaLista(true)}
                  className="h-11 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#2B211B" }}
                >
                  Quero entrar na lista
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: "#3B6D11" }}>
                  Você está na lista. Avisamos quando lançar.
                </p>
                <label className="flex items-start gap-2 text-[13px] leading-snug">
                  <input
                    type="checkbox"
                    checked={valor.mostrar_selo_match}
                    onChange={(e) => onSalvar({ mostrar_selo_match: e.target.checked })}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                    style={{ accentColor: "#A9582D" }}
                  />
                  Mostrar o selo "Topo conhecer alguém" no meu card do story
                </label>
                <button
                  type="button"
                  onClick={() => entrarNaLista(false)}
                  className="self-start text-[13px] underline"
                  style={{ color: SUAVE }}
                >
                  Sair da lista
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
