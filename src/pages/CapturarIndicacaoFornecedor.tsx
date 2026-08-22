import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { guardarIndicacaoFornecedor, registrarCliqueIndicacaoFornecedor } from "@/lib/beneficios";

/** Captura o código de indicação de fornecedor e leva para a landing de cadastro. */
export default function CapturarIndicacaoFornecedor() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (codigo) {
        guardarIndicacaoFornecedor(codigo);
        await registrarCliqueIndicacaoFornecedor(codigo).catch(() => null);
      }
      navigate("/fornecedor?indicacao=" + encodeURIComponent(codigo ?? ""), { replace: true });
    })();
  }, [codigo, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando…</p>
    </div>
  );
}
