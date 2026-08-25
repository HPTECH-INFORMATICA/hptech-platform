export const adminTabs = ["visao-geral", "empresa", "usuarios", "acessos", "auditoria"] as const;

export type AdminTab = (typeof adminTabs)[number];

export function parseAdminTab(
  value: string | string[] | undefined,
): AdminTab | null {
  if (typeof value !== "string") {
    return value === undefined ? "visao-geral" : null;
  }

  return adminTabs.includes(value as AdminTab) ? (value as AdminTab) : null;
}
