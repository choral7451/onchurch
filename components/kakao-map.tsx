"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

type KakaoLatLng = { getLat: () => number; getLng: () => number };
type KakaoMapInstance = {
  setCenter: (latlng: KakaoLatLng) => void;
  addControl: (control: unknown, position: unknown) => void;
};
type KakaoMarker = unknown;
type KakaoInfoWindow = { open: (map: KakaoMapInstance, marker: KakaoMarker) => void };

type KakaoNamespace = {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
    Marker: new (options: { position: KakaoLatLng; map: KakaoMapInstance }) => KakaoMarker;
    InfoWindow: new (options: { content: string; removable?: boolean }) => KakaoInfoWindow;
    ZoomControl: new () => unknown;
    MapTypeControl: new () => unknown;
    ControlPosition: { RIGHT: unknown; TOPRIGHT: unknown };
    services: {
      Geocoder: new () => {
        addressSearch: (
          address: string,
          cb: (result: Array<{ x: string; y: string }>, status: string) => void,
        ) => void;
      };
      Status: { OK: string };
    };
  };
};

const SDK_BASE = "https://dapi.kakao.com/v2/maps/sdk.js";
let sdkPromise: Promise<KakaoNamespace> | null = null;

function loadKakaoSdk(appKey: string): Promise<KakaoNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<KakaoNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-kakao-sdk='1']");
    const onReady = () => {
      const k = window.kakao;
      if (!k) return reject(new Error("kakao namespace missing"));
      k.maps.load(() => resolve(k));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("kakao sdk load error")));
      return;
    }
    const script = document.createElement("script");
    script.src = `${SDK_BASE}?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.async = true;
    script.dataset.kakaoSdk = "1";
    script.onload = onReady;
    script.onerror = () => reject(new Error("kakao sdk load error"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type Status = "loading" | "ready" | "no-key" | "no-address" | "geocode-failed" | "error";

export function KakaoMap({ address, name }: { address: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) { setStatus("no-key"); return; }
    if (!address.trim()) { setStatus("no-address"); return; }

    let cancelled = false;
    setStatus("loading");

    loadKakaoSdk(key)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result, geoStatus) => {
          if (cancelled || !containerRef.current) return;
          if (geoStatus !== kakao.maps.services.Status.OK || !result?.length) {
            setStatus("geocode-failed");
            return;
          }
          const lat = parseFloat(result[0].y);
          const lng = parseFloat(result[0].x);
          const coords = new kakao.maps.LatLng(lat, lng);

          const map = new kakao.maps.Map(containerRef.current, { center: coords, level: 4 });
          const marker = new kakao.maps.Marker({ position: coords, map });
          const info = new kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;white-space:nowrap;">${escapeHtml(name)}</div>`,
            removable: false,
          });
          info.open(map, marker);

          map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
          map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);

          setStatus("ready");
        });
      })
      .catch(() => {
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
