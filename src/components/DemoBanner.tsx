import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

export default function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isDemo) return null;

  const handleExit = async () => {
    await signOut();
    navigate("/demo", { replace: true });
  };

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] text-[13px] font-medium flex items-center justify-center gap-3 py-2 px-3"
      style={{ background: "#FEF3C7", color: "#78350F", borderBottom: "1px solid #FCD34D" }}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-center">
        Ambiente de demonstração — os dados aqui são fictícios e podem ser resetados a qualquer momento.
      </span>
      <button
        onClick={handleExit}
        className="ml-2 rounded-full px-3 py-1 text-[12px] font-semibold hover:opacity-90"
        style={{ background: "#78350F", color: "#FEF3C7" }}
      >
        Sair da demo
      </button>
    </div>
  );
}