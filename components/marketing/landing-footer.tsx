export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <div className="brand-mark" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>온교회</div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.6, marginTop: 2 }}>ONCHURCH BUILDER</div>
          </div>
        </div>
        <div className="landing-footer-meta">
          © {new Date().getFullYear()} 온교회. 교회를 위한 홈페이지 빌더.
        </div>
      </div>
    </footer>
  );
}
