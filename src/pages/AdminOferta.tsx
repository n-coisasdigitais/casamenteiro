import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  horas,
  linhasCategorias,
  naRegiaoFoco,
  num,
  padraoFaltando,
  pct,
  porUf,
  razao,
  resumoCategorias,
} from "@/lib/oferta";
import { useOfertaPainel } from "@/components/admin/oferta/useOfertaPainel";
import {
  AbasOferta,
  Barra,
  Bloco,
  Cabecalho,
  Carregando,
  Erro,
  Kpi,
  Status,
  Vazio,
} from "@/components/admin/oferta/ui";
import MapaBrasil from "@/components/admin/oferta/MapaBrasil";

/** /admin/oferta — visão geral da oferta (painel v2). */
export default function AdminOferta() {
  const { dados, erro, carregando, recarregar } = useOfertaPainel();
  const [criando, setCriando] = useState(false);

  const linhas = useMemo(() => (dados ? linhasCategorias(dados) : []), [dados]);
  const resumo = useMemo(() => resumoCategorias(linhas), [linhas]);
  const faltando = useMemo(() => (dados ? padraoFaltando(dados) : []), [dados]);
  const ufs = useMemo(() => (dados ? porUf(dados.fornecedores) : new Map()), [dados]);
  const naRegiao = useMemo(
    () => (dados ? dados.fornecedores.filter((f) => naRegiaoFoco(f, dados.config)).length : 0),
    [dados],
  );

  const criarPadrao = async () => {
    setCriando(true);
    const { data, error } = await (supabase.rpc as any)("admin_criar_categorias_padrao", {});
    setCriando(false);
    if (error) return toast({ title: "Não foi possível criar", description: error.message, variant: "destructive" });
    toast({
      title: `${data ?? 0} categorias criadas como rascunho`,
      description: "Aparecem no cadastro do fornecedor e entram na vitrine quando o 1º fornecedor for aprovado.",
    });
    recarregar();
  };

  const atualizar = (
    <button type="button" className="cz-btn" onClick={recarregar} disabled={carregando}>
      <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
    </button>
  );

  return (
    <div className="of-pagina cz-enter">
      <Cabecalho
        titulo="Painel de"
        destaque="oferta"
        descricao={`Quantas categorias temos, quantos fornecedores em cada uma e o que falta para ${dados?.config.foco_nome ?? "a região foco"}.`}
        acoes={atualizar}
      />
      <AbasOferta />

      {erro && <Erro texto={erro} acao={atualizar} />}
      {carregando && !dados && <Carregando />}

      {dados && (
        <>
          <div className="of-kpis">
            <Kpi
              rotulo="Categorias ativas"
              valor={num(resumo.total)}
              detalhe={`${resumo.semNivel} sem nível definido`}
            />
            <Kpi
              rotulo="Categorias vazias"
              valor={num(resumo.vazias)}
              detalhe={`na região ${dados.config.foco_nome}`}
              tom={resumo.vazias ? "err" : "ok"}
            />
            <Kpi
              rotulo="Essenciais na meta"
              valor={`${resumo.essenciaisOk}/${resumo.essenciaisTotal}`}
              detalhe={`meta: ${dados.config.meta.essencial} por categoria`}
              tom={resumo.essenciaisOk === resumo.essenciaisTotal && resumo.essenciaisTotal ? "ok" : "warn"}
            />
            <Kpi
              rotulo="Fornecedores aprovados"
              valor={num(dados.funil.aprovados)}
              detalhe={`${num(naRegiao)} na região foco`}
            />
            <Kpi
              rotulo="Profissionais"
              valor={num(dados.profissionais.length)}
              detalhe={`${num(dados.profissionais.filter((p) => p.disponivel).length)} disponíveis`}
            />
          </div>

          {faltando.length > 0 && (
            <Bloco
              titulo={
                faltando.length === 1
                  ? "Falta 1 categoria do padrão Casamenteiro"
                  : `Faltam ${faltando.length} categorias do padrão Casamenteiro`
              }
              sub="Criadas como rascunho: aparecem no cadastro do fornecedor e ficam fora da vitrine do casal até o 1º fornecedor aprovado."
              acoes={
                <button type="button" className="cz-btn pri" onClick={criarPadrao} disabled={criando}>
                  <Sparkles className="h-4 w-4" /> {criando ? "Criando…" : "Criar como rascunho"}
                </button>
              }
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {faltando.map((f) => (
                  <span
                    key={f.slug}
                    className={`cz-st ${f.nivel === "essencial" ? "cz-err" : f.nivel === "recomendada" ? "cz-warn" : "cz-off"}`}
                  >
                    {f.nome}
                  </span>
                ))}
              </div>
            </Bloco>
          )}

          <div className="of-grid2">
            <Bloco
              titulo="Essenciais × meta"
              sub={`Fornecedores aprovados em ${dados.config.foco_nome} (${dados.config.foco_raio_km} km) ou que atendem o Brasil todo`}
              acoes={
                <Link className="cz-btn" to="/admin/oferta/categorias">
                  Ver todas
                </Link>
              }
            >
              {linhas.filter((l) => l.nivel === "essencial").length === 0 ? (
                <Vazio>Nenhuma categoria marcada como essencial ainda. Defina os níveis em Categorias.</Vazio>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {linhas
                    .filter((l) => l.nivel === "essencial")
                    .map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(120px, 1.2fr) 2fr 60px 84px",
                          gap: 10,
                          alignItems: "center",
                          fontSize: 13,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {l.nome}
                          {l.rascunho && (
                            <span className="cz-st cz-off" style={{ marginLeft: 6 }}>
                              rascunho
                            </span>
                          )}
                        </span>
                        <Barra
                          valor={l.naRegiao}
                          max={l.metaEfetiva}
                          cor={l.status === "ok" ? "var(--ad-ok)" : undefined}
                        />
                        <b className="cz-num" style={{ textAlign: "right" }}>
                          {l.naRegiao}/{l.metaEfetiva}
                        </b>
                        <Status s={l.status} />
                      </div>
                    ))}
                </div>
              )}
            </Bloco>

            <Bloco titulo="Funil do fornecedor" sub="Do cadastro ao primeiro casamento fechado">
              <Funil
                etapas={[
                  ["Cadastrados", dados.funil.cadastrados],
                  ["Aprovados", dados.funil.aprovados],
                  ["Perfil completo", dados.funil.perfil_completo],
                  ["Receberam orçamento", dados.funil.receberam_orcamento],
                  ["Fecharam negócio", dados.funil.fecharam],
                ]}
              />
              <p style={{ margin: 0, fontSize: 12, color: "var(--ad-muted)" }}>
                Perfil completo = cidade, foto, preço mínimo e telefone/WhatsApp.
              </p>
            </Bloco>
          </div>

          <div className="of-grid2">
            <Bloco
              titulo="Fornecedores pelo Brasil"
              sub="Pela cidade-sede do cadastro"
              acoes={
                <Link className="cz-btn" to="/admin/oferta/mapa">
                  Abrir mapa
                </Link>
              }
            >
              <MapaBrasil valores={ufs} />
            </Bloco>

            <Bloco titulo="Saúde do marketplace" sub="Últimos 30–90 dias, direto do banco">
              <div className="of-kpis" style={{ boxShadow: "none" }}>
                <Kpi rotulo="Orçamentos (30 dias)" valor={num(dados.saude.orcamentos_30d)} />
                <Kpi
                  rotulo="1ª resposta (mediana)"
                  valor={horas(dados.saude.resposta_mediana_horas)}
                  tom={
                    dados.saude.resposta_mediana_horas != null && dados.saude.resposta_mediana_horas > 24
                      ? "warn"
                      : undefined
                  }
                  detalhe="pedidos dos últimos 90 dias"
                />
                <Kpi
                  rotulo="Respondidos em 48 h"
                  valor={pct(dados.saude.pct_respondidos_48h)}
                  tom={dados.saude.pct_respondidos_48h != null && dados.saude.pct_respondidos_48h < 70 ? "err" : "ok"}
                />
                <Kpi rotulo="Contratados (30 dias)" valor={num(dados.saude.contratados_30d)} />
                <Kpi
                  rotulo="Fornecedores ativos"
                  valor={pct(dados.saude.pct_fornecedores_ativos_30d)}
                  detalhe="entraram no site em 30 dias"
                />
                <Kpi
                  rotulo="Taxa de fechamento"
                  valor={pct(razao(dados.funil.fecharam, dados.funil.receberam_orcamento))}
                  detalhe="fornecedores que fecharam / receberam"
                />
              </div>
            </Bloco>
          </div>
        </>
      )}
    </div>
  );
}

function Funil({ etapas }: { etapas: [string, number][] }) {
  const max = Math.max(1, ...etapas.map((e) => e[1]));
  return (
    <div className="of-funil">
      {etapas.map(([nome, v], i) => {
        const anterior = i > 0 ? etapas[i - 1][1] : null;
        return (
          <div key={nome} className="of-funil-l">
            <span>{nome}</span>
            <Barra valor={v} max={max} cor={i === etapas.length - 1 ? "var(--ad-ok)" : undefined} />
            <b>
              {num(v)}
              {anterior ? (
                <small style={{ display: "block", fontWeight: 500, color: "var(--ad-muted)", fontSize: 11 }}>
                  {pct(razao(v, anterior))}
                </small>
              ) : null}
            </b>
          </div>
        );
      })}
    </div>
  );
}
