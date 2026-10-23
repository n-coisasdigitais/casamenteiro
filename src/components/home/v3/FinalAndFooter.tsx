import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Thread } from "./parts";

export function FinalCTA({ onSimular }: { onSimular: () => void }) {
  return (
    <section className="px-6 pb-28 pt-24 text-center">
      <div className="mb-8">
        <Thread color="var(--hv-clay)" />
      </div>
      <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5">
        <h2 className="m-0" style={{ fontSize: "clamp(56px, 8vw, 112px)", lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.05em" }}>
          Bora casar<span className="hv-serif" style={{ color: "var(--hv-clay)" }}>?</span>
        </h2>
        <p className="m-0 text-[20px] leading-normal" style={{ color: "var(--hv-body)" }}>
          Em 1 minuto vocês já sabem quanto custa e com quem contar.
        </p>
        <button type="button" onClick={onSimular} className="hv-btn hv-pulse inline-flex min-h-[60px] items-center rounded-full px-9 text-[18px] font-bold text-white" style={{ background: "var(--hv-clay)" }}>
          Simular meu casamento
        </button>
      </div>
    </section>
  );
}

export function HomeFooterV3() {
  const col = (titulo: string, links: { to: string; label: string }[]) => (
    <div className="flex flex-col gap-2.5">
      <span className="font-semibold" style={{ color: "var(--hv-cream)" }}>
        {titulo}
      </span>
      {links.map((l) => (
        <Link key={l.to + l.label} to={l.to} className="hover:text-white" style={{ color: "#CFC6BC" }}>
          {l.label}
        </Link>
      ))}
    </div>
  );
  return (
    <footer className="px-6 py-12 text-sm" style={{ background: "var(--hv-ink)", color: "#CFC6BC" }}>
      <div className="mx-auto grid max-w-[1200px] gap-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <div className="flex flex-col gap-2.5">
          <span className="text-[20px] font-extrabold" style={{ color: "var(--hv-cream)", letterSpacing: "-0.03em" }}>
            casamenteiro<span style={{ color: "var(--hv-peach)" }}>.</span>
          </span>
          <span>Casamentos em BH e região.</span>
        </div>
        {col("Casais", [
          { to: "/simulador", label: "Simulador" },
          { to: "/explorar", label: "Buscar fornecedores" },
          { to: "/quanto-custa-casar", label: "Quanto custa casar" },
        ])}
        {col("Para empresas", [
          { to: "/fornecedor", label: "Sou fornecedor" },
          { to: "/profissional", label: "Sou profissional" },
          { to: "/vagas", label: "Vagas" },
        ])}
        {col("Casamenteiro", [
          { to: "/termos", label: "Termos" },
          { to: "/privacidade", label: "Privacidade" },
          { to: "/login", label: "Entrar" },
        ])}
      </div>
      <div className="mx-auto mt-9 flex max-w-[1200px] flex-wrap justify-between gap-3 border-t pt-5 text-[13px]" style={{ borderColor: "#3A3632" }}>
        <span>© {new Date().getFullYear()} Casamenteiro</span>
        <span className="inline-flex items-center gap-1.5">
          Desenvolvido com carinho pela
          <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "var(--hv-peach)" }}>
            N Coisas Digitais
          </a>
          <Heart className="h-3.5 w-3.5" aria-label="coração" style={{ color: "var(--hv-terracota)", fill: "var(--hv-terracota)" }} />
        </span>
      </div>
    </footer>
  );
}
