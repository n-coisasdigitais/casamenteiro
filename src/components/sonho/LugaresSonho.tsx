import { useEffect, useState } from "react";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Lugar = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  supplier_id: string | null;
  quero_trazer: boolean;
};
type Sugestao = { id: string; company_name: string; city: string | null; state: string | null };

/** "Onde eu sonho casar": vira ranking anônimo no admin para atrair o espaço. */
export default function LugaresSonho({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [quero, setQuero] = useState(true);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const recarregar = async () => {
    const { data } = await (supabase.from("sonho_lugares" as any) as any)
      .select("id, nome, cidade, uf, supplier_id, quero_trazer")
      .eq("user_id", userId)
      .order("created_at");
    setLugares(data || []);
    setCarregando(false);
  };
  useEffect(() => {
    recarregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [userId]);

  // sugere fornecedores aprovados com nome parecido (evita grafias diferentes do mesmo lugar)
  useEffect(() => {
    const q = nome.trim();
    if (q.length < 3 || supplierId) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await (supabase.from("suppliers") as any)
        .select("id, company_name, city, state")
        .eq("status", "approved")
        .eq("is_demo", false)
        .ilike("company_name", `%${q.replace(/[%_]/g, "")}%`)
        .limit(5);
      setSugestoes(data || []);
    }, 350);
    return () => clearTimeout(t);
  }, [nome, supplierId]);

  const limpar = () => {
    setNome("");
    setCidade("");
    setUf("");
    setSupplierId(null);
    setQuero(true);
    setErro("");
    setSugestoes([]);
  };

  const salvar = async () => {
    if (nome.trim().length < 2) return setErro("Escreva o nome do lugar.");
    setSalvando(true);
    const { error } = await (supabase.from("sonho_lugares" as any) as any).insert({
      user_id: userId,
      nome: nome.trim(),
      cidade: cidade.trim() || null,
      uf: uf.trim().toUpperCase().slice(0, 2) || null,
      supplier_id: supplierId,
      quero_trazer: quero,
    });
    setSalvando(false);
    if (error) return toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    limpar();
    setAberto(false);
    recarregar();
  };

  const alternarQuero = async (l: Lugar) => {
    setLugares((x) => x.map((y) => (y.id === l.id ? { ...y, quero_trazer: !y.quero_trazer } : y)));
    await (supabase.from("sonho_lugares" as any) as any).update({ quero_trazer: !l.quero_trazer }).eq("id", l.id);
  };

  const apagar = async (l: Lugar) => {
    setLugares((x) => x.filter((y) => y.id !== l.id));
    await (supabase.from("sonho_lugares" as any) as any).delete().eq("id", l.id);
  };

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="titulo-lugares">
      <h2 id="titulo-lugares" className="text-base font-semibold">
        Onde eu sonho casar
      </h2>
      {carregando ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6E625A" }} />
      ) : (
        lugares.map((l) => (
          <div key={l.id} className="flex gap-3 rounded-2xl border bg-white p-3" style={{ borderColor: "#ECE3DA" }}>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#F3E3D3", color: "#A9582D" }}
            >
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[15px] font-semibold">{l.nome}</p>
              {(l.cidade || l.uf) && (
                <p className="text-[13px]" style={{ color: "#6E625A" }}>
                  {[l.cidade, l.uf].filter(Boolean).join(", ")}
                </p>
              )}
              <label className="mt-1 flex items-start gap-2 text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
                <input
                  type="checkbox"
                  checked={l.quero_trazer}
                  onChange={() => alternarQuero(l)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0"
                  style={{ accentColor: "#A9582D" }}
                />
                Quero que o Casamenteiro traga esse lugar para cá
              </label>
            </div>
            <button
              type="button"
              aria-label={`Apagar ${l.nome}`}
              onClick={() => apagar(l)}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
              style={{ color: "#6E625A" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}

      {aberto ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border bg-white p-3" style={{ borderColor: "#ECE3DA" }}>
          <div className="relative">
            <label htmlFor="lugar-nome" className="text-[13px] font-medium">
              Nome do lugar
            </label>
            <input
              id="lugar-nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setSupplierId(null);
                setErro("");
              }}
              maxLength={120}
              placeholder="Ex.: Recanto das Flores"
              className="mt-1 h-11 w-full rounded-xl border px-3 text-[15px]"
              style={{ borderColor: "#DCCFC3" }}
              autoComplete="off"
            />
            {sugestoes.length > 0 && (
              <ul
                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border bg-white shadow-lg"
                style={{ borderColor: "#ECE3DA" }}
              >
                {sugestoes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#F6EBE1]"
                      onClick={() => {
                        setNome(s.company_name);
                        setCidade(s.city || "");
                        setUf(s.state || "");
                        setSupplierId(s.id);
                        setSugestoes([]);
                      }}
                    >
                      <span className="font-medium">{s.company_name}</span>
                      {s.city && (
                        <span className="block text-xs" style={{ color: "#6E625A" }}>
                          {[s.city, s.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <div>
              <label htmlFor="lugar-cidade" className="text-[13px] font-medium">
                Cidade
              </label>
              <input
                id="lugar-cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                maxLength={80}
                placeholder="Nova Lima"
                className="mt-1 h-11 w-full rounded-xl border px-3 text-[15px]"
                style={{ borderColor: "#DCCFC3" }}
              />
            </div>
            <div>
              <label htmlFor="lugar-uf" className="text-[13px] font-medium">
                UF
              </label>
              <input
                id="lugar-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                maxLength={2}
                placeholder="MG"
                className="mt-1 h-11 w-full rounded-xl border px-3 text-[15px] uppercase"
                style={{ borderColor: "#DCCFC3" }}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
            <input
              type="checkbox"
              checked={quero}
              onChange={(e) => setQuero(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0"
              style={{ accentColor: "#A9582D" }}
            />
            Quero que o Casamenteiro traga esse lugar para cá. Ele só fica sabendo quantas pessoas marcaram, nunca quem.
          </label>
          {erro && (
            <p className="text-[13px]" style={{ color: "#B42318" }}>
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="h-11 flex-1 rounded-xl text-sm font-semibold text-white disabled:opacity-70"
              style={{ background: "#2B211B" }}
            >
              {salvando ? "Salvando…" : "Salvar lugar"}
            </button>
            <button
              type="button"
              onClick={() => {
                limpar();
                setAberto(false);
              }}
              className="h-11 rounded-xl border px-4 text-sm"
              style={{ borderColor: "#DCCFC3" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="h-11 rounded-xl border-[1.5px] border-dashed text-sm font-medium"
          style={{ borderColor: "#CDBFB3", color: "#5E4F45" }}
        >
          {lugares.length ? "Adicionar outro lugar" : "Adicionar um lugar"}
        </button>
      )}
    </section>
  );
}
