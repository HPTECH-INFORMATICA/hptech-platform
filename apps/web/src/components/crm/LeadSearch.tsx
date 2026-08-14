"use client";

import SearchBox from "@/components/ui/SearchBox";

type LeadSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function LeadSearch({ value, onChange }: LeadSearchProps) {
  return (
    <SearchBox
      label={<span className="sr-only">Buscar leads</span>}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Buscar por nome, contato ou interesse"
      className="flex-1"
    />
  );
}
