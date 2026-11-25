import { useCallback, useMemo, useState } from "react";
import { cobertura, contarPor, num, pct, porUf, type FornecedorOferta } from "@/lib/oferta";
import { useCidadesUf, useOfertaPainel } from "@/components/admin/oferta/useOfertaPainel";
import {
  AbasOferta,
  Bloco,
  Cabecalho,
  Carregando,
  Chips,
  Erro,
  Kpi,
  Legenda,
  Vazio,
} from "@/components/admin/oferta/ui";
import MapaBrasil from "@/components/admin/oferta/MapaBrasil";
import MapaRaio from "@/components/admin/oferta/MapaRaio";

const CORES = ["#a9551f", "#4a7c6a", "#3f6290", "#d9905a", "#7a4f9a", "#2f7a5b", "#b4412d", "#8a6d1f"];

/** /admin/oferta/mapa — Brasil por estado e o estado foco com raio de atendimento. */
export default function AdminOfertaMapa() {
  const { dados, erro, carregando } = useOfertaPainel();
  const [vista, setVista] = useState<"estado" | "brasil">("estado");
  const [categoria, setCategoria] = useState<string>("");
  const [ufSel, setUfSel] = useState<string | null>(null);
  const [raios, setRaios] = useState(true);

  const uf = dados?.config.foco_uf ?? "MG";
  const cidadesUf = useCidadesUf(uf);

  const nomesCat = useMemo(() => new Map((dados?.categorias ?? []).map((c) => [c.id, c.nome])), [dados]);
  const filtrados: FornecedorOferta[] = useMemo(
    () => (dados?.fornecedores ?? []).filter((f) => !categoria || f.categoria_id === categoria),
    [dados, categoria],
  );
  const doEstado = useMemo(() => filtrados.filter((f) => (f.uf ?? "").toUpperCase().startsWith(uf)), [filtrados, uf]);

  const cob = useMemo(() => cobertura(cidadesUf, doEstado), [cidadesUf, doEstado]);
  const semCobertura = useMemo(() => cidadesUf.filter((_, i) => !cob.cobertasIdx.has(i)), [cidadesUf, cob]);

  const ufs = useMemo(() => porUf(filtrados), [filtrados]);
  const cidadesSede = useMemo(
    () =>
      [
        ...contarPor(
          ufSel ? filtrados.filter((f) => f.uf?.toUpperCase().startsWith(ufSel)) : filtrados,
          (f) => f.cidade && `${f.cidade}/${f.uf ?? ""}`,
        ).entries(),
      ]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    [filtrados, ufSel],
  );

  const coresCat = useMemo(() => {
    const top = [...contarPor(doEstado, (f) => f.categoria_id).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, CORES.length - 1);
    return new Map(top.map(([id], i) => [id, CORES[i]]));
  }, [doEstado]);
  const corPorCategoria = useCallback(
    (id: string | null) => (categoria ? CORES[0] : (id && coresCat.get(id)) || "#8a8178"),
    [categoria, coresCat],
  );

  const raioMedio = doEstado.length
    ? Math.round(doEstado.reduce((s, f) => s + (f.raio_km ?? 0), 0) / doEstado.length)
    : 0;
  const nacionais = doEstado.filter((f) => f.modo === "nacional").length;

  return (
    <div className="of-pagina cz-enter">
      <Cabecalho
        titulo="Oferta por"
        destaque="local"
        descricao="Onde estão os fornecedores, até onde cada um atende e quais cidades ficam descobertas."
        acoes={
          <>
            <select
              className="of-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas as categorias</option>
              {(dados?.categorias ?? [])
                .filter((c) => c.ativa)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
            <Chips
              rotulo="Vista"
              valor={vista}
              onChange={setVista}
              opcoes={[
                { id: "estado", nome: dados?.config.foco_uf === "MG" ? "Minas Gerais" : uf },
                { id: "brasil", nome: "Brasil" },
              ]}
            />
          </>
        }
      />
      <AbasOferta />
      {erro && <Erro texto={erro} />}
      {carregando && !dados && <Carregando />}

      {dados && vista === "estado" && (
        <>
          <div className="of-kpis">
            <Kpi
              rotulo={`Fornecedores com sede em ${uf}`}
              valor={num(doEstado.length)}
              detalhe={categoria ? nomesCat.get(categoria) : "todas as categorias"}
            />
            <Kpi
              rotulo={`Cidades de ${uf} cobertas`}
              valor={cidadesUf.length ? pct(cob.pct, 1) : "…"}
              detalhe={
                cidadesUf.length ? `${num(cob.cobertas)} de ${num(cob.total)} municípios` : "carregando municípios"
              }
              tom={cob.pct >= 80 ? "ok" : cob.pct >= 40 ? "warn" : "err"}
            />
            <Kpi rotulo="Raio médio" valor={`${raioMedio} km`} detalhe="declarado no cadastro" />
            <Kpi rotulo="Atendem o Brasil todo" valor={num(nacionais)} detalhe="cobrem todas as cidades" />
          </div>
          <Bloco
            titulo={`${uf}: fornecedores e raio de atendimento`}
            sub="Círculo tracejado = região foco. Pontos vermelhos = municípios sem nenhum fornecedor que atenda (pelo raio)."
            acoes={
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={raios} onChange={(e) => setRaios(e.target.checked)} /> Mostrar raios
              </label>
            }
          >
            <MapaRaio
              fornecedores={doEstado}
              config={dados.config}
              cidadesSemCobertura={nacionais ? [] : semCobertura}
              mostrarRaios={raios}
              corPorCategoria={corPorCategoria}
            />
            {!categoria && coresCat.size > 0 && (
              <Legenda
                itens={[
                  ...[...coresCat.entries()].map(([id, cor]) => ({ cor, rotulo: nomesCat.get(id) ?? "?" })),
                  { cor: "#8a8178", rotulo: "Outras" },
                  { cor: "#b4412d", rotulo: "Município sem cobertura" },
                ]}
              />
            )}
            {raioMedio > 0 && raioMedio <= 150 && uf === "MG" && (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ad-body)" }}>
                Minas tem quase 1.000 km de ponta a ponta: um raio de 150 km a partir de BH não chega ao Triângulo, ao
                Norte nem à Zona da Mata. A cobertura acima mostra o tamanho do buraco.
              </p>
            )}
          </Bloco>
        </>
      )}

      {dados && vista === "brasil" && (
        <div className="of-grid2">
          <Bloco titulo="Fornecedores por estado" sub="Clique num estado para ver as cidades-sede">
            <MapaBrasil valores={ufs} selecionada={ufSel} onSelecionar={setUfSel} />
          </Bloco>
          <Bloco titulo={ufSel ? `Cidades-sede em ${ufSel}` : "Cidades-sede com mais fornecedores"}>
            {cidadesSede.length === 0 ? (
              <Vazio>Nenhum fornecedor aprovado aqui.</Vazio>
            ) : (
              <table className="of-tabela">
                <thead>
                  <tr>
                    <th>Cidade</th>
                    <th className="n">Fornecedores</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadesSede.map(([c, n]) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="n">{num(n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloco>
        </div>
      )}
    </div>
  );
}
