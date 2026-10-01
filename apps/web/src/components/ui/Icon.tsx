import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "agenda"
  | "chevron"
  | "clinic"
  | "commercial"
  | "crm"
  | "dashboard"
  | "finance"
  | "home"
  | "intelligence"
  | "landing"
  | "menu"
  | "patients"
  | "professionals"
  | "reports"
  | "services"
  | "settings"
  | "sites"
  | "user";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  commercial: <><path d="M4 20V8l8-4 8 4v12"/><path d="M8 20v-6h8v6"/><path d="M9 9h.01M15 9h.01"/></>,
  crm: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6"/><path d="M16 8h5M18.5 5.5v5"/></>,
  landing: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8M10 17h4"/></>,
  sites: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/></>,
  clinic: <><path d="M4 21V5h16v16"/><path d="M9 9h6M12 6v6M8 21v-5h8v5"/></>,
  patients: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6 3 0 5 1 6 3"/><path d="m17 14 1.5 1.5L21 13M17 19h4"/></>,
  professionals: <><circle cx="8" cy="8" r="3"/><path d="M2 20c0-4 2-6 6-6 2 0 3.5.5 4.5 1.5"/><rect x="14" y="12" width="7" height="8" rx="1"/><path d="M16 12v-2h3v2"/></>,
  services: <><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></>,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3v3H8z"/></>,
  finance: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M7 3h10"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.8-1L14.3 3h-4.1L9.7 6a7 7 0 0 0-1.8 1L5.5 6 3.4 9.5 5.5 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.5-1a7 7 0 0 0 1.8 1l.4 3h4.1l.4-3a7 7 0 0 0 1.8-1l2.5 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z"/></>,
  intelligence: <><path d="M9 18h6M10 21h4"/><path d="M8 15c-2-1.5-3-3.5-3-6a7 7 0 0 1 14 0c0 2.5-1 4.5-3 6-.7.5-1 1.2-1 2H9c0-.8-.3-1.5-1-2Z"/></>,
  reports: <><path d="M5 21V10M12 21V3M19 21v-7"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>,
};

export default function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["size-5 shrink-0", className].filter(Boolean).join(" ")}
    >
      {paths[name]}
    </svg>
  );
}
