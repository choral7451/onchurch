import Link from "next/link";
import { Icon } from "@/components/icons";

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <Link href="/" className="brand">
          <div className="brand-mark" />
          <div className="brand-text">
            <div className="brand-name">온교회</div>
            <div className="brand-eng">ONCHURCH BUILDER</div>
          </div>
        </Link>
        <div className="landing-nav-links">
          <a href="/#demo">데모</a>
          <a href="/#features">기능</a>
          <a href="/#pricing">가격</a>
        </div>
        <div className="nav-cta">
          <Link href="/login" className="btn btn-secondary">
            로그인
          </Link>
          <Link href="/login" className="btn btn-primary">
            신청하기 <Icon.arrow style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
