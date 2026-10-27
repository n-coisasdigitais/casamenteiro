import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { REDES, carregarRedes, linkRede, registrarCliqueRede, rotuloRede, type Redes } from "@/lib/redesSociais";
import RedeIcon from "./RedeIcon";

/**
 * Bloco "Redes sociais" do perfil público.
 * Logado: links clicáveis (cada clique é contado para o fornecedor).
 * Sem conta: ícones apagados + convite para entrar. Os links nem chegam ao navegador (RLS).
 */
export default function RedesSociaisPerfil({ supplierId, className = "" }: { supplierId: string; className?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [redes, setRedes] = useState<Redes | null>(null);

  useEffect(() => {
    if (!user) {
      setRedes(null);
      return;
    }
    let vivo = true;
    carregarRedes(supplierId).then((r) => vivo && setRedes(r));
    return () => {
      vivo = false;
    };
  }, [supplierId, user]);

  if (loading) return null;

  const pill =
    "inline-flex h-9 items-center gap-2 rounded-full border border-[#e3dbd2] bg-white px-3 text-[13px] font-semibold text-[#3b3530] transition-colors";

  if (!user) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <p className="mb-2.5 text-sm font-semibold">Redes sociais</p>
        <div className="mb-3 flex flex-wrap gap-2 opacity-50" aria-hidden>
          {(["instagram", "tiktok", "site"] as const).map((r) => (
            <span key={r} className={`${pill} text-[#8a8178]`}>
              <RedeIcon rede={r} />
              <span className="inline-block h-2 w-14 rounded-full bg-[#e8e2da]" />
            </span>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          <Link
            to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Entre ou crie sua conta grátis
          </Link>{" "}
          para ver o Instagram e as redes deste fornecedor.
        </p>
      </div>
    );
  }

  const lista = REDES.filter((r) => redes?.[r.chave]);
  if (!lista.length) return null;

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <p className="mb-2.5 text-sm font-semibold">Redes sociais</p>
      <div className="flex flex-wrap gap-2">
        {lista.map((r) => (
          <a
            key={r.chave}
            href={linkRede(r.chave, redes![r.chave])!}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => registrarCliqueRede(supplierId, r.chave)}
            className={`${pill} hover:border-[#cfc4b8] hover:bg-[#faf7f4]`}
            aria-label={`${r.nome} (abre em nova aba)`}
          >
            <RedeIcon rede={r.chave} className="h-4 w-4 text-[#5e564e]" />
            <span className="max-w-[160px] truncate">{rotuloRede(r.chave, redes![r.chave])}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
