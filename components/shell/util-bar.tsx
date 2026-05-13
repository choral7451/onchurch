"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/api-client";

type Props = {
  tagline: string;
};

export function UtilBar({ tagline }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!getAccessToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("onchurch.")) {
        setAuthed(!!getAccessToken());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="utilbar">
      <div className="utilbar-inner">
        <div className="utilbar-left">
          <span>{tagline}</span>
        </div>
        <div className="utilbar-right">
          {authed === null ? null : authed ? (
            <Link href="/admin">관리자 페이지</Link>
          ) : (
            <a href="https://everychurch.co.kr/login">로그인</a>
          )}
        </div>
      </div>
    </div>
  );
}
