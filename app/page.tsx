import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { HideWhenAuthed } from "@/components/marketing/hide-when-authed";
import { ContactSticky } from "@/components/marketing/contact-sticky";
import { SectionTracker } from "@/components/marketing/section-tracker";
import { HeroPreview } from "@/components/marketing/hero-preview";
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
        "교회 홈페이지 제작이 코딩 없이 5분이면 완성되는 빌더. 8종 페이지(소개·예배·설교·주보·공지·일정·갤러리·부서·통독)를 ON/OFF 토글로 운영.",
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
  { ic: "home", title: "홈페이지", desc: "소개·예배·말씀·공지·일정·갤러리·부서·통독 8종 페이지를 토글 한 번으로 켜고 끄며, 우리 교회에 필요한 것만 운영합니다." },
  { ic: "users", title: "성도 관리", desc: "성도 명부와 직분·신급·가족관계, 심방 기록까지 한 곳에서 관리합니다." },
  { ic: "calendar", title: "출석 관리", desc: "예배별 출석을 간편하게 체크하고, 성도별 출석 현황을 한눈에 확인합니다." },
];

const PROBLEMS: { ic: IconKey; title: string; desc: string; solve: string }[] = [
  { ic: "wallet", title: "제작비 수백만원, 게다가 매달 유지비", desc: "외주 제작은 기본 수백만 원. 만든 뒤에도 수정할 때마다 비용이 붙습니다. 작은 교회 예산엔 큰 부담이죠.", solve: "제작비 0원, 월 1만원 단일 요금. 수정도 직접 하니 추가 비용이 없습니다." },
  { ic: "gear", title: "만들 줄 아는 사람이 없어요", desc: "코딩·디자인을 아는 사람이 없어 결국 외주. 담당 간사·청년이 바뀌면 아무도 손대지 못하고 방치됩니다.", solve: "코딩 없이 입력과 토글만으로 완성. 담당자가 바뀌어도 누구나 이어받을 수 있습니다." },
  { ic: "calendar", title: "진짜 문제는 '만든 다음'", desc: "주보·공지·설교 영상은 매주 올려야 하는데, 업데이트가 번거로워 결국 몇 달째 멈춘 홈페이지가 됩니다.", solve: "주보·공지·설교 영상을 관리자 콘솔에서 클릭 몇 번으로 올립니다. 매주 5분이면 충분해요." },
  { ic: "search", title: "검색해도 안 나오고, 폰에선 깨져요", desc: "네이버·구글에 검색되지 않고, 오래된 홈페이지는 모바일에서 레이아웃이 깨집니다. 정작 성도·새가족은 폰으로 보는데 말이죠.", solve: "네이버·구글 검색 최적화(SEO)와 모바일 대응이 기본으로 적용됩니다." },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "교회 정보 입력", desc: "교회 이름·연락처 등 기본 정보만 순서대로 입력하면 됩니다. 약 5분이면 끝나요." },
  { n: "02", title: "휴대폰 인증", desc: "본인 인증과 약관 동의만 하면 가입 완료. 아이디와 임시 비밀번호는 문자로 보내드립니다." },
  { n: "03", title: "즉시 공개", desc: "가입과 동시에 우리 교회 홈페이지가 바로 공개됩니다. 주소(SSL)와 모바일 대응은 기본." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "어떤 페이지들을 만들 수 있나요?", a: "교회 소개, 예배 안내, 말씀, 공지, 일정, 갤러리, 부서, 통독 — 총 8종의 페이지를 제공합니다. 모든 페이지는 관리자 콘솔에서 토글로 켜고 끌 수 있어 우리 교회에 필요한 것만 운영할 수 있습니다." },
  { q: "도메인은 어떻게 발급되나요?", a: "가입 즉시 yourchurch.everychurch.co.kr 형태의 서브도메인이 발급되며 SSL이 자동 적용됩니다. 발급된 슬러그는 관리자 콘솔에서 언제든 변경할 수 있습니다." },
  { q: "사이트는 언제부터 공개되나요?", a: "기본 정보(이름·연락처·주소)를 입력한 뒤 관리자 콘솔 상단의 \"사이트 운영\" 토글을 ON 하시면 즉시 공개됩니다. 작성 중에는 OFF로 두고 충분히 준비한 뒤 공개하셔도 됩니다." },
  { q: "가격은 어떻게 되나요?", a: "교회 규모와 무관하게 월 단돈 1만원입니다. 모든 기능이 포함되어 있으며 추가 결제는 없습니다. 사이트 운영을 시작하면 7일 무료 체험이 자동으로 시작되어 자유롭게 둘러보실 수 있습니다." },
];

function churchUrl(slug: string): string {
  // ?from=landing → 데모로 넘어온 방문자에게만 교회 사이트에서 무료체험 스티키를 띄우기 위한 표시.
  return `https://${slug}.everychurch.co.kr?from=landing`;
}

export default async function LandingPage() {
  const churches = await fetchPublicChurchList();
  const featured = churches[0] ?? null;

  return (
    <div className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingNav />

      <section className="landing-hero" data-section="hero" data-section-index={0}>
        <div className="landing-hero-bg">
          <Mesh style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <Rings style={{ position: "absolute", top: -200, right: -200, width: 800, height: 800, color: "var(--accent)", opacity: 0.18 }} />
        </div>
        <div className={`landing-hero-inner${featured ? " landing-hero-split" : ""}`}>
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <span className="pulse" />7일 무료 체험 · 카드 등록 없이 시작
            </span>
            <h1 className="landing-h1">
              우리 교회 홈페이지,<br />
              <span className="landing-h1-accent">5분이면 완성</span>됩니다
            </h1>
            <p className="landing-sub">
              <span className="landing-sub-line">코딩도 디자인도 필요 없어요.</span>
              <span className="landing-sub-line">예배 안내·설교·교회 소식을 담은 홈페이지가 그 자리에서 공개됩니다.</span>
            </p>
            <div className="landing-cta">
              <Link href="/signup" className="btn btn-primary btn-lg">
                무료로 시작하기
              </Link>
              <a href="#demo" className="btn btn-secondary btn-lg">
                실제 교회 둘러보기
              </a>
            </div>
            <div className="landing-trust">
              {churches.length > 0 && (
                <>
                  <span><strong>{churches.length}개</strong> 교회 운영 중</span>
                  <span className="landing-trust-divider" />
                </>
              )}
              <span><strong>5분</strong> 만에 개설</span>
              <span className="landing-trust-divider" />
              <span><strong>월 1만원</strong> 단일 요금</span>
            </div>
          </div>

          {featured && (
            <HeroPreview
              slug={featured.slug}
              name={featured.name}
              href={churchUrl(featured.slug)}
            />
          )}
        </div>
      </section>

      {churches.length > 0 && (
        <section className="trust-strip" data-section="social" data-section-index={1}>
          <div className="trust-strip-inner">
            <span className="trust-strip-label">
              이미 <strong>{churches.length}개</strong> 교회가 온교회로 운영하고 있어요
            </span>
            <div className="trust-strip-names">
              {churches.slice(0, 12).map((c) => (
                <span key={c.id} className="trust-strip-name">{c.name}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {churches.length > 0 && (
        <section id="demo" className="live-sites" data-section="demo" data-section-index={2}>
          <div className="container">
            <div className="live-sites-head">
              <span className="eyebrow">Live Sites</span>
              <h3 className="live-sites-title">지금 운영 중인 교회</h3>
            </div>
            <div className="live-grid">
              {churches.slice(0, 4).map((c) => (
                <a
                  key={c.id}
                  href={churchUrl(c.slug)}
                  className="live-card"
                >
                  <div className="live-card-logo">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" loading="lazy" decoding="async" />
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

      <section className="section" data-section="problem" data-section-index={3}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">Why 온교회</span>
              <h2>교회 홈페이지, 만드는 것보다 유지가 더 어렵습니다</h2>
            </div>
          </div>
          <div className="problem-grid">
            {PROBLEMS.map((p) => {
              const ProblemIcon = Icon[p.ic];
              return (
                <div key={p.title} className="feature-card">
                  <div className="feature-icon"><ProblemIcon width={24} height={24} /></div>
                  <div className="feature-title">{p.title}</div>
                  <div className="feature-desc">{p.desc}</div>
                  <div className="problem-solve">
                    <span className="problem-solve-label">
                      <Icon.arrow style={{ width: 12, height: 12 }} />
                      온교회는 이렇게
                    </span>
                    <p className="problem-solve-desc">{p.solve}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" data-section="how" data-section-index={4}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">How It Works</span>
              <h2>가입부터 공개까지, 딱 3단계</h2>
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

      <section id="features" className="section section-tinted" data-section="features" data-section-index={5}>
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

      <section id="pricing" className="section" data-section="pricing" data-section-index={6}>
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
                  "네이버·구글 등 포털 사이트 검색 최적화(SEO)",
                  "홈페이지 8종 (소개·예배·말씀·공지·일정·갤러리·부서·통독) · ON/OFF 토글",
                  "성도 관리 — 명부·직분·신급·가족관계·심방 기록",
                  "출석 관리 — 예배별 출석 체크·성도별 현황",
                  "서브도메인 즉시 발급 + SSL 자동",
                  "사이트 운영 토글 한 번으로 공개",
                ].map((f) => (
                  <li key={f}>
                    <span className="price-feature-check"><Icon.arrow style={{ width: 12, height: 12 }} /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <HideWhenAuthed>
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  7일 무료로 시작
                </Link>
                <p className="price-note">사이트 운영을 시작하면 7일 무료 체험이 자동으로 시작됩니다.</p>
              </HideWhenAuthed>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tinted" data-section="faq" data-section-index={7}>
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

      <section id="cta" className="cta-banner" data-section="cta" data-section-index={8}>
        <LightRays style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "white", opacity: 0.5 }} />
        <div className="cta-banner-inner">
          <div className="cta-banner-eyebrow">START NOW</div>
          <h2 className="cta-banner-title">
            우리 교회의 다음 사역,<br />
            홈페이지에서 시작하세요
          </h2>
          <p className="cta-banner-desc">월 1만원, 첫 7일 무료. 가입 후 5분이면 시작할 수 있습니다.</p>
          <HideWhenAuthed>
            <div className="cta-banner-buttons">
              <Link href="/signup" className="btn btn-primary btn-lg" style={{ background: "white", color: "var(--primary-deep)" }}>
                <Icon.cross style={{ width: 16, height: 16 }} />
                체험 시작하기
              </Link>
            </div>
          </HideWhenAuthed>
        </div>
      </section>

      <LandingFooter />
      <ContactSticky />
      <SectionTracker />
    </div>
  );
}
