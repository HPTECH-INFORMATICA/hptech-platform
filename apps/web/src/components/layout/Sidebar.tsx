"use client";

import Link from "next/link";

const menu = [
  { nome: "CRM", rota: "/crm" },
  { nome: "Agenda", rota: "/agenda" },
  { nome: "Financeiro", rota: "/financeiro" },
  { nome: "Landing Pages", rota: "/landing-pages" },
  { nome: "IA", rota: "/ia" },
  { nome: "Relatórios", rota: "/relatorios" },
  { nome: "Configurações", rota: "/configuracoes" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">
        HPTECH
      </h1>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.rota}
            href={item.rota}
            className="block rounded-lg px-4 py-3 hover:bg-slate-800 transition"
          >
            {item.nome}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
