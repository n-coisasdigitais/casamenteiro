import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { PessoaConvite, normalizarPessoas, resumoPessoas } from "@/lib/guestPeople";

export type EditableGuest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  guest_type: string;
  group_id: string | null;
  max_companions?: number | null;
  tipo_convite?: string | null;
  pessoas?: unknown;
  notes?: string | null;
};

export default function EditGuestDialog({
  guest, groups, open, onOpenChange, onSave,
}: {
  guest: EditableGuest | null;
  groups: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (id: string, values: Record<string, any>) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestType, setGuestType] = useState("adult");
  const [groupId, setGroupId] = useState("none");
  const [maxCompanions, setMaxCompanions] = useState(0);
  const [tipoConvite, setTipoConvite] = useState<"individual" | "casal" | "familia">("individual");
  const [pessoas, setPessoas] = useState<PessoaConvite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !guest) return;
    setName(guest.name ?? "");
    setEmail(guest.email ?? "");
    setPhone(guest.phone ?? "");
    setGuestType(guest.guest_type || "adult");
    setGroupId(guest.group_id ?? "none");
    setMaxCompanions(guest.max_companions ?? 0);
    setTipoConvite((guest.tipo_convite as any) || "individual");
    const p = normalizarPessoas(guest.pessoas);
    setPessoas(p.length ? p : [{ nome: guest.name ?? "", tipo: (guest.guest_type as any) || "adult" }]);
  }, [open, guest]);

  const updatePessoa = (i: number, patch: Partial<PessoaConvite>) =>
    setPessoas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const totalPessoas = tipoConvite === "individual" ? 1 : Math.max(1, pessoas.filter((p) => p.nome.trim()).length);

  const salvar = async () => {
    if (!guest || !name.trim()) return;
    setSaving(true);
    const pessoasFinal: PessoaConvite[] =
      tipoConvite === "individual"
        ? [{ nome: name.trim(), tipo: guestType as PessoaConvite["tipo"] }]
        : pessoas.map((p) => ({ ...p, nome: p.nome.trim() })).filter((p) => p.nome);
    await onSave(guest.id, {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      guest_type: guestType,
      group_id: groupId === "none" ? null : groupId,
      max_companions: maxCompanions,
      tipo_convite: tipoConvite,
      pessoas: pessoasFinal,
      total_pessoas: totalPessoas,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar convidado</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label>Tipo de convite</Label>
            <Select value={tipoConvite} onValueChange={(v) => setTipoConvite(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual (1 pessoa)</SelectItem>
                <SelectItem value="casal">Casal (2 pessoas)</SelectItem>
                <SelectItem value="familia">Família (3+ pessoas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-guest-name">{tipoConvite === "individual" ? "Nome" : "Nome do convite"}</Label>
            <Input id="edit-guest-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {tipoConvite !== "individual" && (
            <div>
              <Label>Pessoas incluídas ({totalPessoas})</Label>
              <div className="space-y-2 mt-1">
                {pessoas.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p.nome} onChange={(e) => updatePessoa(i, { nome: e.target.value })} placeholder={`Pessoa ${i + 1}`} />
                    <Select value={p.tipo} onValueChange={(v) => updatePessoa(i, { tipo: v as PessoaConvite["tipo"] })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adulto</SelectItem>
                        <SelectItem value="child">Criança</SelectItem>
                        <SelectItem value="baby">Bebê</SelectItem>
                      </SelectContent>
                    </Select>
                    {pessoas.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPessoas((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setPessoas((prev) => [...prev, { nome: "", tipo: "adult" }])}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar pessoa
                </Button>
                {resumoPessoas(pessoas.filter((p) => p.nome.trim())) && (
                  <p className="text-xs text-muted-foreground">{resumoPessoas(pessoas.filter((p) => p.nome.trim()))}</p>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-guest-email">Email</Label>
              <Input id="edit-guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-guest-phone">Telefone</Label>
              <Input id="edit-guest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={guestType} onValueChange={setGuestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adulto</SelectItem>
                  <SelectItem value="child">Criança</SelectItem>
                  <SelectItem value="baby">Bebê</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grupo</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-max-comp">Pode levar quantos acompanhantes?</Label>
            <Input id="edit-max-comp" type="number" min={0} max={5} value={maxCompanions}
              onChange={(e) => setMaxCompanions(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))} />
          </div>
          <Button onClick={salvar} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}