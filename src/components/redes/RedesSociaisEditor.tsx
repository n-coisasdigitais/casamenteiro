import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { carregarRedes, salvarRedes, type Redes } from "@/lib/redesSociais";
import RedesSociaisCampos from "./RedesSociaisCampos";

/** Card do painel do fornecedor para editar as redes sociais. */
export default function RedesSociaisEditor({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [redes, setRedes] = useState<Redes>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarRedes(supplierId).then((r) => setRedes(r || {}));
  }, [supplierId]);

  const salvar = async () => {
    setSalvando(true);
    const { error } = await salvarRedes(supplierId, redes);
    setSalvando(false);
    if (error) toast({ title: "Não foi possível salvar", description: traduzirErro(error), variant: "destructive" });
    else toast({ title: "Redes sociais salvas" });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Redes sociais</CardTitle>
        <p className="text-sm text-muted-foreground">
          Digite só o @ ou o nome. Os links aparecem no seu perfil para casais com conta no Casamenteiro, e você vê no painel quantos
          abriram.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RedesSociaisCampos value={redes} onChange={setRedes} />
        <Button onClick={salvar} disabled={salvando} className="w-full">
          {salvando ? "Salvando..." : "Salvar redes sociais"}
        </Button>
      </CardContent>
    </Card>
  );
}
