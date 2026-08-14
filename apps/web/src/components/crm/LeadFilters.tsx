"use client";

import Select from "@/components/ui/Select";

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
  const options = [
    { value: "", label: "Todas as origens" },
    ...sources.map((source) => ({ value: source, label: source })),
  ];

  return (
    <Select
      label={<span className="sr-only">Filtrar por origem</span>}
      value={selectedSource}
      onChange={(event) => onSourceChange(event.target.value)}
      options={options}
      className="sm:w-52"
    />
  );
}
