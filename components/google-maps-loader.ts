// Google Maps JS SDK 로더 — 지도(GoogleMap)와 주소 자동완성(AddressPicker)이 공유한다.
// 같은 script 태그를 공유하므로 places 라이브러리를 항상 포함해 로드한다.

type GoogleLatLng = { lat: () => number; lng: () => number };
export type GoogleMapInstance = unknown;
export type GoogleMarker = unknown;

export type GeocodeResult = { geometry: { location: GoogleLatLng } };

export type GooglePoint = { x: number; y: number };

export type MarkerIconSymbol = {
  path: number | string;
  scale: number;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
  anchor?: GooglePoint;
};

export type PlaceResult = {
  formatted_address?: string;
  name?: string;
  geometry?: { location: GoogleLatLng };
};

type PlacesAutocomplete = {
  addListener: (event: string, cb: () => void) => void;
  getPlace: () => PlaceResult;
};

export type GoogleNamespace = {
  maps: {
    Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: {
      position: GoogleLatLng;
      map: GoogleMapInstance;
      title?: string;
      icon?: MarkerIconSymbol;
      animation?: number;
    }) => GoogleMarker;
    SymbolPath: { CIRCLE: number };
    Animation: { DROP: number };
    Point: new (x: number, y: number) => GooglePoint;
    Geocoder: new () => {
      geocode: (
        opt: { address: string; region?: string },
        cb: (results: GeocodeResult[] | null, status: string) => void,
      ) => void;
    };
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts?: { fields?: string[]; types?: string[] },
      ) => PlacesAutocomplete;
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

export function loadGoogleSdk(apiKey: string): Promise<GoogleNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<GoogleNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-sdk='1']");
    const onReady = () => {
      const g = window.google;
      if (!g?.maps?.places) return reject(new Error("google maps namespace missing"));
      resolve(g);
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("google sdk load error")));
      return;
    }
    // `loading=async` 모드는 Geocoder 등을 importLibrary() 로 받아야 하는 새 패턴이라
    // 즉시 `new google.maps.Geocoder()` 호출이 실패함. 동기 부트스트랩으로 고정.
    // places 라이브러리는 주소 자동완성(미국·한국 등 전 세계)에 사용한다.
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "places",
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
