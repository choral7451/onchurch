import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Rings } from "@/components/decorative";
import { SignupForm } from "./form";

export const metadata: Metadata = {
  title: "우리 교회 홈페이지 신청 — 온교회",
  description: "교회 홈페이지를 신청하고 5분 안에 발급받으세요.",
};

export default function SignupPage() {
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
            <div className="auth-eyebrow">SIGN UP</div>
            <h1 className="auth-title">우리 교회 홈페이지<br />신청하기</h1>
            <p className="auth-sub">기본 정보 입력 후 14일 무료 체험이 시작됩니다.</p>

            <SignupForm />

            <div className="auth-divider"><span>이미 계정이 있으신가요?</span></div>

            <Link href="/login" className="btn btn-secondary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
              로그인으로 돌아가기
            </Link>
          </div>

          <div className="auth-meta">
            <span>도움이 필요하세요? <a href="mailto:hello@everychurch.co.kr">hello@everychurch.co.kr</a></span>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
