import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenants";
import { Icon, type IconKey } from "@/components/icons";
import { LightRays, Mesh, Rings } from "@/components/decorative";
import { SermonCard } from "@/components/sermon-card";
import { Calendar } from "@/components/calendar";

const QUICK_LINKS: { ic: IconKey; title: string; desc: string; path: string }[] = [
  { ic: "calendar", title: "예배 안내", desc: "주일/수요/새벽 모든 예배 시간을 확인하세요", path: "/worship" },
  { ic: "video", title: "설교 영상", desc: "지난 설교를 언제든 다시 듣고 묵상하세요", path: "/sermons" },
  { ic: "users", title: "교회학교", desc: "각 부서별 모임과 다음 세대 사역 안내", path: "/departments" },
  { ic: "mapPin", title: "찾아오시는 길", desc: "처음 오시는 분도 어렵지 않게 안내합니다", path: "/directions" },
];

export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();
  const url = (path: string) => `/${tenant}${path}`;

  return (
    <div>
      <section className="hero">
        <div className="hero-bg">
          <Mesh style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
        </div>
        <div className="hero-inner">
          <div className="news-feature">
            <LightRays className="news-feature-bg" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, color: "white" }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <div className="news-feature-tag">
                  <span className="pulse" />
                  {D.hero.feature.tag}
                </div>
                <h2 className="news-feature-title">{D.hero.feature.title}</h2>
                <p className="news-feature-desc">{D.hero.feature.desc}</p>
              </div>
              <div>
                <div className="news-feature-meta">{D.hero.feature.meta}</div>
                <Link href={url("/notices")} className="news-feature-cta">
                  자세히 보기 <Icon.arrow style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </div>
          </div>

          <div className="news-list-card">
            <div className="news-list-head">
              <h3>최근 소식</h3>
              <Link href={url("/notices")}>전체보기 →</Link>
            </div>
            <ul className="news-list">
              {D.hero.sideList.map((item, i) => (
                <li key={i} className="news-item">
                  <Link href={url("/notices")} style={{ display: "contents" }}>
                    <div className="news-item-date">
                      <span className="day">{item.day}</span>
                      <span className="mon">{item.mon}</span>
                    </div>
                    <div className="news-item-body">
                      <div className="news-item-title">{item.title}</div>
                      <div className="news-item-cat">{item.cat}</div>
                    </div>
                    <div className="news-item-pin"><Icon.arrow style={{ width: 12, height: 12 }} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="container">
          <div className="quick-strip">
            {QUICK_LINKS.map((q) => {
              const QuickIcon = Icon[q.ic];
              return (
                <Link key={q.title} href={url(q.path)} className="quick-card">
                  <div className="quick-card-icon"><QuickIcon width={22} height={22} /></div>
                  <div className="quick-card-title">{q.title}</div>
                  <div className="quick-card-desc">{q.desc}</div>
                  <div className="quick-card-arrow">바로가기 <Icon.arrow style={{ width: 12, height: 12 }} /></div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Worship Schedule</span>
              <h2>예배는 우리 공동체의<br />가장 중요한 시간입니다</h2>
            </div>
            <div className="section-head-action">
              <Link href={url("/worship")}>전체 예배 안내 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
            </div>
          </div>
          <div className="worship-grid">
            {D.worshipServices.slice(0, 6).map((w, i) => (
              <div key={i} className={`worship-card ${w.feat ? "feat" : ""}`}>
                <span className="worship-cat">{w.tag}</span>
                <div className="worship-name">{w.name}</div>
                <div className="worship-time">{w.time}</div>
                <div className="worship-meta">{w.meta}</div>
                {w.feat && <span className="worship-pill">대표 예배</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sermons</span>
              <h2>이번 주 말씀</h2>
            </div>
            <div className="section-head-action">
              <Link href={url("/sermons")}>설교 아카이브 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
            </div>
          </div>
          <div className="sermon-grid">
            <SermonCard sermon={D.sermons[0]} feat />
            <SermonCard sermon={D.sermons[1]} />
            <SermonCard sermon={D.sermons[2]} />
          </div>
        </div>
      </section>

      <section className="verse-banner">
        <LightRays className="verse-bg" style={{ width: "100%", height: "100%", color: "white" }} />
        <div className="verse-banner-inner">
          <div className="verse-eyebrow">VERSE OF THE WEEK</div>
          <p className="verse-text">
            &ldquo;{D.verseOfWeek.text.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}&rdquo;
          </p>
          <div className="verse-ref">{D.verseOfWeek.ref}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Calendar & Events</span>
              <h2>이번 달 교회 일정</h2>
            </div>
            <div className="section-head-action">
              <Link href={url("/notices")}>전체 일정 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
            </div>
          </div>
          <Calendar config={D.calendar} events={D.events} />
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container">
          <div className="pray-cta">
            <Rings className="pray-cta-bg" style={{ color: "var(--primary)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="eyebrow">Prayer Request</span>
              <h3>혼자 감당하기 어려운 일이 있으신가요?</h3>
              <p>성도와 목회진이 함께 마음을 모아 기도해 드립니다. 익명으로도 가능합니다.</p>
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <Link href={url("/prayer")} className="btn btn-primary btn-lg">
                <Icon.pray style={{ width: 16, height: 16 }} />
                기도 요청 보내기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pastor-section">
            <div className="pastor-photo">
              <div className="pastor-photo-label">담임목사 사진</div>
            </div>
            <div className="pastor-block">
              <span className="eyebrow">Greetings from Pastor</span>
              <h2 className="pastor-name">{D.pastor.name} <span>{D.pastor.role} / {D.pastor.eng}</span></h2>
              <p className="pastor-msg">
                {D.pastor.message.split("\n\n").map((para, i, arr) => (
                  <span key={i}>
                    {para}
                    {i < arr.length - 1 && <><br /><br /></>}
                  </span>
                ))}
              </p>
              <div className="pastor-sign">담임목사 <strong>{D.pastor.name.replace(/\s/g, "")}</strong></div>
              <div style={{ marginTop: 28 }}>
                <Link href={url("/about")} className="btn btn-secondary">
                  교회 소개 자세히 <Icon.arrow style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
