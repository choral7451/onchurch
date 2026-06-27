import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { HideWhenAuthed } from "@/components/marketing/hide-when-authed";
import { ContactSticky } from "@/components/marketing/contact-sticky";
import { Icon, type IconKey } from "@/components/icons";
import { LightRays, Mesh, Rings } from "@/components/decorative";
import { fetchPublicChurchList } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "교회 홈페이지 제작·만들기 · 5분이면 완성 | 온교회",
  description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성. 월 1만원, 7일 무료 체험.",
  keywords: [
    "교회 홈페이지",
    "교회 홈페이지 만들기",
    "교회 홈페이지 제작",
    "교회 홈페이지 빌더",
    "교회 홈페이지 템플릿",
    "교회 홈페이지 무료 체험",
    "작은 교회 홈페이지",
    "교회 사이트",
    "교회 웹사이트",
    "예배 홈페이지",
    "설교 영상 홈페이지",
    "주보 업로드",
    "교회 공지",
    "교회 갤러리",
    "성경 통독 홈페이지",
    "기도 요청 폼",
    "교회 서브도메인",
    "온교회",
  ],
  alternates: { canonical: "https://everychurch.co.kr/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://everychurch.co.kr/",
    siteName: "온교회",
    title: "교회 홈페이지 제작·만들기 · 5분이면 완성 | 온교회",
    description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성. 월 1만원, 7일 무료 체험.",
  },
  twitter: {
    card: "summary_large_image",
    title: "교회 홈페이지 제작 · 5분이면 완성 | 온교회",
    description: "교회 홈페이지 제작, 코딩 없이 5분이면 완성. 월 1만원, 7일 무료 체험.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://everychurch.co.kr/#organization",
      name: "온교회",
      alternateName: "Everychurch",
      url: "https://everychurch.co.kr/",
      description: "교회를 위해 처음부터 설계된 홈페이지 빌더 서비스.",
      sameAs: ["https://everychurch.co.kr/"],
    },
    {
      "@type": "WebSite",
      "@id": "https://everychurch.co.kr/#website",
      url: "https://everychurch.co.kr/",
      name: "온교회 — 교회 홈페이지 빌더",
      inLanguage: "ko-KR",
      publisher: { "@id": "https://everychurch.co.kr/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "온교회 — 교회 홈페이지 제작 빌더",
      operatingSystem: "Web",
      applicationCategory: "BusinessApplication",
      description:
        "교회 홈페이지 제작이 코딩 없이 5분이면 완성되는 빌더. 9종 페이지(소개·예배·설교·주보·공지·일정·갤러리·부서·기도·통독)를 ON/OFF 토글로 운영.",
      offers: {
        "@type": "Offer",
        price: "10000",
        priceCurrency: "KRW",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "10000",
          priceCurrency: "KRW",
          unitText: "MONTH",
        },
      },
    },
  ],
};

const FEATURES: { ic: IconKey; title: string; desc: string }[] = [
  { ic: "home", title: "홈페이지", desc: "소개·예배·말씀·공지·일정·갤러리·부서·기도·통독 9종 페이지를 토글 한 번으로 켜고 끄며, 우리 교회에 필요한 것만 운영합니다." },
  { ic: "users", title: "성도 관리", desc: "성도 명부와 직분·신급·가족관계, 심방 기록까지 한 곳에서 관리합니다." },
  { ic: "calendar", title: "출석 관리", desc: "예배별 출석을 간편하게 체크하고, 성도별 출석 현황을 한눈에 확인합니다." },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "회원가입", desc: "교회명과 담당자 정보만 입력하면 바로 시작됩니다." },
  { n: "02", title: "기본 세팅", desc: "로고·연락처·주소를 입력하고 사용할 페이지를 켭니다." },
  { n: "03", title: "공개", desc: "\"사이트 운영\" 토글을 ON 하면 즉시 공개. SSL과 모바일 대응은 기본." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "어떤 페이지들을 만들 수 있나요?", a: "교회 소개, 예배 안내, 말씀, 공지, 일정, 갤러리, 부서, 기도 요청, 통독 — 총 9종의 페이지를 제공합니다. 모든 페이지는 관리자 콘솔에서 토글로 켜고 끌 수 있어 우리 교회에 필요한 것만 운영할 수 있습니다." },
  { q: "도메인은 어떻게 발급되나요?", a: "신청 즉시 yourchurch.everychurch.co.kr 형태의 서브도메인이 발급되며 SSL이 자동 적용됩니다. 발급된 슬러그는 관리자 콘솔에서 언제든 변경할 수 있습니다." },
  { q: "사이트는 언제부터 공개되나요?", a: "기본 정보(이름·연락처·주소)를 입력한 뒤 관리자 콘솔 상단의 \"사이트 운영\" 토글을 ON 하시면 즉시 공개됩니다. 작성 중에는 OFF로 두고 충분히 준비한 뒤 공개하셔도 됩니다." },
  { q: "가격은 어떻게 되나요?", a: "교회 규모와 무관하게 월 단돈 1만원입니다. 모든 기능이 포함되어 있으며 추가 결제는 없습니다. 사이트 운영을 시작하면 7일 무료 체험이 자동으로 시작되어 자유롭게 둘러보실 수 있습니다." },
];

function churchUrl(slug: string): string {
  return `https://${slug}.everychurch.co.kr`;
}

export default async function LandingPage() {
  const churches = await fetchPublicChurchList();

  return (
    <div className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingNav />

      <section className="landing-hero">
        <div className="landing-hero-bg">
          <Mesh style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <Rings style={{ position: "absolute", top: -200, right: -200, width: 800, height: 800, color: "var(--accent)", opacity: 0.18 }} />
        </div>
        <div className="landing-hero-inner">
          <div className="landing-eyebrow">
            <span className="pulse" />
            5분이면 충분합니다
          </div>
          <h1 className="landing-h1">
            교회의 디지털 사역을<br />
            <span className="landing-h1-accent">5분 만에 시작</span>합니다
          </h1>
          <p className="landing-sub">
            <span className="landing-sub-line">홈페이지부터 성도·출석 관리까지, 한 곳에서.</span>
          </p>
          <div className="landing-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">
              <Icon.arrow style={{ width: 16, height: 16 }} />
              바로 시작하기
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg">
              기능 둘러보기 <Icon.arrow style={{ width: 14, height: 14 }} />
            </a>
          </div>
          <div className="landing-trust">
            <span>월 <strong>1만원</strong></span>
            <span className="landing-trust-divider" />
            <span>7일 무료 체험</span>
          </div>
        </div>
      </section>

      {churches.length > 0 && (
        <section id="demo" className="live-sites">
          <div className="container">
            <div className="live-sites-head">
              <span className="eyebrow">Live Sites</span>
              <h3 className="live-sites-title">
                지금 운영 중인 교회 <span className="live-sites-count">{churches.length}</span>
              </h3>
            </div>
            <div className="live-grid">
              {churches.map((c) => (
                <a
                  key={c.id}
                  href={churchUrl(c.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="live-card"
                >
                  <div className="live-card-logo">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" />
                    ) : (
                      <span className="live-card-logo-fallback">{c.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="live-card-body">
                    <div className="live-card-name">{c.name}</div>
                    <div className="live-card-slug">{c.slug}.everychurch.co.kr</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="features" className="section">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">Features</span>
              <h2>홈페이지부터 출석까지, 한 곳에서</h2>
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
              <h2>3단계로 시작합니다</h2>
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
                  "홈페이지 9종 (소개·예배·말씀·공지·일정·갤러리·부서·기도·통독) · ON/OFF 토글",
                  "성도 관리 — 명부·직분·신급·가족관계·심방 기록",
                  "출석 관리 — 예배별 출석 체크·성도별 현황",
                  "서브도메인 즉시 발급 + SSL 자동",
                  "사이트 운영 토글 한 번으로 공개",
                  "이메일 우선 응답 지원",
                ].map((f) => (
                  <li key={f}>
                    <span className="price-feature-check"><Icon.arrow style={{ width: 12, height: 12 }} /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <HideWhenAuthed>
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  7일 무료로 시작 <Icon.arrow style={{ width: 14, height: 14 }} />
                </Link>
                <p className="price-note">사이트 운영을 시작하면 7일 무료 체험이 자동으로 시작됩니다.</p>
              </HideWhenAuthed>
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
          <p className="cta-banner-desc">월 1만원, 첫 7일 무료. 신청 후 5분이면 발급됩니다.</p>
          <HideWhenAuthed>
            <div className="cta-banner-buttons">
              <Link href="/signup" className="btn btn-primary btn-lg" style={{ background: "white", color: "var(--primary-deep)" }}>
                <Icon.mail style={{ width: 16, height: 16 }} />
                지금 시작하기
              </Link>
            </div>
          </HideWhenAuthed>
        </div>
      </section>

      <LandingFooter />
      <ContactSticky />
    </div>
  );
}
