"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap } from "@/components/google-map";
import { loadGoogleSdk } from "@/components/google-maps-loader";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  churchName?: string;
  showPreview?: boolean;
};

export function AddressPicker({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  churchName,
  showPreview = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [err, setErr] = useState("");

  // Google Places Autocomplete — 미국·한국 등 전 세계 주소를 입력하면 후보가 뜬다.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) { setErr("주소 검색 키가 설정되지 않았습니다."); return; }

    let cancelled = false;
    loadGoogleSdk(key)
      .then((google) => {
        if (cancelled || !inputRef.current) return;
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const addr = (place.formatted_address ?? place.name ?? "").trim();
          if (addr) onChangeRef.current(addr);
        });
      })
      .catch(() => {
        if (!cancelled) setErr("주소 검색을 불러오지 못했습니다.");
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        // 자동완성 후보에서 Enter 선택 시 폼이 제출되지 않도록 막는다.
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {err && <div className="phone-msg phone-msg-error" style={{ fontSize: 12 }}>{err}</div>}
      {showPreview && value.trim() && (
        <div style={{ borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
          <GoogleMap address={value} name={churchName || "교회"} />
        </div>
      )}
    </div>
  );
}
