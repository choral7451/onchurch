"use client";

import { useEffect, useRef, useState } from "react";

type GoogleLatLng = { lat: () => number; lng: () => number };
type GoogleMapInstance = unknown;
type GoogleMarker = unknown;
type GoogleInfoWindow = { open: (opts: { map: GoogleMapInstance; anchor: GoogleMarker }) => void };

type GeocodeResult = { geometry: { location: GoogleLatLng } };

type GoogleNamespace = {
  maps: {
    Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: { position: GoogleLatLng; map: GoogleMapInstance; title?: string }) => GoogleMarker;
    InfoWindow: new (options: { content: string }) => GoogleInfoWindow;
    Geocoder: new () => {
      geocode: (
        opt: { address: string; region?: string },
        cb: (results: GeocodeResult[] | null, status: string) => void,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleNamespace;
  }
}

const SDK_BASE = "https://maps.googleapis.com/maps/api/js";
let sdkPromise: Promise<GoogleNamespace> | null = null;

function loadGoogleSdk(apiKey: string): Promise<GoogleNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<GoogleNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-sdk='1']");
    const onReady = () => {
      const g = window.google;
      if (!g?.maps) return reject(new Error("google maps namespace missing"));
      resolve(g);
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("google sdk load error")));
      return;
    }
    // `loading=async` 모드는 Geocoder 등을 importLibrary() 로 받아야 하는 새 패턴이라
    // 즉시 `new google.maps.Geocoder()` 호출이 실패함. 동기 부트스트랩으로 고정.
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      language: "ko",
      region: "KR",
    });
    const script = document.createElement("script");
    script.src = `${SDK_BASE}?${params.toString()}`;
    script.async = true;
    script.dataset.googleSdk = "1";
    script.onload = onReady;
    script.onerror = () => reject(new Error("google sdk load error"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

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
          const marker = new google.maps.Marker({
            position: location,
            map,
            title: name,
          });
          const info = new google.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;font-weight:600;white-space:nowrap;">${escapeHtml(name)}</div>`,
          });
          info.open({ map, anchor: marker });

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
