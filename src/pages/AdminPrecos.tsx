import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPlanos from "./AdminPlanos";
import AdminPlatformPrices from "./AdminPlatformPrices";

/**
 * Tela única de preços da plataforma: assinaturas e destaques (AdminPlanos)
 * e taxas/comissões (AdminPlatformPrices), unificando as rotas antigas
 * /admin/planos e /admin/tabela-precos.
 */
export default function AdminPrecos() {
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") === "taxas" ? "taxas" : "assinaturas";

  return (
    <div className="space-y-4">
      <Tabs
        value={aba}
        onValueChange={(v) => setParams(v === "taxas" ? { aba: "taxas" } : {}, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="assinaturas">Assinaturas e destaques</TabsTrigger>
          <TabsTrigger value="taxas">Taxas da plataforma</TabsTrigger>
        </TabsList>
        <TabsContent value="assinaturas" className="mt-4">
          <AdminPlanos />
        </TabsContent>
        <TabsContent value="taxas" className="mt-4">
          <AdminPlatformPrices />
        </TabsContent>
      </Tabs>
    </div>
  );
}
