"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleSdk } from "@/components/google-maps-loader";

type Status = "loading" | "ready" | "no-key" | "no-address" | "geocode-failed" | "error";

export function GoogleMap({ address, name }: { address: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) { setStatus("no-key"); return; }
    if (!address.trim()) { setStatus("no-address"); return; }

    let cancelled = false;
    setStatus("loading");

    loadGoogleSdk(key)
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address, region: "KR" }, (results, geoStatus) => {
          if (cancelled || !containerRef.current) return;
          if (geoStatus !== "OK" || !results?.length) {
            console.error("[GoogleMap] geocode failed", { geoStatus, address });
            setStatus("geocode-failed");
            return;
          }
          const location = results[0].geometry.location;
          const map = new google.maps.Map(containerRef.current, {
            center: location,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          new google.maps.Marker({
            position: location,
            map,
            title: name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            animation: google.maps.Animation.DROP,
          });

          setStatus("ready");
        });
      })
      .catch((err) => {
        console.error("[GoogleMap] SDK load/auth failed", err, { host: window.location.host });
        if (!cancelled) setStatus("error");
      });

    return () => { cancelled = true; };
  }, [address, name]);

  const fallbackMessage =
    status === "no-key" ? "지도 키가 설정되지 않았습니다."
    : status === "no-address" ? "교회 주소가 등록되지 않았습니다."
    : status === "geocode-failed" ? "주소로 위치를 찾지 못했습니다. 주소를 다시 확인해 주세요."
    : status === "error" ? "지도를 불러오지 못했습니다."
    : null;

  return (
    <div className="map-placeholder">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
          지도를 불러오는 중...
        </div>
      )}
      {fallbackMessage && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted)", fontSize: 13, padding: 24, textAlign: "center" }}>
          <strong style={{ color: "var(--ink)", fontSize: 14 }}>{name}</strong>
          {address && <span style={{ fontSize: 12 }}>{address}</span>}
          <span>{fallbackMessage}</span>
        </div>
      )}
    </div>
  );
}

