import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  linhasCategorias,
  NIVEIS,
  num,
  resumoCategorias,
  type LinhaCategoria,
  type Nivel,
  type StatusMeta,
} from "@/lib/oferta";
import { useOfertaPainel } from "@/components/admin/oferta/useOfertaPainel";
import {
  AbasOferta,
  Barra,
  Bloco,
  Cabecalho,
  Carregando,
  Chips,
  Erro,
  Kpi,
  Status,
  Vazio,
} from "@/components/admin/oferta/ui";

type Filtro = "todas" | StatusMeta;

/** /admin/oferta/categorias — categorias × fornecedores × meta, com edição de nível e meta. */
export default function AdminOfertaCategorias() {
  const { dados, erro, carregando, recarregar } = useOfertaPainel();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [nivel, setNivel] = useState<"todos" | Nivel | "sem">("todos");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);

  const linhas = useMemo(() => (dados ? linhasCategorias(dados) : []), [dados]);
  const resumo = useMemo(() => resumoCategorias(linhas), [linhas]);
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter(
      (l) =>
        (filtro === "todas" || l.status === filtro) &&
        (nivel === "todos" || (nivel === "sem" ? !l.nivel : l.nivel === nivel)) &&
        (!q || l.nome.toLowerCase().includes(q) || l.slug.includes(q)),
    );
  }, [linhas, filtro, nivel, busca]);

  const salvar = async (
    l: LinhaCategoria,
    novo: { nivel?: Nivel | null; meta?: number | null; rascunho?: boolean },
  ) => {
    setSalvando(l.id);
    const { error } = await (supabase.rpc as any)("admin_definir_categoria", {
      p_id: l.id,
      p_nivel: novo.nivel !== undefined ? novo.nivel : l.nivel,
      p_meta: novo.meta !== undefined ? novo.meta : l.meta,
      p_rascunho: novo.rascunho ?? null,
    });
    setSalvando(null);
    if (error) return toast({ title: "Não salvou", description: error.message, variant: "destructive" });
    recarregar();
  };

  const exportar = () => {
    const cab = [
      "categoria",
      "slug",
      "nivel",
      "meta",
      "na_regiao",
      "aprovados_total",
      "pendentes",
      "cidades",
      "status",
      "rascunho",
    ];
    const linhasCsv = visiveis.map((l) =>
      [
        l.nome,
        l.slug,
        l.nivel ?? "",
        l.metaEfetiva,
        l.naRegiao,
        l.aprovados,
        l.pendentes,
        l.cidades,
        l.status,
        l.rascunho ? "sim" : "não",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob(["﻿" + [cab.join(";"), ...linhasCsv].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `categorias-oferta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="of-pagina cz-enter">
      <Cabecalho
        titulo="Categorias e"
        destaque="fornecedores"
        descricao="Quantos fornecedores aprovados cada categoria tem na região foco, a meta de cada uma e quais estão vazias."
        acoes={
          <button type="button" className="cz-btn" onClick={exportar} disabled={!visiveis.length}>
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        }
      />
      <AbasOferta />
      {erro && <Erro texto={erro} />}
      {carregando && !dados && <Carregando />}

      {dados && (
        <>
          <div className="of-kpis">
            <Kpi
              rotulo="Todas"
              valor={num(resumo.total)}
              ativo={filtro === "todas"}
              onClick={() => setFiltro("todas")}
            />
            <Kpi
              rotulo="Vazias"
              valor={num(resumo.vazias)}
              tom="err"
              detalhe="nenhum fornecedor"
              ativo={filtro === "vazia"}
              onClick={() => setFiltro("vazia")}
            />
            <Kpi
              rotulo="Abaixo da meta"
              valor={num(resumo.abaixo)}
              tom="warn"
              detalhe="têm, mas falta"
              ativo={filtro === "abaixo"}
              onClick={() => setFiltro("abaixo")}
            />
            <Kpi
              rotulo="Na meta"
              valor={num(resumo.ok)}
              tom="ok"
              detalhe="ok para a região"
              ativo={filtro === "ok"}
              onClick={() => setFiltro("ok")}
            />
          </div>

          <Bloco
            titulo={`${visiveis.length} categorias`}
            sub={`Região foco: ${dados.config.foco_nome} (${dados.config.foco_raio_km} km). Metas padrão: essencial ${dados.config.meta.essencial}, recomendada ${dados.config.meta.recomendada}, complementar ${dados.config.meta.complementar}.`}
            acoes={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Chips
                  rotulo="Nível"
                  valor={nivel}
                  onChange={setNivel}
                  opcoes={[
                    { id: "todos", nome: "Todos" },
                    ...NIVEIS.map((n) => ({ id: n.id, nome: n.nome })),
                    { id: "sem", nome: "Sem nível" },
                  ]}
                />
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <Search className="h-4 w-4" style={{ position: "absolute", left: 8, color: "var(--ad-muted)" }} />
                  <input
                    className="of-input"
                    style={{ paddingLeft: 28 }}
                    placeholder="Buscar categoria"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    aria-label="Buscar categoria"
                  />
                </label>
              </div>
            }
          >
            {visiveis.length === 0 ? (
              <Vazio>Nada com esses filtros.</Vazio>
            ) : (
              <div className="of-rolagem">
                <table className="of-tabela">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Nível</th>
                      <th className="n">Meta</th>
                      <th style={{ minWidth: 160 }}>Na região</th>
                      <th className="n">Total aprovados</th>
                      <th className="n">Pendentes</th>
                      <th className="n">Cidades</th>
                      <th>Status</th>
                      <th>Vitrine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((l) => (
                      <tr key={l.id} style={{ opacity: salvando === l.id ? 0.5 : 1 }}>
                        <td>
                          <b>{l.nome}</b>
                          <div style={{ fontSize: 11.5, color: "var(--ad-muted)" }}>{l.slug}</div>
                        </td>
                        <td>
                          <select
                            className="of-select"
                            value={l.nivel ?? ""}
                            aria-label={`Nível de ${l.nome}`}
                            onChange={(e) => salvar(l, { nivel: (e.target.value || null) as Nivel | null })}
                          >
                            <option value="">—</option>
                            {NIVEIS.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="n">
                          <input
                            className="of-input"
                            type="number"
                            min={0}
                            max={999}
                            style={{ width: 64, textAlign: "right" }}
                            defaultValue={l.meta ?? ""}
                            placeholder={String(l.metaEfetiva)}
                            aria-label={`Meta de ${l.nome}`}
                            onBlur={(e) => {
                              const v =
                                e.target.value === "" ? null : Math.max(0, Math.min(999, Number(e.target.value)));
                              if (v !== l.meta) salvar(l, { meta: v });
                            }}
                          />
                        </td>
                        <td>
                          <div
                            style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: 8, alignItems: "center" }}
                          >
                            <Barra
                              valor={l.naRegiao}
                              max={l.metaEfetiva}
                              cor={l.status === "ok" ? "var(--ad-ok)" : undefined}
                            />
                            <b className="cz-num" style={{ textAlign: "right" }}>
                              {l.naRegiao}/{l.metaEfetiva}
                            </b>
                          </div>
                        </td>
                        <td className="n">{num(l.aprovados)}</td>
                        <td className="n">
                          {l.pendentes ? (
                            <Link to="/admin/aprovacao" className="cz-st cz-info">
                              {l.pendentes}
                            </Link>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="n">{num(l.cidades)}</td>
                        <td>
                          <Status s={l.status} />
                          {l.faltam > 0 && (
                            <div style={{ fontSize: 11.5, color: "var(--ad-muted)", marginTop: 2 }}>
                              faltam {l.faltam}
                            </div>
                          )}
                        </td>
                        <td>
                          {l.rascunho ? (
                            <button
                              type="button"
                              className="cz-st cz-off"
                              style={{ border: 0, cursor: "pointer" }}
                              onClick={() => salvar(l, { rascunho: false })}
                              title="Mostrar na vitrine do casal agora"
                            >
                              Rascunho · publicar
                            </button>
                          ) : (
                            <span className="cz-st cz-ok">Publicada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Bloco>
        </>
      )}
    </div>
  );
}
