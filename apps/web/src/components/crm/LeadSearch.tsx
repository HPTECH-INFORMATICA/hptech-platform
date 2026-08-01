"use client";

type LeadSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function LeadSearch({ value, onChange }: LeadSearchProps) {
  return (
    <label className="block flex-1">
      <span className="sr-only">Buscar leads</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nome, contato ou interesse"
        className="min-h-11 w-full rounded-[var(--radius-md)] border border-hp-border-strong bg-hp-surface px-4 text-sm text-hp-foreground transition-colors duration-[var(--duration-fast)] placeholder:text-hp-subtle hover:border-hp-primary focus:border-hp-primary"
      />
    </label>
  );
}
