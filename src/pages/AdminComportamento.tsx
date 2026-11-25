import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { duracao, num, pct, razao } from "@/lib/oferta";
import { useComportamento, type Segmento } from "@/components/admin/comportamento/useComportamento";
import MapaDeCalor from "@/components/admin/comportamento/MapaDeCalor";
import { AbasOferta, Barra, Bloco, Cabecalho, Carregando, Chips, Erro, Kpi, Vazio } from "@/components/admin/oferta/ui";

const SEGMENTOS: { id: Segmento; nome: string }[] = [
  { id: "todos", nome: "Todos" },
  { id: "visitante", nome: "Visitantes" },
  { id: "couple", nome: "Casais" },
  { id: "supplier", nome: "Fornecedores" },
  { id: "profissional", nome: "Profissionais" },
];
const NOME_SEG: Record<string, string> = {
  visitante: "Visitante",
  couple: "Casal",
  supplier: "Fornecedor",
  profissional: "Profissional",
  generico: "Genérico",
};

type Metrica = "visitantes" | "sessoes" | "pageviews" | "buscas" | "orcamentos";

/** /admin/comportamento — o que as pessoas fazem no site (PostHog). */
export default function AdminComportamento() {
  const [dias, setDias] = useState<"7" | "30" | "90">("30");
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const [metrica, setMetrica] = useState<Metrica>("visitantes");
  const { dados, erro, carregando, recarregar } = useComportamento(Number(dias), segmento);

  const k = dados?.kpis?.[0] ?? {};
  const s = dados?.sessoes_resumo?.[0];
  const semResultado = useMemo(() => (dados?.buscas ?? []).filter((b) => b.sem_resultado > 0).slice(0, 12), [dados]);
  const topBuscas = useMemo(() => [...(dados?.buscas ?? [])].sort((a, b) => b.buscas - a.buscas).slice(0, 12), [dados]);
  const maxCaminho = Math.max(1, ...(dados?.caminhos ?? []).map((c) => c.vezes));
  const serie = useMemo(
    () =>
      (dados?.diario ?? []).map((d) => ({
        ...d,
        rotulo: new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      })),
    [dados],
  );

  const vazamento = razao(k.cliques_whatsapp ?? 0, k.orcamentos ?? 0);

  return (
    <div className="of-pagina cz-enter">
      <Cabecalho
        titulo="Comportamento no"
        destaque="site"
        descricao="Quanto tempo as pessoas ficam, por onde navegam, o que buscam e não acham, e onde clicam. Dados do PostHog."
        acoes={
          <>
            <Chips
              rotulo="Período"
              valor={dias}
              onChange={setDias}
              opcoes={[
                { id: "7", nome: "7 dias" },
                { id: "30", nome: "30 dias" },
                { id: "90", nome: "90 dias" },
              ]}
            />
            <button type="button" className="cz-btn" onClick={recarregar} disabled={carregando}>
              <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </>
        }
      />
      <AbasOferta />
      <Chips rotulo="Segmento" valor={segmento} onChange={setSegmento} opcoes={SEGMENTOS} />

      {erro && (
        <Erro
          texto={erro}
          acao={
            <button className="cz-btn" onClick={recarregar}>
              Tentar de novo
            </button>
          }
        />
      )}
      {carregando && !dados && <Carregando texto="Lendo o PostHog…" />}
      {dados?.erros?.length ? <Erro texto={`Algumas consultas falharam: ${dados.erros.join(" · ")}`} /> : null}

      {dados && (
        <>
          <div className="of-kpis">
            <Kpi
              rotulo="Visitantes"
              valor={num(k.visitantes)}
              detalhe={`${num(k.visitantes_logados)} logados`}
              ativo={metrica === "visitantes"}
              onClick={() => setMetrica("visitantes")}
            />
            <Kpi
              rotulo="Sessões"
              valor={num(k.sessoes)}
              detalhe={`${s?.paginas_por_sessao?.toLocaleString("pt-BR") ?? "—"} páginas por sessão`}
              ativo={metrica === "sessoes"}
              onClick={() => setMetrica("sessoes")}
            />
            <Kpi rotulo="Tempo por sessão" valor={duracao(s?.duracao_mediana_s)} detalhe="mediana" />
            <Kpi
              rotulo="Rejeição"
              valor={pct(s?.pct_rejeicao)}
              detalhe="saíram na 1ª página"
              tom={(s?.pct_rejeicao ?? 0) > 60 ? "warn" : undefined}
            />
            <Kpi
              rotulo="Buscas"
              valor={num(k.buscas)}
              detalhe={`${num(k.buscas_sem_resultado)} sem resultado`}
              tom={k.buscas_sem_resultado ? "err" : undefined}
              ativo={metrica === "buscas"}
              onClick={() => setMetrica("buscas")}
            />
            <Kpi
              rotulo="Pedidos de orçamento"
              valor={num(k.orcamentos)}
              ativo={metrica === "orcamentos"}
              onClick={() => setMetrica("orcamentos")}
            />
          </div>

          <Bloco
            titulo={`${SEGMENTOS.find((x) => x.id === segmento)?.nome}: ${metrica === "sessoes" ? "sessões" : metrica === "orcamentos" ? "pedidos de orçamento" : metrica} por dia`}
          >
            {serie.length === 0 ? (
              <Vazio>
                Sem dados no período. Depois de publicar, os números aparecem conforme as pessoas aceitam ou recusam os
                cookies.
              </Vazio>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serie} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="ofArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d9905a" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#d9905a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f0ebe4" vertical={false} />
                    <XAxis
                      dataKey="rotulo"
                      tick={{ fontSize: 11, fill: "#8a8178" }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8a8178" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8e2da", fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey={metrica}
                      stroke="#a9551f"
                      strokeWidth={2.2}
                      fill="url(#ofArea)"
                      name={metrica}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Bloco>

          <div className="of-grid2">
            <Bloco titulo="Funil do casal" sub="Pessoas únicas em cada etapa">
              <div className="of-funil">
                {(
                  [
                    ["Visitaram", k.visitantes ?? 0],
                    ["Buscaram", k.pessoas_buscaram ?? 0],
                    ["Viram um perfil", k.pessoas_viram_perfil ?? 0],
                    ["Pediram orçamento", k.pessoas_pediram_orcamento ?? 0],
                  ] as [string, number][]
                ).map(([nome, v], i, arr) => (
                  <div key={nome} className="of-funil-l">
                    <span>{nome}</span>
                    <Barra
                      valor={v}
                      max={Math.max(1, arr[0][1])}
                      cor={i === arr.length - 1 ? "var(--ad-ok)" : undefined}
                    />
                    <b>
                      {num(v)}
                      {i > 0 && (
                        <small style={{ display: "block", fontWeight: 500, color: "var(--ad-muted)", fontSize: 11 }}>
                          {pct(razao(v, arr[i - 1][1]))}
                        </small>
                      )}
                    </b>
                  </div>
                ))}
              </div>
            </Bloco>

            <Bloco titulo="Sinais de atrito" sub="Onde a experiência trava ou o negócio sai da plataforma">
              <div className="of-kpis" style={{ boxShadow: "none" }}>
                <Kpi
                  rotulo="Cliques no WhatsApp"
                  valor={num(k.cliques_whatsapp)}
                  detalhe={vazamento != null ? `${pct(vazamento)} dos pedidos` : "por pedido de orçamento"}
                  tom={(vazamento ?? 0) > 60 ? "warn" : undefined}
                />
                <Kpi
                  rotulo="Cliques de raiva"
                  valor={num(k.rage_clicks)}
                  detalhe="vários cliques rápidos no mesmo lugar"
                  tom={k.rage_clicks ? "warn" : undefined}
                />
                <Kpi
                  rotulo="Cliques sem efeito"
                  valor={num(k.dead_clicks)}
                  detalhe="clicou e nada aconteceu"
                  tom={k.dead_clicks ? "warn" : undefined}
                />
              </div>
            </Bloco>
          </div>

          <div className="of-grid2">
            <Bloco titulo="Páginas" sub="Caminhos com id agrupados (ex.: /fornecedor/:id)">
              {dados.paginas.length === 0 ? (
                <Vazio>Sem páginas no período.</Vazio>
              ) : (
                <div className="of-rolagem" style={{ maxHeight: 420 }}>
                  <table className="of-tabela">
                    <thead>
                      <tr>
                        <th>Página</th>
                        <th className="n">Visualizações</th>
                        <th className="n">Tempo médio</th>
                        <th className="n">Saída</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.paginas.map((p) => (
                        <tr key={p.pagina}>
                          <td
                            style={{
                              maxWidth: 260,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={p.pagina}
                          >
                            {p.pagina}
                          </td>
                          <td className="n">{num(p.visualizacoes)}</td>
                          <td className="n">{duracao(p.tempo_medio_s)}</td>
                          <td className="n">{pct(p.pct_saida)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Bloco>

            <Bloco titulo="Caminhos mais comuns" sub="De uma página para a próxima">
              {dados.caminhos.length === 0 ? (
                <Vazio>Sem navegação no período.</Vazio>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflow: "auto" }}>
                  {dados.caminhos.slice(0, 20).map((c) => (
                    <div
                      key={c.de + c.para}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 44px",
                        gap: 10,
                        alignItems: "center",
                        fontSize: 12.5,
                      }}
                    >
                      <span
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={`${c.de} → ${c.para}`}
                      >
                        <span style={{ color: "var(--ad-muted)" }}>{c.de}</span> → <b>{c.para}</b>
                      </span>
                      <Barra valor={c.vezes} max={maxCaminho} cor="var(--ad-info)" />
                      <b className="cz-num" style={{ textAlign: "right" }}>
                        {num(c.vezes)}
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </Bloco>
          </div>

          <div className="of-grid2">
            <Bloco titulo="Buscas sem resultado" sub="Procura que não achou fornecedor: é onde recrutar primeiro">
              {semResultado.length === 0 ? (
                <Vazio>Nenhuma busca sem resultado no período.</Vazio>
              ) : (
                <TabelaBuscas linhas={semResultado} destaque />
              )}
            </Bloco>
            <Bloco titulo="O que mais buscam" sub="Cidade × categoria ou termo">
              {topBuscas.length === 0 ? <Vazio>Sem buscas no período.</Vazio> : <TabelaBuscas linhas={topBuscas} />}
            </Bloco>
          </div>

          <Bloco titulo="Mapa de calor" sub="Onde as pessoas clicam e até onde rolam a página">
            <MapaDeCalor paginas={dados.paginas.map((p) => p.pagina)} dias={Number(dias)} />
          </Bloco>

          <Bloco
            titulo="Sessões recentes"
            sub="Gravações só de quem aceitou todos os cookies; campos de formulário ficam mascarados"
          >
            {dados.sessoes_recentes.length === 0 ? (
              <Vazio>Nenhuma sessão no período.</Vazio>
            ) : (
              <div className="of-rolagem">
                <table className="of-tabela">
                  <thead>
                    <tr>
                      <th>Início</th>
                      <th>Quem</th>
                      <th className="n">Duração</th>
                      <th className="n">Páginas</th>
                      <th>Entrou em</th>
                      <th>Saiu de</th>
                      <th>Ações</th>
                      <th>Onde</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {dados.sessoes_recentes.map((x) => (
                      <tr key={x.session_id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {new Date(x.inicio).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>{NOME_SEG[x.tipo_conta] ?? x.tipo_conta}</td>
                        <td className="n">{duracao(x.duracao_s)}</td>
                        <td className="n">{num(x.paginas)}</td>
                        <td>{x.entrada}</td>
                        <td>{x.saida}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {x.buscas > 0 && <span className="cz-st cz-info">{x.buscas} busca(s)</span>}{" "}
                          {x.orcamentos > 0 && <span className="cz-st cz-ok">orçamento</span>}{" "}
                          {x.whatsapp > 0 && <span className="cz-st cz-warn">WhatsApp</span>}{" "}
                          {x.rage_clicks > 0 && <span className="cz-st cz-err">raiva</span>}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--ad-body)" }}>
                          {[x.cidade, x.dispositivo].filter(Boolean).join(" · ")}
                        </td>
                        <td>
                          <a
                            className="cz-btn"
                            href={dados.replay_base + encodeURIComponent(x.session_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Assistir <ExternalLink className="h-3.5 w-3.5" />
                          </a>
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

function TabelaBuscas({
  linhas,
  destaque,
}: {
  linhas: { cidade: string; procura: string; buscas: number; sem_resultado: number; media_resultados: number | null }[];
  destaque?: boolean;
}) {
  return (
    <table className="of-tabela">
      <thead>
        <tr>
          <th>Cidade</th>
          <th>Procura</th>
          <th className="n">Buscas</th>
          <th className="n">{destaque ? "Sem resultado" : "Média de resultados"}</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((b) => (
          <tr key={b.cidade + b.procura}>
            <td>{b.cidade}</td>
            <td>{b.procura}</td>
            <td className="n">{num(b.buscas)}</td>
            <td className="n">
              {destaque ? (
                <span className="cz-st cz-err">{num(b.sem_resultado)}</span>
              ) : (
                (b.media_resultados ?? 0).toLocaleString("pt-BR")
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
