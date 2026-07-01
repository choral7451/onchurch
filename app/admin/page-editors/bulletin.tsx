"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  ApiError,
  onchurchBulletin,
  onchurchChurch,
  onchurchStaff,
  onchurchNotice,
  onchurchWorshipService,
  uploadImages,
  type Church,
  type BulletinWorshipOrderItem,
  type BulletinWorshipServiceItem,
  type BulletinStaffItem,
  type BulletinNewsItem,
  type BulletinVolunteerItem,
} from "@/lib/api-client";

type Status = "loading" | "idle" | "saving";

type Draft = {
  serviceDate: string;
  locationImageUrl: string | null;
  issueNo: string;
  coverVerse: string;
  coverVerseRef: string;
  worshipOrder: BulletinWorshipOrderItem[];
  worshipServices: BulletinWorshipServiceItem[];
  staff: BulletinStaffItem[];
  news: BulletinNewsItem[];
  volunteers: BulletinVolunteerItem[];
};

const EMPTY_DRAFT: Draft = {
  serviceDate: "",
  locationImageUrl: null,
  issueNo: "",
  coverVerse: "",
  coverVerseRef: "",
  worshipOrder: [],
  worshipServices: [],
  staff: [],
  news: [],
  volunteers: [],
};

const ROOT_DOMAIN = "everychurch.co.kr";

// 표지(1면) 배경 이미지
const COVER_BG_URL =
  "https://artinfo.s3.ap-northeast-2.amazonaws.com/prod/upload/4637/images/20260525/original/_AwGPQPG4Cz.1779695879547.jpeg";

function homepageUrl(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`;
}

export function BulletinEditor() {
  const [church, setChurch] = useState<Church | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 홈페이지 QR 생성
  useEffect(() => {
    if (!church?.slug) return;
    QRCode.toDataURL(homepageUrl(church.slug), { margin: 1, width: 320 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [church?.slug]);

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const [churchRes, bulletin] = await Promise.all([
        onchurchChurch.getMine().catch(() => null),
        onchurchBulletin.getMine().catch(() => null),
      ]);
      if (churchRes?.church) setChurch(churchRes.church);

      if (bulletin) {
        setDraft({
          serviceDate: bulletin.serviceDate ?? "",
          locationImageUrl: bulletin.locationImageUrl,
          issueNo: bulletin.issueNo ?? "",
          coverVerse: bulletin.coverVerse ?? "",
          coverVerseRef: bulletin.coverVerseRef ?? "",
          worshipOrder: bulletin.worshipOrder ?? [],
          worshipServices: bulletin.worshipServices ?? [],
          staff: bulletin.staff ?? [],
          news: bulletin.news ?? [],
          volunteers: bulletin.volunteers ?? [],
        });
      } else {
        // 최초 진입 — 사이트 정보로 자동 채움
        await fillFromSite({ silent: true });
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "주보 정보를 불러오지 못했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  // 현재 사이트에 저장된 데이터로 예배시간·섬기는분들·소식을 다시 채움
  // (예배 순서는 주보에서 직접 입력 — 사이트 prefill 대상이 아님)
  async function fillFromSite({ silent = false }: { silent?: boolean } = {}) {
    if (!silent && !confirm("현재 사이트에 저장된 정보로 다시 불러올까요? 지금 입력한 내용은 덮어쓰여집니다.")) return;
    try {
      const [services, staff, noticeRes] = await Promise.all([
        onchurchWorshipService.listMine().catch(() => []),
        onchurchStaff.listMine().catch(() => []),
        onchurchNotice.listMine().catch(() => ({ notices: [] })),
      ]);
      setDraft((prev) => ({
        ...prev,
        worshipServices: services
          .filter((s) => s.isActive)
          .map((s) => ({ name: s.name, time: s.time, meta: s.meta })),
        staff: staff
          .map((s) => ({ name: s.name, role: s.role, area: s.area })),
        news: (noticeRes.notices ?? [])
          .filter((n) => n.isActive)
          .slice(0, 8)
          .map((n) => ({ title: n.title, content: n.content })),
      }));
      if (!silent) {
        setSavedMsg("사이트 정보로 다시 채웠습니다. 수정 후 저장하세요.");
        setTimeout(() => setSavedMsg(""), 2500);
      }
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "사이트 정보를 불러오지 못했습니다.");
    }
  }

  async function save() {
    setStatus("saving");
    setErrMsg("");
    setSavedMsg("");
    try {
      await onchurchBulletin.upsertMine({
        templateId: "classic",
        serviceDate: draft.serviceDate.trim() || null,
        locationImageUrl: draft.locationImageUrl,
        issueNo: draft.issueNo.trim() || null,
        coverVerse: draft.coverVerse.trim() || null,
        coverVerseRef: draft.coverVerseRef.trim() || null,
        worshipOrder: draft.worshipOrder,
        worshipServices: draft.worshipServices,
        staff: draft.staff,
        news: draft.news,
        volunteers: draft.volunteers,
      });
      setSavedMsg("저장되었습니다.");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  if (status === "loading") {
    return (
      <section className="admin-section">
        <p style={{ color: "var(--muted)" }}>주보 정보를 불러오는 중...</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">BULLETIN</div>
        <h2>주보 만들기</h2>
        <p>
          교회 정보·예배 시간·섬기는 분들·소식을 불러와 칸을 채우고, A4 한 장을 반으로 접는 4면 주보로 인쇄(PDF 저장)할 수 있습니다.
          입력한 내용은 저장되어 다음에 다시 불러옵니다.
        </p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
        {savedMsg && <div className="phone-msg phone-msg-success">{savedMsg}</div>}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            padding: "12px 16px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-tinted)",
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <span>
            표지의 <strong>로고·교회명·교회 표어</strong>는 기본 정보에 저장된 값을 사용합니다. <strong>연락처·위치·홈페이지 QR</strong>은 마지막 면에 표시됩니다.
          </span>
          <button type="button" className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => void fillFromSite()}>
            현재 사이트 정보로 다시 채우기
          </button>
        </div>

        {/* 사용 날짜 */}
        <FieldBlock title="사용 날짜">
          <div className="form-row">
            <input
              value={draft.serviceDate}
              onChange={(e) => setDraft({ ...draft, serviceDate: e.target.value })}
              placeholder="예: 2026년 5월 31일 주일"
            />
          </div>
        </FieldBlock>

        {/* 주보 호수 */}
        <FieldBlock title="주보 호수" hint="표지에 표시됩니다. 예: 제 1234 호">
          <div className="form-row">
            <input
              value={draft.issueNo}
              onChange={(e) => setDraft({ ...draft, issueNo: e.target.value })}
              placeholder="제 1234 호"
            />
          </div>
        </FieldBlock>

        {/* 금주의 말씀 */}
        <FieldBlock title="금주의 말씀" hint="표지에 들어갈 성경 구절과 출처">
          <div className="form-row full">
            <textarea
              rows={2}
              value={draft.coverVerse}
              onChange={(e) => setDraft({ ...draft, coverVerse: e.target.value })}
              placeholder="태초에 하나님이 천지를 창조하시니라"
            />
          </div>
          <div className="form-row">
            <input
              value={draft.coverVerseRef}
              onChange={(e) => setDraft({ ...draft, coverVerseRef: e.target.value })}
              placeholder="창세기 1:1"
            />
          </div>
        </FieldBlock>

        {/* 교회 위치 이미지 */}
        <FieldBlock title="교회 위치 이미지" hint="약도·지도 캡처 이미지를 첨부하면 표지에 표시됩니다.">
          <LocationImageField value={draft.locationImageUrl} onChange={(url) => setDraft({ ...draft, locationImageUrl: url })} />
        </FieldBlock>

        {/* 예배 순서 */}
        <ListBlock
          title="예배 순서"
          hint="순서 · 찬송/본문 · 인도자"
          items={draft.worshipOrder}
          onChange={(next) => setDraft({ ...draft, worshipOrder: next })}
          empty={{ item: "", detail: "", leader: "" }}
          columns={[
            { key: "item", label: "순서", placeholder: "예배의 부름", flex: 1 },
            { key: "detail", label: "찬송·본문", placeholder: "찬송가 1장", flex: 1 },
            { key: "leader", label: "인도자", placeholder: "인도자", width: 120 },
          ]}
        />

        {/* 예배 시간 */}
        <ListBlock
          title="예배 시간"
          items={draft.worshipServices}
          onChange={(next) => setDraft({ ...draft, worshipServices: next })}
          empty={{ name: "", time: "", meta: "" }}
          columns={[
            { key: "name", label: "예배명", placeholder: "주일 1부 예배", flex: 1 },
            { key: "time", label: "시간", placeholder: "오전 9:00", width: 130 },
            { key: "meta", label: "비고", placeholder: "본당", flex: 1 },
          ]}
        />

        {/* 섬기는 분들 */}
        <ListBlock
          title="섬기는 분들"
          items={draft.staff}
          onChange={(next) => setDraft({ ...draft, staff: next })}
          empty={{ name: "", role: "", area: "" }}
          columns={[
            { key: "name", label: "이름", placeholder: "홍길동", flex: 1 },
            { key: "role", label: "직분", placeholder: "장로", width: 120 },
            { key: "area", label: "담당", placeholder: "예배부", flex: 1 },
          ]}
        />

        {/* 교회 소식 */}
        <ListBlock
          title="교회 소식"
          items={draft.news}
          onChange={(next) => setDraft({ ...draft, news: next })}
          empty={{ title: "", content: "" }}
          columns={[
            { key: "title", label: "제목", placeholder: "새가족 환영", flex: 1 },
            { key: "content", label: "내용", placeholder: "이번 주 새가족을 환영합니다.", flex: 2, multiline: true },
          ]}
        />

        {/* 봉사위원 */}
        <ListBlock
          title="봉사위원"
          hint="항목과 이름을 표 형태로 입력합니다. (예: 안내위원 · 김집사)"
          items={draft.volunteers}
          onChange={(next) => setDraft({ ...draft, volunteers: next })}
          empty={{ key: "", value: "" }}
          columns={[
            { key: "key", label: "항목", placeholder: "안내위원", width: 180 },
            { key: "value", label: "이름", placeholder: "김집사, 이집사", flex: 1 },
          ]}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={status === "saving"}>
            {status === "saving" ? "저장 중..." : "주보 내용 저장"}
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setPreviewing(true)}>
            주보 미리보기 · 인쇄
          </button>
        </div>
      </div>

      {previewing && church && (
        <BulletinPreviewOverlay
          church={church}
          draft={draft}
          qrDataUrl={qrDataUrl}
          onClose={() => setPreviewing(false)}
        />
      )}
    </section>
  );
}

function FieldBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        {hint && <span style={{ color: "var(--muted)", fontSize: 12 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

type Column<T> = {
  key: keyof T;
  label: string;
  placeholder?: string;
  width?: number;
  flex?: number;
  multiline?: boolean;
};

function ListBlock<T extends Record<string, string | null>>({
  title,
  hint,
  items,
  onChange,
  empty,
  columns,
}: {
  title: string;
  hint?: string;
  items: T[];
  onChange: (next: T[]) => void;
  empty: T;
  columns: Column<T>[];
}) {
  function update(idx: number, key: keyof T, value: string) {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    onChange(next);
  }
  function add() {
    onChange([...items, { ...empty }]);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <FieldBlock title={title} hint={hint}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>항목이 없습니다. 아래 버튼으로 추가하세요.</p>
        )}
        {items.map((it, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              padding: "8px 10px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0 6px", lineHeight: 1.2, height: 18, fontSize: 11 }}
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="위로"
              >
                ▲
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0 6px", lineHeight: 1.2, height: 18, fontSize: 11 }}
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                aria-label="아래로"
              >
                ▼
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {columns.map((col) => (
                <div
                  key={String(col.key)}
                  style={{ flex: col.flex ?? undefined, width: col.width, minWidth: col.width ?? 120 }}
                >
                  {col.multiline ? (
                    <textarea
                      rows={2}
                      value={(it[col.key] as string) ?? ""}
                      onChange={(e) => update(idx, col.key, e.target.value)}
                      placeholder={col.placeholder}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <input
                      value={(it[col.key] as string) ?? ""}
                      onChange={(e) => update(idx, col.key, e.target.value)}
                      placeholder={col.placeholder}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ alignSelf: "center" }}
              onClick={() => remove(idx)}
              aria-label="삭제"
            >
              삭제
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-secondary" onClick={add}>
            + {title} 추가
          </button>
        </div>
      </div>
    </FieldBlock>
  );
}

function LocationImageField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setErr("");
    setUploading(true);
    try {
      const [uploaded] = await uploadImages([file]);
      if (uploaded?.url) onChange(uploaded.url);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div
        style={{
          width: 160,
          height: 110,
          borderRadius: "var(--r-md)",
          border: "1px dashed var(--muted-2)",
          background: "var(--surface-2)",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 11 }}>위치 이미지 미리보기</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "업로드 중..." : value ? "이미지 변경" : "이미지 업로드"}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} disabled={uploading}>
            제거
          </button>
        )}
        {err && <span style={{ color: "oklch(0.55 0.18 28)", fontSize: 12 }}>{err}</span>}
      </div>
    </div>
  );
}

// ── 인쇄 미리보기 오버레이 + A4 4면 레이아웃 ──────────────────────
function BulletinPreviewOverlay({
  church,
  draft,
  qrDataUrl,
  onClose,
}: {
  church: Church;
  draft: Draft;
  qrDataUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const front = <BulletinPageFront church={church} draft={draft} />;
  const order = <BulletinPageOrder church={church} draft={draft} />;
  const worshipStaff = <BulletinPageWorshipStaff church={church} draft={draft} />;
  const newsVolunteers = <BulletinPageNewsVolunteers church={church} draft={draft} qrDataUrl={qrDataUrl} />;

  return createPortal(
    <div className="bulletin-portal">
      <style>{BULLETIN_CSS}</style>

      {/* 화면 전용 컨트롤 바 */}
      <div className="bulletin-toolbar">
        <div className="bulletin-toolbar-info">
          A4 가로 양면 인쇄 → 세로로 반 접기. 인쇄 대화상자에서 <strong>양면·여백 없음·배경 그래픽</strong>을 켜고 &quot;PDF로 저장&quot;을 선택하세요.
        </div>
        <div className="bulletin-toolbar-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            인쇄 · PDF 저장
          </button>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="bulletin-print-root">
        {/* 종이 바깥면: [면4 뒷표지 | 면1 표지] */}
        <div className="bulletin-sheet-wrap">
          <div className="bulletin-sheet">
            <div className="bulletin-face">{newsVolunteers}</div>
            <div className="bulletin-fold" />
            <div className="bulletin-face">{front}</div>
          </div>
        </div>
        {/* 종이 안쪽면: [면2 | 면3] */}
        <div className="bulletin-sheet-wrap">
          <div className="bulletin-sheet">
            <div className="bulletin-face">{order}</div>
            <div className="bulletin-fold" />
            <div className="bulletin-face">{worshipStaff}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SectionHead({ title, eng }: { title: string; eng?: string }) {
  return (
    <div className="bf-sec">
      <span className="bf-sec-bar" />
      <span className="bf-sec-text">
        <span className="bf-sec-title">{title}</span>
        {eng && <span className="bf-sec-eng">{eng}</span>}
      </span>
    </div>
  );
}

function PageWatermark() {
  return (
    <svg className="bf-wm" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <rect x="44" y="8" width="12" height="84" rx="2" />
      <rect x="18" y="34" width="64" height="12" rx="2" />
    </svg>
  );
}

function PageFooter({ church }: { church: Church }) {
  return <div className="bf-foot">{church.name}</div>;
}

function BulletinPageFront({ church, draft }: { church: Church; draft: Draft }) {
  return (
    <div className="bf bf-cover" style={{ backgroundImage: `url("${COVER_BG_URL}")` }}>
      <div className="bf-cover-card">
        {draft.issueNo && <div className="bf-cover-issue">{draft.issueNo}</div>}
        <div className="bf-cover-title">
          {church.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bf-cover-logo" src={church.logoUrl} alt="" />
          )}
          <div className="bf-cover-titletext">
            <h1 className="bf-church-name">{church.name}</h1>
            {church.eng && <div className="bf-church-eng">{church.eng}</div>}
          </div>
        </div>
        {church.tagline && <div className="bf-cover-tagline">{church.tagline}</div>}
        {draft.serviceDate && <div className="bf-date">{draft.serviceDate}</div>}
        {(draft.coverVerse || draft.coverVerseRef) && (
          <>
            <div className="bf-cover-divider" />
            <div className="bf-cover-verse">
              {draft.coverVerse && <div className="bf-cover-verse-text">{draft.coverVerse}</div>}
              {draft.coverVerseRef && <div className="bf-cover-verse-ref">— {draft.coverVerseRef}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BulletinPageOrder({ church, draft }: { church: Church; draft: Draft }) {
  return (
    <div className="bf">
      <PageWatermark />
      <div className="bf-block">
        <SectionHead title="예배 순서" eng="Order of Worship" />
        {draft.worshipOrder.length === 0 ? (
          <p className="bf-empty">예배 순서가 입력되지 않았습니다.</p>
        ) : (
          <table className="bf-order">
            <thead>
              <tr className="bf-hd">
                <td className="bf-order-c1">순서</td>
                <td className="bf-order-c2">찬송·본문</td>
                <td className="bf-order-c3">인도자</td>
              </tr>
            </thead>
            <tbody>
              {draft.worshipOrder.map((o, i) => (
                <tr key={i}>
                  <td className="bf-order-c1">{o.item}</td>
                  <td className="bf-order-c2">{o.detail}</td>
                  <td className="bf-order-c3">{o.leader}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bf-block">
        <SectionHead title="봉사위원" eng="Volunteers" />
        {draft.volunteers.length === 0 ? (
          <p className="bf-empty">봉사위원이 입력되지 않았습니다.</p>
        ) : (
          <table className="bf-vol">
            <tbody>
              {draft.volunteers.map((v, i) => (
                <tr key={i}>
                  <td className="bf-vol-k">{v.key}</td>
                  <td className="bf-vol-v">{v.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PageFooter church={church} />
    </div>
  );
}

function BulletinPageWorshipStaff({ church, draft }: { church: Church; draft: Draft }) {
  return (
    <div className="bf">
      <PageWatermark />
      <div className="bf-block">
        <SectionHead title="예배 시간" eng="Worship" />
        {draft.worshipServices.length === 0 ? (
          <p className="bf-empty">예배 시간이 입력되지 않았습니다.</p>
        ) : (
          <table className="bf-kv">
            <thead>
              <tr className="bf-hd">
                <td>예배</td>
                <td className="bf-kv-v">시간</td>
              </tr>
            </thead>
            <tbody>
              {draft.worshipServices.map((s, i) => (
                <tr key={i}>
                  <td className="bf-kv-k">{s.name}</td>
                  <td className="bf-kv-v">
                    {s.time}
                    {s.meta ? <span className="bf-kv-meta"> · {s.meta}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bf-block">
        <SectionHead title="섬기는 분들" eng="Our Team" />
        {draft.staff.length === 0 ? (
          <p className="bf-empty">섬기는 분들이 입력되지 않았습니다.</p>
        ) : (
          <table className="bf-kv">
            <thead>
              <tr className="bf-hd">
                <td>섬기는 이</td>
                <td className="bf-kv-v">담당</td>
              </tr>
            </thead>
            <tbody>
              {draft.staff.map((s, i) => (
                <tr key={i}>
                  <td className="bf-kv-k">{[s.role, s.name].filter(Boolean).join(" ")}</td>
                  <td className="bf-kv-v">{s.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PageFooter church={church} />
    </div>
  );
}

function BulletinPageNewsVolunteers({ church, draft, qrDataUrl }: { church: Church; draft: Draft; qrDataUrl: string }) {
  const url = `${church.slug}.${ROOT_DOMAIN}`;
  return (
    <div className="bf">
      <PageWatermark />
      <div className="bf-block">
        <SectionHead title="교회 소식" eng="Church News" />
        {draft.news.length === 0 ? (
          <p className="bf-empty">교회 소식이 입력되지 않았습니다.</p>
        ) : (
          <ul className="bf-news">
            {draft.news.map((n, i) => (
              <li key={i}>
                <div className="bf-news-title">{n.title}</div>
                {n.content && <div className="bf-news-body">{n.content}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bf-info">
        {draft.locationImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bf-info-loc" src={draft.locationImageUrl} alt="교회 위치" />
        )}
        <div className="bf-info-text">
          <div className="bf-info-title">오시는 길 · 연락처</div>
          {church.address && <div>{church.address}</div>}
          {church.phone && <div>Tel. {church.phone}</div>}
          {church.email && <div>{church.email}</div>}
          <div>{url}</div>
        </div>
        {qrDataUrl && (
          <div className="bf-info-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="홈페이지 QR" />
            <span>홈페이지</span>
          </div>
        )}
      </div>
    </div>
  );
}

const BULLETIN_CSS = `
.bulletin-portal {
  --accent: #57818c; --accent-weak: rgba(87,129,140,.13); --accent-faint: rgba(87,129,140,.06);
  position: fixed; inset: 0; z-index: 9999;
  background: #5b5e66; overflow: auto;
  display: flex; flex-direction: column; align-items: center;
}
.bulletin-toolbar {
  position: sticky; top: 0; z-index: 2;
  width: 100%; box-sizing: border-box;
  display: flex; align-items: center; gap: 16px;
  padding: 12px 20px; background: #1c1d21; color: #fff;
}
.bulletin-toolbar-info { font-size: 13px; line-height: 1.5; opacity: .9; }
.bulletin-toolbar-actions { margin-left: auto; display: flex; gap: 8px; flex-shrink: 0; }

.bulletin-print-root {
  display: flex; flex-direction: column; align-items: center; gap: 22px;
  padding: 26px 12px 60px;
}
/* 화면 미리보기: 래퍼를 축소된 크기로 잡고 시트를 scale → 레이아웃 깨짐 없음 */
.bulletin-sheet-wrap {
  width: 184.14mm; height: 130.2mm; overflow: hidden; flex-shrink: 0;
  background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
.bulletin-sheet {
  width: 297mm; height: 210mm; flex-shrink: 0;
  display: flex; background: #fff;
  transform: scale(0.62); transform-origin: top left;
}
.bulletin-fold {
  width: 0; border-left: 1px dashed #c9ccd2; flex-shrink: 0;
}
.bulletin-face {
  width: 148.5mm; height: 210mm; box-sizing: border-box;
  padding: 12mm 11mm; overflow: hidden; position: relative;
  font-family: var(--font-inter-tight), "Pretendard", system-ui, sans-serif;
  color: #1c1d21;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

/* 면 공통 */
.bf { width: 100%; height: 100%; display: flex; flex-direction: column; }
.bf-block { margin-bottom: 7mm; }
.bf-sec { display: flex; align-items: stretch; gap: 3mm; margin: 0 0 3.5mm; }
.bf-sec-bar { width: 1.6mm; background: var(--accent); border-radius: 1mm; flex-shrink: 0; }
.bf-sec-text { display: flex; flex-direction: column; justify-content: center; }
.bf-sec-title { font-size: 14pt; font-weight: 800; color: #1c1d21; letter-spacing: -.01em; line-height: 1.1; }
.bf-sec-eng { font-size: 7.5pt; letter-spacing: .22em; color: var(--accent); text-transform: uppercase; font-weight: 600; margin-top: .5mm; }
.bf-foot { margin-top: auto; padding-top: 3mm; border-top: 1px solid var(--accent-weak); text-align: center; font-size: 7.5pt; letter-spacing: .18em; color: var(--accent); font-weight: 600; }
.bf-wm { position: absolute; right: 5mm; bottom: 8mm; width: 42mm; height: 42mm; color: var(--accent); opacity: .05; pointer-events: none; }
/* 표 헤더행 + 줄무늬 */
.bf-order thead .bf-hd td, .bf-kv thead .bf-hd td {
  background: var(--accent); color: #fff; font-weight: 700; font-size: 8.5pt;
  letter-spacing: .03em; padding: 1.8mm 1.5mm; border-bottom: none;
}
.bf-order tbody tr:nth-child(even) td, .bf-kv tbody tr:nth-child(even) td { background: var(--accent-faint); }
.bf-empty { color: #aaadb4; font-size: 10pt; }

/* 표지 */
/* 표지(1면) — 배경 이미지 풀블리드 + 어두운 오버레이 위 가운데 흰 카드 */
.bf-cover {
  position: absolute; inset: 0; padding: 0;
  background-size: cover; background-position: center; background-repeat: no-repeat;
  background-color: #1c1d21; color: #1c1d21;
  display: flex; align-items: center; justify-content: center;
}
.bf-cover::before { content: ""; position: absolute; inset: 0; background: rgba(16,17,21,.34); }
.bf-cover-card {
  position: relative; z-index: 1; width: 112mm; max-width: 82%;
  background: #fff; border-radius: 4mm; padding: 13mm 11mm;
  border-top: 2.2mm solid var(--accent);
  display: flex; flex-direction: column; align-items: center; gap: 3.5mm; text-align: center;
  box-shadow: 0 4mm 14mm rgba(0,0,0,.30);
}
.bf-cover-issue { font-size: 8.5pt; font-weight: 600; letter-spacing: .12em; color: var(--accent); }
.bf-cover-title { display: flex; align-items: center; justify-content: center; gap: 4mm; }
.bf-cover-logo { width: 16mm; height: 16mm; object-fit: contain; flex-shrink: 0; }
.bf-cover-titletext { text-align: left; }
.bf-church-name { font-size: 21pt; font-weight: 800; margin: 0; letter-spacing: -.02em; color: #1c1d21; line-height: 1.12; }
.bf-church-eng { font-size: 8pt; letter-spacing: .2em; color: #8a8d94; text-transform: uppercase; margin-top: 1mm; }
.bf-cover-tagline { font-size: 9.5pt; color: #4a4d54; line-height: 1.45; }
.bf-date {
  font-size: 10.5pt; font-weight: 600; color: #fff; background: var(--accent);
  border: 1px solid var(--accent); border-radius: 999px; padding: 1.4mm 6mm;
}
.bf-cover-divider { width: 18mm; height: 1.2px; background: var(--accent); margin: 1mm 0; }
.bf-cover-verse { text-align: center; }
.bf-cover-verse-text { font-size: 10.5pt; line-height: 1.6; color: #2f3137; font-weight: 500; white-space: pre-wrap; }
.bf-cover-verse-ref { margin-top: 2mm; font-size: 8.5pt; color: var(--accent); font-weight: 600; }
/* 예배 순서 (3컬럼: 순서 | 찬송·본문 | 인도자) */
.bf-order { width: 100%; border-collapse: collapse; margin-top: 2mm; }
.bf-order td { padding: 2mm 1.5mm; font-size: 10.5pt; vertical-align: top; border-bottom: 1px solid var(--accent-weak); }
.bf-order-c1 { font-weight: 600; color: #1c1d21; width: 40%; }
.bf-order-c2 { color: #4a4d54; text-align: center; }
.bf-order-c3 { color: #4a4d54; text-align: right; width: 26%; white-space: nowrap; }

/* key-value 표 (예배시간/섬기는분들) */
.bf-kv { width: 100%; border-collapse: collapse; }
.bf-kv td { padding: 1.6mm 0; font-size: 10pt; vertical-align: top; border-bottom: 1px solid var(--accent-weak); }
.bf-kv-k { font-weight: 600; width: 45%; }
.bf-kv-v { text-align: right; color: #4a4d54; }
.bf-kv-meta { color: #8a8d94; }

/* 소식 */
.bf-news { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2.5mm; }
.bf-news li { border-left: 1.6mm solid var(--accent); background: var(--accent-faint); border-radius: 0 1.5mm 1.5mm 0; padding: 2mm 3mm; }
.bf-news-title { font-weight: 700; font-size: 10pt; color: #1c1d21; }
.bf-news-body { font-size: 9pt; color: #4a4d54; line-height: 1.5; margin-top: .5mm; white-space: pre-wrap; }

/* 봉사위원 표 */
.bf-vol { width: 100%; border-collapse: collapse; }
.bf-vol td { padding: 1.8mm 2mm; font-size: 10pt; border: 1px solid var(--accent-weak); }
.bf-vol-k { font-weight: 600; width: 38%; background: var(--accent-weak); color: var(--accent); }

/* 4면 하단 — 오시는 길/연락처/위치이미지/QR */
.bf-info { margin-top: auto; border-top: 1px solid #e3e5e9; padding-top: 3mm; display: flex; gap: 3.5mm; align-items: center; }
.bf-info-loc { width: 30mm; height: 22mm; object-fit: cover; border-radius: 1.5mm; border: 1px solid #e3e5e9; flex-shrink: 0; }
.bf-info-text { flex: 1; font-size: 8pt; line-height: 1.6; color: #4a4d54; }
.bf-info-title { font-size: 9pt; font-weight: 700; color: var(--accent); margin-bottom: 1mm; }
.bf-info-qr { display: flex; flex-direction: column; align-items: center; gap: .5mm; flex-shrink: 0; }
.bf-info-qr img { width: 19mm; height: 19mm; }
.bf-info-qr span { font-size: 6.5pt; color: #8a8d94; }

/* 모바일 화면 미리보기: 시트 전체를 더 축소해 가로 폭 안에 맞춤 */
@media screen and (max-width: 640px) {
  .bulletin-toolbar { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .bulletin-toolbar-info { flex: 1 1 100%; order: 2; font-size: 11.5px; }
  .bulletin-toolbar-actions { margin-left: auto; }
  .bulletin-print-root { padding: 16px 10px 48px; gap: 16px; }
  .bulletin-sheet-wrap { width: 124.74mm; height: 88.2mm; }
  .bulletin-sheet { transform: scale(0.42); }
}
@media screen and (max-width: 430px) {
  .bulletin-sheet-wrap { width: 89.1mm; height: 63mm; }
  .bulletin-sheet { transform: scale(0.30); }
}

@media print {
  .bulletin-portal { position: static; background: #fff; overflow: visible; display: block; }
  .bulletin-toolbar { display: none; }
  .bulletin-print-root { display: block; padding: 0; gap: 0; }
  .bulletin-sheet-wrap {
    width: auto; height: auto; overflow: visible; box-shadow: none;
    page-break-after: always; break-after: page;
  }
  .bulletin-sheet-wrap:last-child { page-break-after: auto; break-after: auto; }
  .bulletin-sheet { transform: none; margin: 0; box-shadow: none; }
  .bulletin-fold { border-left: none; }
  /* 인쇄 시 주보 외 화면 요소 숨김 */
  body > *:not(.bulletin-portal) { display: none !important; }
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #fff; }
}
`;
