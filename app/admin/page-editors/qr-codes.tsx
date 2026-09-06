"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const ROOT_DOMAIN = "everychurch.co.kr";

type QrTarget = {
  key: "home" | "join";
  eyebrow: string;
  title: string;
  desc: string;
  url: string;
  fileBase: string;
};

function buildTargets(slug: string): QrTarget[] {
  const origin = `https://${slug}.${ROOT_DOMAIN}`;
  return [
    {
      key: "home",
      eyebrow: "HOMEPAGE",
      title: "홈페이지 QR",
      desc: "스캔하면 교회 홈페이지 첫 화면으로 이동합니다. 주보·현수막·안내문에 넣어 활용하세요.",
      url: origin,
      fileBase: `${slug}-homepage-qr`,
    },
    {
      key: "join",
      eyebrow: "SIGN UP",
      title: "회원가입 QR",
      desc: "스캔하면 홈페이지 회원가입 화면이 바로 열립니다. 새가족 등록·성도 가입 안내에 활용하세요.",
      url: `${origin}/login?tab=join`,
      fileBase: `${slug}-signup-qr`,
    },
  ];
}

// 관리자 콘솔 — 홈페이지 / 회원가입 QR 코드 미리보기·다운로드
export function QrCodesEditor({ slug }: { slug: string }) {
  if (!slug) {
    return (
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">QR CODE</div>
          <h2>QR 코드</h2>
          <p>QR 코드를 만들려면 먼저 사이트 주소(영문 주소)를 저장해주세요.</p>
        </div>
        <div className="admin-section-body">
          <div className="admin-section-banner">
            <span className="admin-section-banner-icon">!</span>
            <span>필수 설정 → 사이트 정보에서 사이트 주소를 입력하고 저장하면 QR 코드가 생성됩니다.</span>
          </div>
        </div>
      </section>
    );
  }

  const targets = buildTargets(slug);
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">QR CODE</div>
        <h2>QR 코드</h2>
        <p>홈페이지와 회원가입 페이지로 연결되는 QR 코드입니다. 인쇄용은 PNG 또는 SVG로 내려받으세요.</p>
      </div>
      <div className="admin-section-body">
        <div className="admin-qr-grid">
          {targets.map((t) => (
            <QrCard key={t.key} target={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QrCard({ target }: { target: QrTarget }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(target.url, { margin: 1, width: 480, errorCorrectionLevel: "M" })
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
      <div className="admin-qr-card-head">
        <div className="admin-section-eyebrow">{target.eyebrow}</div>
        <h3>{target.title}</h3>
        <p>{target.desc}</p>
      </div>
      <div className="admin-qr-preview">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={`${target.title} 미리보기`} />
        ) : (
          <div className="admin-qr-preview-placeholder">생성 중…</div>
        )}
      </div>
      <a className="admin-qr-url" href={target.url} target="_blank" rel="noopener noreferrer">
        {target.url}
      </a>
      <div className="admin-qr-actions">
        <button type="button" className="btn btn-primary" onClick={downloadPng} disabled={busy || !previewUrl}>
          PNG 다운로드
        </button>
        <button type="button" className="btn btn-secondary" onClick={downloadSvg} disabled={busy || !previewUrl}>
          SVG 다운로드
        </button>
        <button type="button" className="btn btn-secondary" onClick={copyUrl}>
          {copied ? "복사됨 ✓" : "주소 복사"}
        </button>
      </div>
    </div>
  );
}
