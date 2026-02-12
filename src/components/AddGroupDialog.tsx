import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

type AddGroupDialogProps = {
  onAdd: (name: string) => void;
};

export default function AddGroupDialog({ onAdd }: AddGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">Nome do grupo</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Família da Noiva" />
          </div>
          <Button onClick={handleSubmit} className="w-full">Criar grupo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
