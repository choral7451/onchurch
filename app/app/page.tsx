import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "온교회 앱 다운로드",
  description: "교회 소식과 알림을 온교회 앱으로 받아 보세요.",
};

// 앱 다운로드 QR 이 가리키는 주소. 휴대폰 종류를 보고 바로 스토어로 보낸다.
// (iPadOS 는 PC 처럼 보여 판별되지 않으므로 아래 두 버튼 화면이 나온다)
export default async function AppDownloadPage() {
  const ua = (await headers()).get("user-agent") ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) redirect(APP_STORE_URL);
  if (/Android/i.test(ua)) redirect(PLAY_STORE_URL);

  return (
    <main className="app-dl">
      <div className="app-dl-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/everychurch-logo.jpeg" alt="" className="app-dl-logo" />
        <h1>온교회 앱 다운로드</h1>
        <p>교회 소식과 새 글 알림을 앱으로 받아 보세요.</p>
        <div className="app-dl-links">
          <a href={APP_STORE_URL} className="btn btn-primary">App Store</a>
          <a href={PLAY_STORE_URL} className="btn btn-secondary">Google Play</a>
        </div>
      </div>
    </main>
  );
}
