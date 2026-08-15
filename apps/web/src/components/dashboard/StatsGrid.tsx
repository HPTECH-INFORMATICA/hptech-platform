import StatCard from "./StatCard";

export type DashboardStat = {
  label: string;
  value: number;
};

type StatsGridProps = {
  stats: readonly DashboardStat[];
};

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
