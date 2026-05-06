import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type AddGuestDialogProps = {
  groups: { id: string; name: string }[];
  onAdd: (guest: { name: string; email?: string; phone?: string; guest_type: string; group_id?: string; max_companions?: number }) => void;
};

export default function AddGuestDialog({ groups, onAdd }: AddGuestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestType, setGuestType] = useState("adult");
  const [groupId, setGroupId] = useState<string>("");
  const [maxCompanions, setMaxCompanions] = useState<number>(0);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      guest_type: guestType,
      group_id: groupId || undefined,
      max_companions: maxCompanions,
    });
    setName(""); setEmail(""); setPhone(""); setGroupId(""); setMaxCompanions(0);
    setOpen(false);
  };

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
        <div className="space-y-4">
          <div>
            <Label htmlFor="guest-name">Nome</Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          </div>
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
            <p className="text-xs text-muted-foreground mt-1">0 = só ele(a). Use para casais ou famílias.</p>
          </div>
          <Button onClick={handleSubmit} className="w-full">Adicionar convidado</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
