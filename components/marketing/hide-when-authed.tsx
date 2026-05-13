"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";

export function HideWhenAuthed({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!getAccessToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("onchurch.")) setAuthed(!!getAccessToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (authed) return null;
  return <>{children}</>;
}
