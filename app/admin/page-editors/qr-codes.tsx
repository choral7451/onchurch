"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { churchPublicUrl } from "@/lib/site-host";
import { APP_DOWNLOAD_URL } from "@/lib/app-links";

type QrTarget = {
  key: "home" | "join" | "app";
  title: string;
  desc: string;
  url: string;
  fileBase: string;
};

// 자체 도메인이 연결된 교회는 QR 에 그 주소를 넣는다. 서브도메인 QR 도 308 로 넘어가 계속 유효하다.
function buildTargets(slug: string, customDomain: string | null): QrTarget[] {
  const origin = churchPublicUrl(slug, customDomain);
  return [
    {
      key: "home",
      title: "홈페이지",
      desc: "교회 홈페이지 첫 화면이 열려요",
      url: origin,
      fileBase: `${slug}-homepage-qr`,
    },
    {
      key: "join",
      title: "회원가입",
      desc: "새가족·성도 가입 화면이 바로 열려요",
      url: `${origin}/login?tab=join`,
      fileBase: `${slug}-signup-qr`,
    },
    {
      // 한 QR 로 iPhone 은 App Store, Android 는 Google Play 로 간다 (app/app/page.tsx)
      key: "app",
      title: "앱 다운로드",
      desc: "아이폰·안드로이드 스토어로 바로 가요",
      url: APP_DOWNLOAD_URL,
      fileBase: "onchurch-app-download-qr",
    },
  ];
}

// 관리자 콘솔 — 기본 정보 섹션 하단에 들어가는 홈페이지 / 회원가입 QR 코드 미리보기·다운로드 블록
export function QrCodesBlock({ slug, customDomain }: { slug: string; customDomain: string | null }) {
  const targets = slug ? buildTargets(slug, customDomain) : [];
  return (
    <div className="admin-qr-block">
      <div className="admin-qr-block-head">
        <h3>QR 코드</h3>
        <p>
          {slug
            ? "주보·현수막에 넣어 보세요. 인쇄용은 PNG 또는 SVG로 내려받을 수 있어요."
            : "서브도메인을 입력하고 저장하면 QR 코드가 자동으로 생성됩니다."}
        </p>
      </div>
      {slug ? (
        <div className="admin-qr-grid">
          {targets.map((t) => (
            <QrCard key={t.key} target={t} />
          ))}
        </div>
      ) : (
        <div className="admin-section-banner">
          <span className="admin-section-banner-icon">!</span>
          <span>위 서브도메인을 입력하고 저장하면 QR 코드가 생성됩니다.</span>
        </div>
      )}
    </div>
  );
}

function QrCard({ target }: { target: QrTarget }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(target.url, { margin: 0, width: 240, errorCorrectionLevel: "M" })
      .then((d) => { if (!cancelled) setPreviewUrl(d); })
      .catch(() => { if (!cancelled) setPreviewUrl(""); });
    return () => { cancelled = true; };
  }, [target.url]);

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadPng() {
    setBusy(true);
    try {
      // 인쇄용 고해상도 (여백 포함 약 2000px)
      const png = await QRCode.toDataURL(target.url, { margin: 2, width: 2000, errorCorrectionLevel: "H" });
      triggerDownload(png, `${target.fileBase}.png`);
    } finally {
      setBusy(false);
    }
  }

  async function downloadSvg() {
    setBusy(true);
    try {
      const svg = await QRCode.toString(target.url, { type: "svg", margin: 2, errorCorrectionLevel: "H" });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      triggerDownload(href, `${target.fileBase}.svg`);
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(target.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard 미지원 브라우저 — 무시 */
    }
  }

  return (
    <div className="admin-qr-card">
      <a className="admin-qr-preview" href={target.url} target="_blank" rel="noopener noreferrer" title="새 탭에서 열기">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={`${target.title} QR`} />
        ) : (
          <span className="admin-qr-preview-placeholder">…</span>
        )}
      </a>
      <div className="admin-qr-info">
        <strong className="admin-qr-title">{target.title}</strong>
        <span className="admin-qr-desc">{target.desc}</span>
        <span className="admin-qr-url" title={target.url}>{target.url.replace(/^https?:\/\//, "")}</span>
        <div className="admin-qr-actions">
          <button type="button" className="admin-qr-btn primary" onClick={downloadPng} disabled={busy || !previewUrl}>PNG</button>
          <button type="button" className="admin-qr-btn" onClick={downloadSvg} disabled={busy || !previewUrl}>SVG</button>
          <button type="button" className="admin-qr-btn" onClick={copyUrl}>{copied ? "복사됨 ✓" : "주소 복사"}</button>
        </div>
      </div>
    </div>
  );
}
