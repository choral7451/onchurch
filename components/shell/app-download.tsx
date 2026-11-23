"use client";

import { useSyncExternalStore } from "react";

import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-links";

// 온교회 앱 스토어 버튼. 앱 안(WebView)에서는 이미 앱을 쓰는 중이므로 숨긴다.

const subscribe = () => () => {};
const inApp = () => typeof window !== "undefined" && "ReactNativeWebView" in window;

export function AppDownloadLinks() {
  const hidden = useSyncExternalStore(subscribe, inApp, () => false);
  if (hidden) return null;
  return (
    <div className="footer-app">
      <span className="footer-app-label">온교회 앱으로 교회 소식 받기</span>
      <div className="footer-app-links">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="footer-app-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.51zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.56-1.23z" />
          </svg>
          App Store
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="footer-app-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M4.2 2.4c-.25.26-.4.66-.4 1.18v16.84c0 .52.15.92.4 1.18l.07.06 9.43-9.43v-.22L4.27 2.34l-.07.06zM16.84 15.37l-3.14-3.15v-.22l3.14-3.15.07.04 3.73 2.12c1.06.6 1.06 1.6 0 2.2l-3.73 2.12-.07.04zM16.91 15.33 13.7 12.1 4.2 21.6c.35.37.93.42 1.58.05l11.13-6.32M16.91 8.87 5.78 2.55c-.65-.37-1.23-.32-1.58.05l9.5 9.5 3.21-3.23z" />
          </svg>
          Google Play
        </a>
      </div>
    </div>
  );
}
