import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Botão "voltar ao topo": aparece quando a pessoa já rolou bastante a página. */
export default function BackToTop() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visivel) return null;
  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
