import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Printer } from "lucide-react";
import SEO from "@/components/SEO";
import BrandLogo from "@/components/shared/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { carregarFotosSonho } from "@/components/sonho/FotosSonho";
import { RESULTADOS, carregarMadrinha, type EstiloQuiz } from "@/lib/quiz";

/** O que cada estilo pede, na prática, de cada fornecedor. */
const DICAS: Record<
  EstiloQuiz,
  { resumo: string; convidados: string; perguntas: { categoria: string; itens: string[] }[] }
> = {
  intimista: {
    resumo:
      "Casamento pequeno, ao ar livre ou em casa de campo, com cara de almoço em família. O investimento vai para comida boa, fotos espontâneas e detalhes com história.",
    convidados: "Até 80 convidados",
    perguntas: [
      {
        categoria: "Espaço ou chácara",
        itens: [
          "Tem plano B coberto se chover?",
          "Posso trazer meu próprio buffet e decoração?",
          "Até que horas pode ter som? Tem vizinhos perto?",
        ],
      },
      {
        categoria: "Buffet",
        itens: [
          "Fazem serviço de mesa posta (empratado ou à francesa) para poucos convidados?",
          "Qual o mínimo de convidados do contrato?",
          "Garçons e louça estão inclusos?",
        ],
      },
      {
        categoria: "Fotografia",
        itens: [
          "Trabalha com fotos espontâneas, sem muita pose?",
          "Quantas horas de cobertura cabem num casamento de dia?",
          "Entrega o vídeo curto para o story?",
        ],
      },
      {
        categoria: "Decoração",
        itens: [
          "Usa flores da estação para baratear?",
          "Monta mesa única comprida?",
          "O varal de lâmpadas está incluso?",
        ],
      },
    ],
  },
  elegante: {
    resumo:
      "Clássico e atemporal: cerimônia na igreja ou em salão claro, branco, velas e cristais. Aqui o cuidado é com acabamento, serviço impecável e música ao vivo.",
    convidados: "De 100 a 200 convidados",
    perguntas: [
      {
        categoria: "Cerimônia",
        itens: [
          "Quais datas a igreja ou o espaço ainda tem livres?",
          "O quarteto de cordas já tocou nesse lugar? Conhece a acústica?",
          "Quanto tempo de intervalo entre cerimônia e festa?",
        ],
      },
      {
        categoria: "Buffet",
        itens: [
          "Fazem degustação antes de fechar?",
          "O serviço é volante ou empratado?",
          "Taças de cristal e toalhas brancas estão inclusas?",
        ],
      },
      {
        categoria: "Decoração",
        itens: [
          "Trabalham com arranjos altos e baixos nas mesas?",
          "Incluem velas e castiçais?",
          "Montam e desmontam no mesmo dia?",
        ],
      },
      {
        categoria: "Cerimonial",
        itens: [
          "Quantas pessoas da equipe no dia?",
          "Cuidam do ensaio da cerimônia?",
          "Fazem o cronograma com os fornecedores?",
        ],
      },
    ],
  },
  grandioso: {
    resumo:
      "Festão de salão: muita gente, mesa imperial, pista cheia até o sol nascer. O orçamento vai para espaço, buffet farto, banda ou DJ e iluminação de pista.",
    convidados: "Mais de 200 convidados",
    perguntas: [
      {
        categoria: "Salão",
        itens: [
          "Qual a capacidade real com pista e mesas?",
          "Até que horas a festa pode ir?",
          "Tem gerador e estacionamento com manobrista?",
        ],
      },
      {
        categoria: "Buffet",
        itens: [
          "O cardápio inclui jantar e madrugada (caldos, lanche)?",
          "Bebidas estão inclusas ou à parte?",
          "Quantos garçons por convidado?",
        ],
      },
      {
        categoria: "Música",
        itens: [
          "Banda e DJ fazem a troca sem silêncio?",
          "Iluminação e som da pista estão inclusos?",
          "Quantas horas de pista estão no contrato?",
        ],
      },
      {
        categoria: "Doces e bolo",
        itens: [
          "Fazem bem-casados e brigadeiros na quantidade da festa?",
          "O bolo cenográfico tem parte de verdade?",
          "Entregam e montam a mesa de doces?",
        ],
      },
    ],
  },
};

/** Dossiê do estilo: prêmio da Madrinha de honra (3 pessoas pelo link). */
export default function DossieEstilo() {
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [nivel, setNivel] = useState(0);
  const [estilo, setEstilo] = useState<EstiloQuiz | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [m, { data }, f] = await Promise.all([
        carregarMadrinha(),
        (supabase.from("sonho_perfis" as any) as any).select("estilo").eq("user_id", user.id).maybeSingle(),
        carregarFotosSonho(user.id),
      ]);
      setNivel(m.nivel);
      setEstilo(data?.estilo || null);
      setFotos(f.map((x) => x.url).slice(0, 6));
      setCarregando(false);
    })();
  }, [user?.id]);

  const info = estilo ? RESULTADOS[estilo] : null;
  const dicas = estilo ? DICAS[estilo] : null;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7", color: "#2B211B" }}>
      <SEO title="Dossiê do meu estilo | Casamenteiro" noIndex />
      <header className="border-b print:hidden" style={{ borderColor: "#ECE3DA" }}>
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/meu-sonho" className="flex items-center gap-1.5 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Meu mural
          </Link>
          <BrandLogo />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-7 px-5 pb-14 pt-6">
        {carregando ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : nivel < 2 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8" style={{ color: "#8A6420" }} aria-hidden="true" />
            <h1 className="text-2xl font-semibold">Seu dossiê ainda está fechado</h1>
            <p className="max-w-sm text-[15px]" style={{ color: "#6E625A" }}>
              Ele abre quando 3 pessoas fizerem o quiz pelo seu link. Compartilhe no mural.
            </p>
            <Link
              to="/meu-sonho"
              className="mt-2 flex h-[52px] items-center rounded-[14px] px-7 font-semibold text-white"
              style={{ background: "#A9582D" }}
            >
              Voltar ao mural
            </Link>
          </div>
        ) : !info || !dicas ? (
          <div className="py-16 text-center">
            <h1 className="text-2xl font-semibold">Faça o quiz para montar o dossiê</h1>
            <Link to="/quiz" className="mt-4 inline-block font-semibold" style={{ color: "#A9582D" }}>
              Fazer o quiz
            </Link>
          </div>
        ) : (
          <>
            <div>
              <span className="text-sm font-medium" style={{ color: "#8A6420" }}>
                Dossiê do seu estilo
              </span>
              <h1 className="mt-1 text-[30px] font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
                {info.nome}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#5E4F45" }}>
                {dicas.resumo}
              </p>
              <p className="mt-2 text-sm font-medium">{dicas.convidados}</p>
            </div>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Sua paleta</h2>
              <div className="grid grid-cols-4 gap-2">
                {info.paleta.map((c) => (
                  <div key={c} className="flex flex-col gap-1.5">
                    <div
                      className="h-16 rounded-xl border"
                      style={{ background: c, borderColor: "rgba(43,33,27,.12)" }}
                    />
                    <span className="text-center text-xs font-mono" style={{ color: "#5E4F45" }}>
                      {c}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs" style={{ color: "#6E625A" }}>
                Mande esses códigos para a decoração e para quem faz os convites.
              </p>
            </section>

            {fotos.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Suas referências</h2>
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((f) => (
                    <img key={f} src={f} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" />
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">As perguntas certas para cada fornecedor</h2>
              {dicas.perguntas.map((g) => (
                <div key={g.categoria} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#ECE3DA" }}>
                  <h3 className="font-semibold">{g.categoria}</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-snug" style={{ color: "#3F342D" }}>
                    {g.itens.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] border text-base font-semibold print:hidden"
              style={{ borderColor: "#CDBFB3" }}
            >
              <Printer className="h-5 w-5" aria-hidden="true" /> Salvar em PDF ou imprimir
            </button>
          </>
        )}
      </main>
    </div>
  );
}
