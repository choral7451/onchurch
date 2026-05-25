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
  onchurchWorshipOrder,
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
  worshipOrder: BulletinWorshipOrderItem[];
  worshipServices: BulletinWorshipServiceItem[];
  staff: BulletinStaffItem[];
  news: BulletinNewsItem[];
  volunteers: BulletinVolunteerItem[];
};

const EMPTY_DRAFT: Draft = {
  serviceDate: "",
  locationImageUrl: null,
  worshipOrder: [],
  worshipServices: [],
  staff: [],
  news: [],
  volunteers: [],
};

const ROOT_DOMAIN = "everychurch.co.kr";

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

  // 현재 사이트에 저장된 데이터로 예배순서·예배시간·섬기는분들·소식을 다시 채움
  async function fillFromSite({ silent = false }: { silent?: boolean } = {}) {
    if (!silent && !confirm("현재 사이트에 저장된 정보로 다시 불러올까요? 지금 입력한 내용은 덮어쓰여집니다.")) return;
    try {
      const [services, orders, staff, noticeRes] = await Promise.all([
        onchurchWorshipService.listMine().catch(() => []),
        onchurchWorshipOrder.listMine().catch(() => []),
        onchurchStaff.listMine().catch(() => []),
        onchurchNotice.listMine().catch(() => ({ notices: [] })),
      ]);
      setDraft((prev) => ({
        ...prev,
        worshipServices: services
          .filter((s) => s.isActive)
          .map((s) => ({ name: s.name, time: s.time, meta: s.meta })),
        worshipOrder: orders
          .filter((o) => o.isActive)
          .map((o) => ({ no: o.no, item: o.item, leader: o.leader })),
        staff: staff
          .filter((s) => s.isActive)
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
            표지의 <strong>로고·교회명·연락처·홈페이지 QR</strong>은 기본 정보에 저장된 값을 그대로 사용합니다.
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

        {/* 교회 위치 이미지 */}
        <FieldBlock title="교회 위치 이미지" hint="약도·지도 캡처 이미지를 첨부하면 표지에 표시됩니다.">
          <LocationImageField value={draft.locationImageUrl} onChange={(url) => setDraft({ ...draft, locationImageUrl: url })} />
        </FieldBlock>

        {/* 예배 순서 */}
        <ListBlock
          title="예배 순서"
          hint="순서·항목·맡은 분 (예: 1 · 묵도 · 다같이)"
          items={draft.worshipOrder}
          onChange={(next) => setDraft({ ...draft, worshipOrder: next })}
          empty={{ no: "", item: "", leader: "" }}
          columns={[
            { key: "no", label: "순서", placeholder: "1", width: 70 },
            { key: "item", label: "항목", placeholder: "묵도", flex: 1 },
            { key: "leader", label: "맡은 분", placeholder: "다같이", flex: 1 },
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

        {/* 다음주 봉사위원 */}
        <ListBlock
          title="다음주 봉사위원"
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

  const front = <BulletinPageFront church={church} draft={draft} qrDataUrl={qrDataUrl} />;
  const order = <BulletinPageOrder draft={draft} />;
  const worshipStaff = <BulletinPageWorshipStaff draft={draft} />;
  const newsVolunteers = <BulletinPageNewsVolunteers draft={draft} />;

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
        <div className="bulletin-sheet">
          <div className="bulletin-face">{newsVolunteers}</div>
          <div className="bulletin-fold" />
          <div className="bulletin-face">{front}</div>
        </div>
        {/* 종이 안쪽면: [면2 | 면3] */}
        <div className="bulletin-sheet">
          <div className="bulletin-face">{order}</div>
          <div className="bulletin-fold" />
          <div className="bulletin-face">{worshipStaff}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FaceHeader({ label }: { label: string }) {
  return <div className="bf-eyebrow">{label}</div>;
}

function BulletinPageFront({ church, draft, qrDataUrl }: { church: Church; draft: Draft; qrDataUrl: string }) {
  const url = `${church.slug}.${ROOT_DOMAIN}`;
  return (
    <div className="bf bf-cover">
      <div className="bf-cover-top">
        {church.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bf-logo" src={church.logoUrl} alt="" />
        )}
        <h1 className="bf-church-name">{church.name}</h1>
        {church.eng && <div className="bf-church-eng">{church.eng}</div>}
        {draft.serviceDate && <div className="bf-date">{draft.serviceDate}</div>}
      </div>

      {draft.locationImageUrl && (
        <div className="bf-loc">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.locationImageUrl} alt="교회 위치" />
        </div>
      )}

      <div className="bf-cover-bottom">
        <div className="bf-contact">
          {church.address && <div>{church.address}</div>}
          {church.phone && <div>Tel. {church.phone}</div>}
          {church.email && <div>{church.email}</div>}
        </div>
        <div className="bf-qr">
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="홈페이지 QR" />
          )}
          <div className="bf-qr-url">{url}</div>
        </div>
      </div>
    </div>
  );
}

function BulletinPageOrder({ draft }: { draft: Draft }) {
  return (
    <div className="bf">
      <FaceHeader label="예배 순서" />
      <h2 className="bf-title">예배 순서</h2>
      {draft.worshipOrder.length === 0 ? (
        <p className="bf-empty">예배 순서가 입력되지 않았습니다.</p>
      ) : (
        <table className="bf-order">
          <tbody>
            {draft.worshipOrder.map((o, i) => (
              <tr key={i}>
                <td className="bf-order-no">{o.no}</td>
                <td className="bf-order-item">{o.item}</td>
                <td className="bf-order-leader">{o.leader}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BulletinPageWorshipStaff({ draft }: { draft: Draft }) {
  return (
    <div className="bf">
      <FaceHeader label="예배 안내" />
      <h2 className="bf-title">예배 시간</h2>
      {draft.worshipServices.length === 0 ? (
        <p className="bf-empty">예배 시간이 입력되지 않았습니다.</p>
      ) : (
        <table className="bf-kv">
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

      <h2 className="bf-title" style={{ marginTop: "8mm" }}>
        섬기는 분들
      </h2>
      {draft.staff.length === 0 ? (
        <p className="bf-empty">섬기는 분들이 입력되지 않았습니다.</p>
      ) : (
        <table className="bf-kv">
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
  );
}

function BulletinPageNewsVolunteers({ draft }: { draft: Draft }) {
  return (
    <div className="bf">
      <FaceHeader label="소식 · 봉사" />
      <h2 className="bf-title">교회 소식</h2>
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

      <h2 className="bf-title" style={{ marginTop: "8mm" }}>
        다음주 봉사위원
      </h2>
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
  );
}

const BULLETIN_CSS = `
.bulletin-portal {
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
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  padding: 28px 12px 60px;
}
.bulletin-sheet {
  width: 297mm; height: 210mm; flex-shrink: 0;
  display: flex; background: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  /* 화면 미리보기에서 A4가 크므로 축소 */
  transform: scale(0.66); transform-origin: top center;
  margin-bottom: -68mm; /* scale로 생긴 빈 공간 보정 */
}
.bulletin-fold {
  width: 0; border-left: 1px dashed #c9ccd2; flex-shrink: 0;
}
.bulletin-face {
  width: 148.5mm; height: 210mm; box-sizing: border-box;
  padding: 12mm 11mm; overflow: hidden;
  font-family: var(--font-inter-tight), "Pretendard", system-ui, sans-serif;
  color: #1c1d21;
}

/* 면 공통 */
.bf { width: 100%; height: 100%; display: flex; flex-direction: column; }
.bf-eyebrow {
  font-size: 9pt; letter-spacing: .18em; color: #8a8d94;
  text-transform: uppercase; margin-bottom: 4mm;
  border-bottom: 1px solid #e3e5e9; padding-bottom: 2mm;
}
.bf-title { font-size: 15pt; font-weight: 700; margin: 0 0 4mm; letter-spacing: -.01em; }
.bf-empty { color: #aaadb4; font-size: 10pt; }

/* 표지 */
.bf-cover { justify-content: space-between; text-align: center; }
.bf-cover-top { display: flex; flex-direction: column; align-items: center; gap: 2mm; padding-top: 6mm; }
.bf-logo { width: 26mm; height: 26mm; object-fit: contain; margin-bottom: 2mm; }
.bf-church-name { font-size: 22pt; font-weight: 800; margin: 0; letter-spacing: -.02em; }
.bf-church-eng { font-size: 9pt; letter-spacing: .22em; color: #8a8d94; text-transform: uppercase; }
.bf-date { margin-top: 4mm; font-size: 12pt; font-weight: 600; color: #2f3137;
  border: 1px solid #d7dade; border-radius: 999px; padding: 2mm 6mm; }
.bf-loc { margin: 5mm 0; }
.bf-loc img { width: 100%; max-height: 70mm; object-fit: cover; border-radius: 2mm; border: 1px solid #e3e5e9; }
.bf-cover-bottom { border-top: 1px solid #e3e5e9; padding-top: 4mm; display: flex; gap: 5mm; align-items: center; text-align: left; }
.bf-contact { flex: 1; font-size: 9pt; line-height: 1.7; color: #4a4d54; }
.bf-qr { display: flex; flex-direction: column; align-items: center; gap: 1mm; flex-shrink: 0; }
.bf-qr img { width: 24mm; height: 24mm; }
.bf-qr-url { font-size: 7pt; color: #8a8d94; }

/* 예배 순서 */
.bf-order { width: 100%; border-collapse: collapse; }
.bf-order td { padding: 1.8mm 0; font-size: 10.5pt; vertical-align: top; border-bottom: 1px dotted #e3e5e9; }
.bf-order-no { width: 10mm; color: #8a8d94; font-variant-numeric: tabular-nums; }
.bf-order-item { font-weight: 600; }
.bf-order-leader { text-align: right; color: #4a4d54; font-size: 9.5pt; }

/* key-value 표 (예배시간/섬기는분들) */
.bf-kv { width: 100%; border-collapse: collapse; }
.bf-kv td { padding: 1.6mm 0; font-size: 10pt; vertical-align: top; border-bottom: 1px dotted #e3e5e9; }
.bf-kv-k { font-weight: 600; width: 45%; }
.bf-kv-v { text-align: right; color: #4a4d54; }
.bf-kv-meta { color: #8a8d94; }

/* 소식 */
.bf-news { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3mm; }
.bf-news-title { font-weight: 600; font-size: 10.5pt; }
.bf-news-title::before { content: "• "; color: #8a8d94; }
.bf-news-body { font-size: 9.5pt; color: #4a4d54; line-height: 1.5; margin-top: .5mm; white-space: pre-wrap; }

/* 봉사위원 표 */
.bf-vol { width: 100%; border-collapse: collapse; }
.bf-vol td { padding: 1.8mm 2mm; font-size: 10pt; border: 1px solid #e3e5e9; }
.bf-vol-k { font-weight: 600; width: 38%; background: #f6f7f9; }

@media print {
  .bulletin-portal { position: static; background: #fff; overflow: visible; display: block; }
  .bulletin-toolbar { display: none; }
  .bulletin-print-root { display: block; padding: 0; gap: 0; }
  .bulletin-sheet {
    transform: none; margin: 0; box-shadow: none;
    page-break-after: always; break-after: page;
  }
  .bulletin-sheet:last-child { page-break-after: auto; break-after: auto; }
  .bulletin-fold { border-left: none; }
  /* 인쇄 시 주보 외 화면 요소 숨김 */
  body > *:not(.bulletin-portal) { display: none !important; }
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #fff; }
}
`;
