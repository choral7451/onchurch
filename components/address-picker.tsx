"use client";

import { useState } from "react";
import { KakaoMap } from "@/components/kakao-map";

type DaumPostcodeData = {
  roadAddress?: string;
  jibunAddress?: string;
  zonecode?: string;
  buildingName?: string;
};

type DaumPostcode = new (config: { oncomplete: (data: DaumPostcodeData) => void }) => {
  open: () => void;
};

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcode };
  }
}

const SDK_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let sdkPromise: Promise<void> | null = null;

function loadPostcodeSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-daum-postcode='1']");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("postcode sdk load error")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.dataset.daumPostcode = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("postcode sdk load error"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  required?: boolean;
  churchName?: string;
  showPreview?: boolean;
};

export function AddressPicker({
  id,
  value,
  onChange,
  placeholder,
  required,
  churchName,
  showPreview = true,
}: Props) {
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState("");

  async function openSearch() {
    setOpening(true);
    setErr("");
    try {
      await loadPostcodeSdk();
      const Postcode = window.daum?.Postcode;
      if (!Postcode) throw new Error("postcode unavailable");
      new Postcode({
        oncomplete: (data) => {
          const road = (data.roadAddress ?? "").trim();
          const jibun = (data.jibunAddress ?? "").trim();
          const building = (data.buildingName ?? "").trim();
          const base = road || jibun;
          onChange(building ? `${base} (${building})` : base);
        },
      }).open();
    } catch {
      setErr("주소 검색을 불러오지 못했습니다.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={openSearch}
          disabled={opening}
          style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {opening ? "불러오는 중..." : "주소 검색"}
        </button>
      </div>
      {err && <div className="phone-msg phone-msg-error" style={{ fontSize: 12 }}>{err}</div>}
      {showPreview && value.trim() && (
        <div style={{ borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
          <KakaoMap address={value} name={churchName || "교회"} />
        </div>
      )}
    </div>
  );
}
