"use client";

type LeadFiltersProps = {
  sources: string[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
};

export default function LeadFilters({
  sources,
  selectedSource,
  onSourceChange,
}: LeadFiltersProps) {
  return (
    <label className="block">
      <span className="sr-only">Filtrar por origem</span>
      <select
        value={selectedSource}
        onChange={(event) => onSourceChange(event.target.value)}
        className="min-h-11 w-full rounded-[var(--radius-md)] border border-hp-border-strong bg-hp-surface px-4 text-sm text-hp-foreground transition-colors duration-[var(--duration-fast)] hover:border-hp-primary focus:border-hp-primary sm:w-52"
      >
        <option value="">Todas as origens</option>
        {sources.map((source) => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </select>
    </label>
  );
}
