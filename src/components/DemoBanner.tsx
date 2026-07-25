import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";

export default function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("demo_banner_collapsed") === "1";
  });

  useEffect(() => {
    if (!isDemo) return;
    const height = collapsed ? 28 : 44;
    document.body.style.paddingTop = `${height}px`;
    return () => { document.body.style.paddingTop = ""; };
  }, [isDemo, collapsed]);

  const toggle = () => {
    const v = !collapsed;
    setCollapsed(v);
    sessionStorage.setItem("demo_banner_collapsed", v ? "1" : "0");
  };

  if (!isDemo) return null;

  const handleExit = async () => {
    await signOut();
    navigate("/demo", { replace: true });
  };

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        aria-label="Expandir aviso de demonstração"
        className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 py-1 text-[11px] font-semibold hover:opacity-90"
        style={{ background: "#FEF3C7", color: "#78350F", borderBottom: "1px solid #FCD34D" }}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>Modo demo</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] text-[13px] font-medium flex items-center justify-center gap-3 py-2 px-3"
      style={{ background: "#FEF3C7", color: "#78350F", borderBottom: "1px solid #FCD34D" }}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-center hidden sm:inline">
        Ambiente de demonstração — os dados aqui são fictícios e podem ser resetados a qualquer momento.
      </span>
      <span className="text-center sm:hidden">Ambiente de demonstração</span>
      <button
        onClick={handleExit}
        className="ml-2 rounded-full px-3 py-1 text-[12px] font-semibold hover:opacity-90"
        style={{ background: "#78350F", color: "#FEF3C7" }}
      >
        Sair da demo
      </button>
      <button
        onClick={toggle}
        aria-label="Recolher aviso"
        className="ml-1 p-1 rounded hover:bg-black/5"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}