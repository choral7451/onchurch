"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    naver?: NaverNamespace;
  }
}

type NaverLatLng = { lat: () => number; lng: () => number };
type NaverMapInstance = unknown;
type NaverMarker = unknown;
type NaverInfoWindow = { open: (map: NaverMapInstance, anchor: NaverMarker) => void };

type GeocodeAddress = { x: string; y: string; roadAddress?: string; jibunAddress?: string };
type GeocodeResponse = { v2: { addresses: GeocodeAddress[] } };

type NaverNamespace = {
  maps: {
    Map: new (container: HTMLElement, options: { center: NaverLatLng; zoom: number }) => NaverMapInstance;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    Marker: new (options: { position: NaverLatLng; map: NaverMapInstance }) => NaverMarker;
    InfoWindow: new (options: { content: string }) => NaverInfoWindow;
    Service: {
      geocode: (opt: { query: string }, cb: (status: string, response: GeocodeResponse) => void) => void;
      Status: { OK: string; ERROR: string };
    };
  };
};

const SDK_BASE = "https://oapi.map.naver.com/openapi/v3/maps.js";
let sdkPromise: Promise<NaverNamespace> | null = null;

function loadNaverSdk(clientId: string): Promise<NaverNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.naver?.maps?.Service) return Promise.resolve(window.naver);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<NaverNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-naver-sdk='1']");
    const onReady = () => {
      const n = window.naver;
      if (!n?.maps?.Service) return reject(new Error("naver maps namespace missing"));
      resolve(n);
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("naver sdk load error")));
      return;
    }
    // NCP 신규 콘솔(console.ncloud.com)에서 발급한 키는 `ncpKeyId` 파라미터를 사용.
    // SDK 가 두 파라미터를 받으면 ncpKeyId 우선시하므로, 키 출처와 일치하는 한쪽만 전송.
    const params = new URLSearchParams({
      ncpKeyId: clientId,
      submodules: "geocoder",
    });
    const script = document.createElement("script");
    script.src = `${SDK_BASE}?${params.toString()}`;
    script.async = true;
    script.dataset.naverSdk = "1";
    script.onload = onReady;
    script.onerror = () => reject(new Error("naver sdk load error"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type Status = "loading" | "ready" | "no-key" | "no-address" | "geocode-failed" | "error";

export function NaverMap({ address, name }: { address: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!key) { setStatus("no-key"); return; }
    if (!address.trim()) { setStatus("no-address"); return; }

    let cancelled = false;
    setStatus("loading");

    loadNaverSdk(key)
      .then((naver) => {
        if (cancelled || !containerRef.current) return;
        naver.maps.Service.geocode({ query: address }, (geoStatus, response) => {
          if (cancelled || !containerRef.current) return;
          if (geoStatus !== naver.maps.Service.Status.OK || !response?.v2?.addresses?.length) {
            setStatus("geocode-failed");
            return;
          }
          const first = response.v2.addresses[0];
          const lat = parseFloat(first.y);
          const lng = parseFloat(first.x);
          const center = new naver.maps.LatLng(lat, lng);

          const map = new naver.maps.Map(containerRef.current, { center, zoom: 16 });
          const marker = new naver.maps.Marker({ position: center, map });
          const info = new naver.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;white-space:nowrap;">${escapeHtml(name)}</div>`,
          });
          info.open(map, marker);

          setStatus("ready");
        });
      })
      .catch(() => { if (!cancelled) setStatus("error"); });

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
