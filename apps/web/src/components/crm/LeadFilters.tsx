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
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-52"
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
