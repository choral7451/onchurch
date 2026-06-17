export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/everychurch-logo.jpeg" alt="온교회" className="brand-logo" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>온교회</div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.6, marginTop: 2 }}>ONCHURCH BUILDER</div>
          </div>
        </div>
        <div className="landing-footer-meta">
          © {new Date().getFullYear()} 온교회. 교회를 위한 홈페이지 빌더.
        </div>
      </div>
      <div className="landing-footer-biz">
        <div>대표: 임성준 | 사업자등록번호: 329-35-01197</div>
        <div>주소: 서울특별시 방배동 1430</div>
        <div>이메일: <a href="mailto:artinfokorea2022@gmail.com">artinfokorea2022@gmail.com</a></div>
      </div>
    </footer>
  );
}
