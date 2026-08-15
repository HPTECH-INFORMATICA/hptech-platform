import Card from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: number;
};

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <Card padding="sm">
      <h3 className="text-sm font-medium text-hp-muted">{label}</h3>
      <p className="mt-2 text-3xl font-bold leading-[var(--line-height-heading)] text-hp-foreground">
        {value.toLocaleString("pt-BR")}
      </p>
    </Card>
  );
}
