import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type AddTaskDialogProps = {
  onAdd: (task: { title: string; category: string; priority: string; due_period: string }) => void;
};

const categories = [
  { value: "planejamento", label: "Planejamento" },
  { value: "orcamento", label: "Orçamento" },
  { value: "convidados", label: "Convidados" },
  { value: "cerimonia", label: "Cerimônia" },
  { value: "recepcao", label: "Recepção" },
  { value: "foto-video", label: "Foto & Vídeo" },
  { value: "musica", label: "Música" },
  { value: "buffet", label: "Buffet" },
  { value: "convites", label: "Convites" },
  { value: "decoracao", label: "Decoração" },
  { value: "trajes", label: "Trajes" },
  { value: "beleza", label: "Beleza" },
  { value: "logistica", label: "Logística" },
  { value: "geral", label: "Geral" },
];

const periods = [
  { value: "10-12 meses", label: "De 10 a 12 meses" },
  { value: "7-9 meses", label: "De 7 a 9 meses" },
  { value: "4-6 meses", label: "De 4 a 6 meses" },
  { value: "2-3 meses", label: "De 2 a 3 meses" },
  { value: "ultimo-mes", label: "Último mês" },
  { value: "ultima-semana", label: "Última semana" },
  { value: "dia-do-casamento", label: "Dia do casamento" },
];

export default function AddTaskDialog({ onAdd }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("geral");
  const [priority, setPriority] = useState("recommended");
  const [duePeriod, setDuePeriod] = useState("4-6 meses");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), category, priority, due_period: duePeriod });
    setTitle("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Criar nova tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Pesquisar fotógrafos" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essencial</SelectItem>
                  <SelectItem value="recommended">Recomendada</SelectItem>
                  <SelectItem value="optional">Opcional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Período</Label>
            <Select value={duePeriod} onValueChange={setDuePeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full">Adicionar tarefa</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
