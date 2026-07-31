import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buscarNomeIndicador, captureReferralCode, incrementReferralClick } from "@/lib/referral";

export default function CapturarIndicacao() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (codigo) {
        const nome = await buscarNomeIndicador(codigo).catch(() => null);
        captureReferralCode(codigo, nome);
        await incrementReferralClick(codigo).catch(() => null);
      }
      navigate("/cadastro?ref=" + encodeURIComponent(codigo ?? ""), { replace: true });
    })();
  }, [codigo, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando…</p>
    </div>
  );
}