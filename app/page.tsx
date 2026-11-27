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
  title: { absolute: "교회 홈페이지·성도 관리·교회 앱, 월 1만원 | 온교회" },
  description: "교회 홈페이지, 성도 관리, 우리 교회 앱까지 월 1만원 하나로. 코딩 없이 5분이면 개설, 7일 무료 체험.",
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
    "교회 앱",
    "교회 어플",
    "성도 관리 프로그램",
    "교회 출석 관리",
    "온교회",
  ],
  alternates: { canonical: "https://everychurch.co.kr/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://everychurch.co.kr/",
    siteName: "온교회",
    title: "교회 홈페이지·성도 관리·교회 앱, 월 1만원 | 온교회",
    description: "교회 홈페이지, 성도 관리, 우리 교회 앱까지 월 1만원 하나로. 코딩 없이 5분이면 개설, 7일 무료 체험.",
  },
  twitter: {
    card: "summary_large_image",
    title: "교회 홈페이지·성도 관리·교회 앱, 월 1만원 | 온교회",
    description: "교회 홈페이지, 성도 관리, 우리 교회 앱까지 월 1만원 하나로. 코딩 없이 5분이면 개설, 7일 무료 체험.",
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
      operatingSystem: "Web, iOS, Android",
      applicationCategory: "BusinessApplication",
      description:
        "교회 홈페이지, 성도·출석 관리, 아이폰·안드로이드 교회 앱을 월 1만원에 함께 제공. 코딩 없이 5분이면 개설.",
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

/** 월 1만원에 함께 들어 있는 세 가지 — 랜딩의 중심 메시지 */
const TRIO: { id: string; ic: IconKey; name: string; lead: string; items: string[] }[] = [
  {
    id: "site",
    ic: "home",
    name: "교회 홈페이지",
    lead: "새가족이 검색해서 처음 만나는 우리 교회.",
    items: [
      "소개·예배·말씀·공지·일정·갤러리·부서·통독 8종 페이지",
      "필요한 페이지만 토글로 켜고 끄기",
      "네이버·구글 검색 최적화, 휴대폰 화면 자동 대응",
      "우리교회.everychurch.co.kr 주소와 보안 인증서 기본",
    ],
  },
  {
    id: "members",
    ic: "users",
    name: "성도 관리",
    lead: "엑셀과 수첩에 흩어진 명부를 한 곳에.",
    items: [
      "성도 명부와 직분·신급·가족관계",
      "심방 기록을 성도별로 쌓기",
      "예배별 출석 체크와 성도별 출석 현황",
      "휴대폰에서도 바로 열리는 관리자 화면",
    ],
  },
  {
    id: "app",
    ic: "phone",
    name: "교회 앱",
    lead: "성도 휴대폰 홈 화면에 우리 교회가.",
    items: [
      "아이폰·안드로이드 앱, 교회를 검색해 바로 가입",
      "공지·설교·앨범을 올리면 성도에게 알림",
      "성도끼리 글과 댓글을 나누는 교제 게시판",
      "앱을 따로 만들 필요 없이 홈페이지 내용 그대로",
    ],
  },
];

const PROBLEMS: { ic: IconKey; title: string; desc: string; solve: string }[] = [
  { ic: "wallet", title: "홈페이지, 명부, 앱이 다 따로", desc: "홈페이지는 외주로 수백만 원, 성도 명부는 엑셀, 앱은 엄두도 못 냅니다. 프로그램마다 비용과 관리가 따로 붙죠.", solve: "홈페이지·성도 관리·교회 앱을 월 1만원 하나로. 제작비도 추가 결제도 없습니다." },
  { ic: "gear", title: "만들 줄 아는 사람이 없어요", desc: "코딩·디자인을 아는 사람이 없어 결국 외주. 담당 간사·청년이 바뀌면 아무도 손대지 못하고 방치됩니다.", solve: "코딩 없이 입력과 토글만으로 완성. 담당자가 바뀌어도 누구나 이어받을 수 있습니다." },
  { ic: "calendar", title: "진짜 문제는 '만든 다음'", desc: "주보·공지·설교 영상은 매주 올려야 하는데, 업데이트가 번거로워 결국 몇 달째 멈춘 홈페이지가 됩니다.", solve: "주보·공지·설교 영상을 관리자 콘솔에서 클릭 몇 번으로 올립니다. 매주 5분이면 충분해요." },
  { ic: "search", title: "검색해도 안 나오고, 폰에선 깨져요", desc: "네이버·구글에 검색되지 않고, 오래된 홈페이지는 모바일에서 레이아웃이 깨집니다. 정작 성도·새가족은 폰으로 보는데 말이죠.", solve: "네이버·구글 검색 최적화(SEO)와 모바일 대응이 기본으로 적용됩니다." },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "교회 정보 입력", desc: "교회 이름·연락처 등 기본 정보만 순서대로 입력하면 됩니다. 약 5분이면 끝나요." },
  { n: "02", title: "휴대폰 인증", desc: "본인 인증과 약관 동의만 하면 가입 완료. 아이디와 임시 비밀번호는 문자로 보내드립니다." },
  { n: "03", title: "즉시 공개", desc: "가입과 동시에 홈페이지가 공개되고, 성도는 온교회 앱에서 우리 교회를 찾아 가입할 수 있어요." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "홈페이지에는 어떤 페이지가 있나요?", a: "교회 소개, 예배 안내, 말씀, 공지, 일정, 갤러리, 부서, 통독 — 총 8종의 페이지를 제공합니다. 모든 페이지는 관리자 콘솔에서 토글로 켜고 끌 수 있어 우리 교회에 필요한 것만 운영할 수 있습니다." },
  { q: "도메인은 어떻게 발급되나요?", a: "가입 즉시 yourchurch.everychurch.co.kr 형태의 서브도메인이 발급되며 SSL이 자동 적용됩니다. 발급된 슬러그는 관리자 콘솔에서 언제든 변경할 수 있습니다." },
  { q: "사이트는 언제부터 공개되나요?", a: "기본 정보(이름·연락처·주소)를 입력한 뒤 관리자 콘솔 상단의 \"사이트 운영\" 토글을 ON 하시면 즉시 공개됩니다. 작성 중에는 OFF로 두고 충분히 준비한 뒤 공개하셔도 됩니다." },
  { q: "월 1만원에 정말 다 들어 있나요?", a: "네. 교회 규모와 무관하게 월 1만원이면 홈페이지, 성도·출석 관리, 교회 앱까지 모두 쓰실 수 있습니다. 기능별 추가 요금은 없습니다. 사이트 운영을 시작하면 7일 무료 체험이 자동으로 시작되어 자유롭게 둘러보실 수 있습니다." },
  { q: "교회 앱은 따로 만들어야 하나요?", a: "아니요. 성도는 앱스토어나 구글 플레이에서 '온교회' 앱을 설치한 뒤 우리 교회를 검색해 가입하면 됩니다. 홈페이지에 올린 공지·설교·앨범이 앱에 그대로 보이고, 새 글이 올라오면 알림이 갑니다. 관리자 화면에 있는 앱 설치 QR을 주보에 넣어 안내해 보세요." },
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
              홈페이지, 성도 관리,<br />
              교회 앱까지 <span className="landing-h1-accent">월 1만원</span>
            </h1>
            <p className="landing-sub">
              <span className="landing-sub-line">작은 교회에 필요한 세 가지를 하나로 묶었습니다.</span>
              <span className="landing-sub-line">코딩 없이 5분이면 개설하고, 성도는 앱으로 바로 소식을 받아요.</span>
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
              <span><strong>앱</strong> 아이폰·안드로이드</span>
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
        <section id="demo" className="live-sites" data-section="demo" data-section-index={1}>
          <div className="container">
            <div className="live-sites-head">
              <span className="eyebrow">Live Sites</span>
              <h3 className="live-sites-title">지금 운영 중인 교회</h3>
              <p className="live-sites-count">
                현재 <strong>{churches.length}개</strong> 교회가 온교회를 사용하고 있어요
              </p>
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

      <section id="features" className="section section-tinted bundle" data-section="features" data-section-index={2}>
        <div className="container">
          <div className="bundle-head">
            <h2>세 가지를 따로 준비하지 마세요</h2>
            <p>홈페이지를 만들고, 명부 프로그램을 사고, 앱을 외주 맡기던 일을 온교회 하나로 끝냅니다.</p>
          </div>

          <div className="bundle-sum" aria-label="홈페이지, 성도 관리, 교회 앱을 합쳐 월 1만원">
            <div className="bundle-sum-items">
              {TRIO.map((t, i) => {
                const TrioIcon = Icon[t.ic];
                return (
                  <div key={t.id} className="bundle-sum-part">
                    {i > 0 && <span className="bundle-sum-op" aria-hidden="true">+</span>}
                    <a href={`#trio-${t.id}`} className="bundle-sum-item">
                      <span className="bundle-sum-icon"><TrioIcon width={20} height={20} /></span>
                      {t.name}
                    </a>
                  </div>
                );
              })}
            </div>
            <div className="bundle-sum-total">
              <span>모두 합쳐</span>
              <strong>월 1만원</strong>
            </div>
          </div>

          <div className="trio">
            {TRIO.map((t) => {
              const TrioIcon = Icon[t.ic];
              return (
                <article key={t.id} id={`trio-${t.id}`} className={`trio-card trio-${t.id}`}>
                  <div className="trio-top">
                    <span className="trio-icon"><TrioIcon width={22} height={22} /></span>
                    <h3 className="trio-name">{t.name}</h3>
                  </div>
                  <p className="trio-lead">{t.lead}</p>
                  <ul className="trio-list">
                    {t.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" data-section="problem" data-section-index={3}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 56 }}>
            <div>
              <span className="eyebrow">Why 온교회</span>
              <h2>교회 홈페이지, 만드는 것보다 이어 가는 게 더 어렵습니다</h2>
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

      <section className="section section-tinted" data-section="how" data-section-index={4}>
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

      <section id="pricing" className="section" data-section="pricing" data-section-index={5}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="section-head section-head-center" style={{ marginBottom: 40 }}>
            <div>
              <span className="eyebrow">Pricing</span>
              <h2>세 가지 모두, 한 달 1만원</h2>
            </div>
          </div>
          <div className="price-card">
            <Rings style={{ position: "absolute", top: -160, right: -160, width: 480, height: 480, color: "var(--accent)", opacity: 0.18 }} />
            <div className="price-card-inner">
              <div className="price-tag">하나의 요금제</div>
              <div className="price-display">
                <span className="price-currency">₩</span>
                <span className="price-number">10,000</span>
                <span className="price-period">/ 월</span>
              </div>
              <p className="price-summary">교회 규모와 상관없이 같은 가격입니다. 홈페이지·성도 관리·교회 앱이 모두 들어 있고, 추가 결제는 없습니다.</p>
              <ul className="price-features">
                {[
                  "교회 홈페이지 8종 페이지와 네이버·구글 검색 최적화",
                  "성도 명부·직분·가족관계·심방 기록",
                  "예배별 출석 체크와 성도별 출석 현황",
                  "아이폰·안드로이드 교회 앱과 새 글 알림",
                  "성도 교제 게시판과 댓글",
                  "주소 즉시 발급, 보안 인증서 자동 적용",
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

      <section className="section section-tinted" data-section="faq" data-section-index={6}>
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

      <section id="cta" className="cta-banner" data-section="cta" data-section-index={7}>
        <LightRays style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "white", opacity: 0.5 }} />
        <div className="cta-banner-inner">
          <div className="cta-banner-eyebrow">START NOW</div>
          <h2 className="cta-banner-title">
            홈페이지부터 교회 앱까지,<br />
            오늘 바로 시작하세요
          </h2>
          <p className="cta-banner-desc">월 1만원, 첫 7일 무료. 가입 후 5분이면 홈페이지와 앱이 함께 열립니다.</p>
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
