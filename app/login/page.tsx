import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Rings } from "@/components/decorative";
import { LoginForm } from "./form";

export const metadata: Metadata = {
  title: "로그인 — 온교회",
  description: "온교회 관리자 로그인",
};

export default function LoginPage() {
  return (
    <div className="landing">
      <LandingNav />

      <main className="auth-main">
        <Rings
          className="auth-bg-rings"
          style={{ width: 720, height: 720, top: -200, left: "50%", transform: "translateX(-50%)", color: "var(--accent)" }}
        />
        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-eyebrow">관리자 로그인</div>
            <h1 className="auth-title">우리 교회 사이트로<br />돌아오신 것을 환영합니다</h1>
            <p className="auth-sub">발급받으신 아이디와 비밀번호로 로그인해주세요.</p>

            <LoginForm />

            <div className="auth-divider"><span>처음이신가요?</span></div>

            <Link href="/signup" className="btn btn-secondary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
              우리 교회 홈페이지 신청하기
            </Link>
          </div>

          <div className="auth-meta">
            <span>도움이 필요하세요? <a href="mailto:hello@onchurch.kr">hello@onchurch.kr</a></span>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
