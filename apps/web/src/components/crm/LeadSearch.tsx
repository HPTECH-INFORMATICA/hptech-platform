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
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
