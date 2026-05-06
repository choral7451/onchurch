import Link from "next/link";
import { listTenants } from "@/lib/tenants";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Icon, type IconKey } from "@/components/icons";
import { LightRays, Mesh, Rings } from "@/components/decorative";

const FEATURES: { ic: IconKey; title: string; desc: string }[] = [
  { ic: "calendar", title: "교회 전용 컴포넌트", desc: "예배 안내, 설교 아카이브, 주보, 공지, 기도 요청, 갤러리, 통독 플랜 — 처음부터 교회를 위해 만들어졌습니다." },
  { ic: "image", title: "우리 교회의 색", desc: "OKLCH 기반 색 토큰과 4가지 프리셋(네이비/버건디/포레스트/차콜). 코드 한 줄 없이 정체성을 입힙니다." },
  { ic: "video", title: "설교 · 주보 한 흐름", desc: "유튜브 영상 임베드, 주보 PDF 업로드, 시리즈 필터까지. 매주 화요일 자동 업로드 워크플로우." },
  { ic: "users", title: "다음 세대를 위한 구조", desc: "유아부부터 청년부까지 6개 부서 + 소그룹. 부서별 권한과 알림을 분리해 관리합니다." },
  { ic: "pray", title: "기도 요청 · 익명 옵션", desc: "공개 범위(중보기도팀/담임/전체)와 익명 처리. 개인정보 보유 기간 자동 만료." },
  { ic: "building", title: "서브도메인 즉시 발급", desc: "yourchurch.everychurch.co.kr 형태로 발급. 추후 자체 도메인 연결도 한 번의 토글로." },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "신청", desc: "교회명과 담당자 정보만 입력하면 5분 안에 슬러그가 발급됩니다." },
  { n: "02", title: "디자인 선택", desc: "4가지 색상 프리셋을 고르고 로고·태그라인만 바꿔도 정체성 있는 사이트가 완성됩니다." },
  { n: "03", title: "콘텐츠 입력", desc: "예배 시간, 담임 인사, 공지, 설교 영상 — 카테고리별로 차근차근 채워넣으세요." },
  { n: "04", title: "공개", desc: "발급받은 서브도메인으로 즉시 공개. SSL과 모바일 대응은 기본." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "이미 운영 중인 교회 홈페이지가 있는데 옮길 수 있나요?", a: "기존 사이트의 데이터를 CSV/엑셀로 일괄 가져오는 마이그레이션 도구를 베타 단계에서 무료로 제공합니다." },
  { q: "자체 도메인을 사용할 수 있나요?", a: "네. 발급받은 서브도메인(yourchurch.everychurch.co.kr) 외에 보유하신 도메인(예: yourchurch.kr)을 연결할 수 있습니다. SSL은 자동 발급됩니다." },
  { q: "여러 교역자가 함께 관리할 수 있나요?", a: "역할(담임/부서장/관리자/편집자) 기반 권한과 부서별 콘텐츠 격리를 지원합니다. 청년부 담당이 청년부 페이지만 편집하도록 제한할 수 있습니다." },
  { q: "가격은 어떻게 되나요?", a: "교회 규모와 무관하게 월 단돈 1만원입니다. 모든 기능이 포함되어 있으며 추가 결제는 없습니다. 첫 14일은 무료 체험으로 자유롭게 둘러보실 수 있습니다." },
];

export default function LandingPage() {
  const tenants = listTenants();

  return (
    <div className="landing">
      <LandingNav />

      <section className="landing-hero">
        <div className="landing-hero-bg">
          <Mesh style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <Rings style={{ position: "absolute", top: -200, right: -200, width: 800, height: 800, color: "var(--accent)", opacity: 0.18 }} />
        </div>
        <div className="landing-hero-inner">
          <div className="landing-eyebrow">
            <span className="pulse" />
            교회 홈페이지 빌더 · 베타
          </div>
          <h1 className="landing-h1">
            교회의 디지털 사역을<br />
            <span className="landing-h1-accent">5분 만에 시작</span>합니다
          </h1>
          <p className="landing-sub">
            복잡한 디자인·코딩 없이, 우리 교회의 색과 흐름을 그대로 담은 홈페이지.<br />
            예배·설교·주보·기도·교회학교 — 처음부터 교회를 위해 설계되었습니다.
          </p>
          <div className="landing-cta">
            <Link href="#demo" className="btn btn-primary btn-lg">
              <Icon.video style={{ width: 16, height: 16 }} />
              라이브 데모 보기
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg">
              기능 둘러보기 <Icon.arrow style={{ width: 14, height: 14 }} />
            </a>
          </div>
          <div className="landing-trust">
            <span>이미 사용 중인 교회</span>
            <strong>{tenants.length}곳</strong>
            <span className="landing-trust-divider" />
            <span>월 <strong>1만원</strong></span>
            <span className="landing-trust-divider" />
            <span>14일 무료 체험</span>
          </div>
        </div>
      </section>

      <section id="demo" className="section section-tinted">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Live Demos</span>
              <h2>실제로 돌아가는 홈페이지</h2>
            </div>
            <div className="section-head-action">
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                각 카드 클릭 시 해당 교회의 사이트로 이동합니다
              </span>
            </div>
          </div>
          <div className="demo-grid">
            {tenants.map((t) => (
              <Link key={t.slug} href={`/${t.slug}`} className="demo-card">
                <div className="demo-card-thumb">
                  <LightRays style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "white", opacity: 0.5 }} />
                  <div className="demo-card-thumb-inner">
                    <div className="demo-card-mark" />
                    <div className="demo-card-name">{t.name}</div>
                    <div className="demo-card-eng">{t.eng}</div>
                  </div>
                </div>
                <div className="demo-card-body">
                  <div className="demo-card-tag">{t.tagline}</div>
                  <div className="demo-card-url">
                    <span className="demo-card-url-prefix">{t.slug}.</span>everychurch.co.kr
                  </div>
                  <div className="demo-card-cta">
                    데모 열기 <Icon.arrow style={{ width: 14, height: 14 }} />
                  </div>
                </div>
              </Link>
            ))}
            <div className="demo-card demo-card-empty">
              <div className="demo-card-empty-inner">
                <Icon.cross style={{ width: 28, height: 28, color: "var(--muted-2)" }} />
                <div className="demo-card-empty-title">우리 교회가<br />여기 들어갈 수 있어요</div>
                <Link href="/login" className="btn btn-primary">
                  지금 신청 <Icon.arrow style={{ width: 12, height: 12 }} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">Features</span>
              <h2>교회를 위한, 교회만의 컴포넌트</h2>
            </div>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f) => {
              const FeatureIcon = Icon[f.ic];
              return (
                <div key={f.title} className="feature-card">
                  <div className="feature-icon"><FeatureIcon width={24} height={24} /></div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">How It Works</span>
              <h2>4단계로 시작합니다</h2>
            </div>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="section-head" style={{ marginBottom: 40, justifyContent: "center", textAlign: "center" }}>
            <div>
              <span className="eyebrow">Pricing</span>
              <h2>한 달, 단돈 <span style={{ color: "var(--accent)" }}>1만원</span></h2>
            </div>
          </div>
          <div className="price-card">
            <Rings style={{ position: "absolute", top: -160, right: -160, width: 480, height: 480, color: "var(--accent)", opacity: 0.18 }} />
            <div className="price-card-inner">
              <div className="price-tag">SINGLE PLAN</div>
              <div className="price-display">
                <span className="price-currency">₩</span>
                <span className="price-number">10,000</span>
                <span className="price-period">/ 월</span>
              </div>
              <p className="price-summary">교회 규모와 무관하게 동일한 가격. 모든 기능이 포함되어 있고, 추가 결제는 없습니다.</p>
              <ul className="price-features">
                {[
                  "교회 전용 컴포넌트 전체 (예배·설교·주보·기도·갤러리·통독)",
                  "서브도메인 즉시 발급 + SSL 자동",
                  "자체 도메인 연결",
                  "역할 기반 권한 · 부서별 콘텐츠 분리",
                  "무제한 페이지 / 무제한 트래픽",
                  "이메일 우선 응답 지원",
                ].map((f) => (
                  <li key={f}>
                    <span className="price-feature-check"><Icon.arrow style={{ width: 12, height: 12 }} /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                14일 무료로 시작 <Icon.arrow style={{ width: 14, height: 14 }} />
              </Link>
              <p className="price-note">14일 동안 자유롭게 사용해보시고, 결제는 그 이후에 시작됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="section-head" style={{ marginBottom: 40 }}>
            <div>
              <span className="eyebrow">FAQ</span>
              <h2>자주 묻는 질문</h2>
            </div>
          </div>
          <div className="faq-list">
            {FAQ.map((f, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-q">
                  {f.q}
                  <Icon.arrowDown />
                </summary>
                <div className="faq-a">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="cta-banner">
        <LightRays style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "white", opacity: 0.5 }} />
        <div className="cta-banner-inner">
          <div className="cta-banner-eyebrow">START NOW</div>
          <h2 className="cta-banner-title">
            우리 교회의 다음 사역,<br />
            홈페이지에서 시작하세요
          </h2>
          <p className="cta-banner-desc">월 1만원, 첫 14일 무료. 신청 후 5분이면 발급됩니다.</p>
          <div className="cta-banner-buttons">
            <Link href="/login" className="btn btn-primary btn-lg" style={{ background: "white", color: "var(--primary-deep)" }}>
              <Icon.mail style={{ width: 16, height: 16 }} />
              데모 신청 보내기
            </Link>
            <Link href={`/${tenants[0]?.slug ?? ""}`} className="btn btn-lg" style={{ background: "oklch(1 0 0 / 0.12)", color: "white", border: "1px solid oklch(1 0 0 / 0.2)" }}>
              먼저 데모 보기 <Icon.arrow style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
