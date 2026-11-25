import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FUNCOES_STAFF } from "@/lib/funcoesStaff";
import { matrizProfissionais, num, vagasPorFuncao } from "@/lib/oferta";
import { useOfertaPainel } from "@/components/admin/oferta/useOfertaPainel";
import { AbasOferta, Barra, Bloco, Cabecalho, Carregando, Chips, Erro, Kpi, Vazio } from "@/components/admin/oferta/ui";

/** /admin/oferta/profissionais — profissionais por função × cidade e vagas sem candidato. */
export default function AdminOfertaProfissionais() {
  const { dados, erro, carregando } = useOfertaPainel();
  const [quem, setQuem] = useState<"todos" | "disponiveis">("todos");
  const [colunas, setColunas] = useState(8);

  const lista = useMemo(() => dados?.profissionais ?? [], [dados]);
  const matriz = useMemo(() => matrizProfissionais(lista, quem === "disponiveis"), [lista, quem]);
  const vagas = useMemo(() => vagasPorFuncao(dados?.vagas ?? []), [dados]);
  const funcoesSemNinguem = useMemo(() => {
    const tem = new Set(matriz.funcoes);
    return (FUNCOES_STAFF as readonly string[]).filter((f) => !tem.has(f));
  }, [matriz]);

  const maxCelula = useMemo(() => {
    let m = 0;
    for (const f of matriz.funcoes) for (const c of matriz.cidades) m = Math.max(m, matriz.valor(f, c));
    return m;
  }, [matriz]);

  const cidadesVis = matriz.cidades.slice(0, colunas);

  return (
    <div className="of-pagina cz-enter">
      <Cabecalho
        titulo="Profissionais por"
        destaque="função e cidade"
        descricao="Garçons, copeiros, seguranças… onde temos gente e onde as vagas ficam sem candidato."
        acoes={
          <Chips
            rotulo="Quem contar"
            valor={quem}
            onChange={setQuem}
            opcoes={[
              { id: "todos", nome: "Todos" },
              { id: "disponiveis", nome: "Só disponíveis" },
            ]}
          />
        }
      />
      <AbasOferta />
      {erro && <Erro texto={erro} />}
      {carregando && !dados && <Carregando />}

      {dados && (
        <>
          <div className="of-kpis">
            <Kpi rotulo="Profissionais cadastrados" valor={num(lista.length)} />
            <Kpi rotulo="Disponíveis" valor={num(lista.filter((p) => p.disponivel).length)} />
            <Kpi rotulo="Verificados" valor={num(lista.filter((p) => p.verificado).length)} />
            <Kpi
              rotulo="Funções sem ninguém"
              valor={num(funcoesSemNinguem.length)}
              tom={funcoesSemNinguem.length ? "warn" : "ok"}
              detalhe={`de ${FUNCOES_STAFF.length} funções`}
            />
            <Kpi rotulo="Cidades com profissionais" valor={num(matriz.cidades.length)} />
          </div>

          <Bloco
            titulo="Função × cidade"
            sub="Cada número é quantos profissionais fazem aquela função naquela cidade (um profissional pode ter várias funções)."
            acoes={
              matriz.cidades.length > 8 && (
                <button
                  type="button"
                  className="cz-btn"
                  onClick={() => setColunas((c) => (c >= matriz.cidades.length ? 8 : c + 8))}
                >
                  {colunas >= matriz.cidades.length ? "Menos cidades" : "Mais cidades"}
                </button>
              )
            }
          >
            {matriz.funcoes.length === 0 ? (
              <Vazio>
                Nenhum profissional ainda. <Link to="/admin/profissionais">Ver cadastro de profissionais</Link>
              </Vazio>
            ) : (
              <div className="of-rolagem">
                <table className="of-tabela of-matriz">
                  <thead>
                    <tr>
                      <th>Função</th>
                      {cidadesVis.map((c) => (
                        <th key={c} className="n" style={{ whiteSpace: "normal", minWidth: 70 }}>
                          {c}
                        </th>
                      ))}
                      <th className="n">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriz.funcoes.map((f) => (
                      <tr key={f}>
                        <td>
                          <b>{f}</b>
                        </td>
                        {cidadesVis.map((c) => {
                          const v = matriz.valor(f, c);
                          const t = maxCelula ? v / maxCelula : 0;
                          return (
                            <td
                              key={c}
                              className="c"
                              style={{
                                background: v ? `rgba(74,124,106,${0.1 + 0.55 * t})` : undefined,
                                color: t > 0.6 ? "#fff" : undefined,
                              }}
                            >
                              {v || ""}
                            </td>
                          );
                        })}
                        <td className="n">
                          <b>{num(matriz.totalFuncao.get(f) ?? 0)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {funcoesSemNinguem.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--ad-body)" }}>Sem nenhum profissional:</span>
                {funcoesSemNinguem.map((f) => (
                  <span key={f} className="cz-st cz-err">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </Bloco>

          <Bloco
            titulo="Vagas e candidatos"
            sub="Vagas dos últimos 30 dias em diante. As do topo têm menos candidatos por vaga: é ali que falta gente."
          >
            {vagas.length === 0 ? (
              <Vazio>Nenhuma vaga publicada no período.</Vazio>
            ) : (
              <table className="of-tabela">
                <thead>
                  <tr>
                    <th>Função</th>
                    <th className="n">Vagas</th>
                    <th className="n">Abertas</th>
                    <th className="n">Candidatos</th>
                    <th style={{ minWidth: 160 }}>Candidatos por vaga</th>
                  </tr>
                </thead>
                <tbody>
                  {vagas.map((v) => (
                    <tr key={v.funcao}>
                      <td>
                        <b>{v.funcao}</b>
                      </td>
                      <td className="n">{num(v.vagas)}</td>
                      <td className="n">{num(v.abertas)}</td>
                      <td className="n">{num(v.candidatos)}</td>
                      <td>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 8, alignItems: "center" }}>
                          <Barra
                            valor={v.candidatosPorVaga}
                            max={3}
                            cor={v.candidatosPorVaga < 1 ? "var(--ad-err)" : "var(--ad-ok)"}
                          />
                          <b className="cz-num" style={{ textAlign: "right" }}>
                            {v.candidatosPorVaga.toLocaleString("pt-BR")}
                          </b>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloco>
        </>
      )}
    </div>
  );
}
