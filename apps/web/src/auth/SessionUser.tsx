"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";

import type { CurrentUser } from "./types";

type SessionUserProps = {
  user: CurrentUser;
};

export default function SessionUser({ user }: SessionUserProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setLoggingOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden min-w-0 text-right md:block">
        <p className="max-w-40 truncate text-sm font-semibold text-hp-foreground">
          {user.name}
        </p>
        <p className="max-w-40 truncate text-xs text-hp-muted">
          {user.company.name}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={loggingOut}
        onClick={handleLogout}
      >
        Sair
      </Button>
    </div>
  );
}
