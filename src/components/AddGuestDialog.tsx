import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

type AddGuestDialogProps = {
  groups: { id: string; name: string }[];
  onAdd: (guest: {
    name: string; email?: string; phone?: string; guest_type: string;
    group_id?: string; max_companions?: number;
    tipo_convite?: string; pessoas?: string[]; total_pessoas?: number;
  }) => void;
};

export default function AddGuestDialog({ groups, onAdd }: AddGuestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestType, setGuestType] = useState("adult");
  const [groupId, setGroupId] = useState<string>("");
  const [maxCompanions, setMaxCompanions] = useState<number>(0);
  const [tipoConvite, setTipoConvite] = useState<"individual" | "casal" | "familia">("individual");
  const [pessoas, setPessoas] = useState<string[]>([""]);

  const totalPessoas = tipoConvite === "individual"
    ? 1
    : Math.max(1, pessoas.filter((p) => p.trim()).length);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const pessoasFiltradas = tipoConvite === "individual" ? [name.trim()] : pessoas.map((p) => p.trim()).filter(Boolean);
    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      guest_type: guestType,
      group_id: groupId || undefined,
      max_companions: maxCompanions,
      tipo_convite: tipoConvite,
      pessoas: pessoasFiltradas,
      total_pessoas: totalPessoas,
    });
    setName(""); setEmail(""); setPhone(""); setGroupId(""); setMaxCompanions(0);
    setTipoConvite("individual"); setPessoas([""]);
    setOpen(false);
  };

  const updatePessoa = (i: number, v: string) => setPessoas((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  const addPessoa = () => setPessoas((prev) => [...prev, ""]);
  const removePessoa = (i: number) => setPessoas((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Convidado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Convidado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label>Tipo de convite</Label>
            <Select value={tipoConvite} onValueChange={(v) => { setTipoConvite(v as any); if (v !== "individual" && pessoas.length < 2) setPessoas([name || "", ""]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual (1 pessoa)</SelectItem>
                <SelectItem value="casal">Casal (2 pessoas)</SelectItem>
                <SelectItem value="familia">Família (3+ pessoas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="guest-name">{tipoConvite === "individual" ? "Nome" : "Nome do convite (ex.: Família Silva, Carlos e Amora)"}</Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          {tipoConvite !== "individual" && (
            <div>
              <Label>Pessoas incluídas ({totalPessoas})</Label>
              <div className="space-y-2 mt-1">
                {pessoas.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p} onChange={(e) => updatePessoa(i, e.target.value)} placeholder={`Pessoa ${i + 1}`} />
                    {pessoas.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePessoa(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPessoa}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar pessoa
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guest-email">Email</Label>
              <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label htmlFor="guest-phone">Telefone</Label>
              <Input id="guest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
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
            <Label htmlFor="max-comp">Pode levar quantos acompanhantes?</Label>
            <Input id="max-comp" type="number" min={0} max={5} value={maxCompanions} onChange={(e) => setMaxCompanions(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))} />
            <p className="text-xs text-muted-foreground mt-1">Além das {totalPessoas} pessoa(s) do convite.</p>
          </div>
          <Button onClick={handleSubmit} className="w-full">Adicionar convidado</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
