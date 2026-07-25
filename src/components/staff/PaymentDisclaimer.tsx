import { Info } from "lucide-react";

export default function PaymentDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 ${className}`}>
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <p>
        O pagamento é combinado e feito diretamente entre vocês; a plataforma apenas
        registra o valor.
      </p>
    </div>
  );
}