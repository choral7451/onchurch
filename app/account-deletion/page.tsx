import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "계정 삭제 안내 — 온교회",
  description: "온교회 앱·교회 홈페이지 계정과 개인정보를 삭제하는 방법입니다.",
  alternates: { canonical: "https://everychurch.co.kr/account-deletion" },
};

// 앱 스토어(Google Play·App Store)가 요구하는 계정 삭제 안내 페이지 — 로그인 없이 누구나 볼 수 있어야 한다.
export default function AccountDeletionPage() {
  return (
    <div className="landing">
      <LandingNav />

      <main className="legal-main">
        <div className="legal-doc">
          <h1 className="legal-title">온교회 계정 삭제 안내</h1>

          <section className="legal-section">
            <p>온교회 앱 또는 교회 홈페이지에서 만든 계정은 언제든지 직접 삭제(회원 탈퇴)할 수 있습니다.</p>
          </section>

          <section className="legal-section">
            <h2>삭제 방법</h2>
            <ol>
              <li>온교회 앱 또는 다니시는 교회의 홈페이지에 로그인합니다.</li>
              <li>메뉴에서 마이페이지로 들어갑니다.</li>
              <li>맨 아래 회원 탈퇴에서 비밀번호를 확인하고 탈퇴하기를 누릅니다.</li>
            </ol>
            <p>로그인할 수 없는 경우에는 <a href="http://pf.kakao.com/_slJXX/chat" target="_blank" rel="noopener noreferrer">카카오톡 채널</a>로 아이디와 가입 연락처를 알려주시면 본인 확인 후 삭제해 드립니다.</p>
          </section>

          <section className="legal-section">
            <h2>삭제되는 정보</h2>
            <ul>
              <li>아이디, 이름, 연락처, 비밀번호, 로그인 기록은 탈퇴 즉시 삭제됩니다.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>남는 정보</h2>
            <ul>
              <li>교제 게시판에 작성한 글·사진·댓글은 삭제되지 않고 작성자 이름이 “탈퇴한 회원”으로 바뀝니다. 지우려면 탈퇴 전에 직접 삭제해 주세요.</li>
              <li>관련 법령에 따라 보관해야 하는 정보는 <Link href="/privacy">개인정보 처리방침</Link>에서 정한 기간 동안 보관한 뒤 파기합니다.</li>
            </ul>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
