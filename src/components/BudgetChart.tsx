import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

type BudgetChartProps = {
  data: Array<{ name: string; value: number }>;
};

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function BudgetChart({ data }: BudgetChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground">Nenhum dado para exibir</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
