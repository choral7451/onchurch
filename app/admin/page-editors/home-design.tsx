"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { HOME_SECTION_LABELS, type HomeSectionKey } from "@/lib/home-sections";
import {
  SECTION_DESIGN_IDS,
  SITE_COLOR_PRESETS,
  baseSectionDesign,
  encodeDesignPreview,
  mixedSectionOrder,
  normalizeSiteDesign,
  sectionDesignLabel,
  type SectionDesignId,
  type SiteDesign,
  type SiteDesignColors,
} from "@/lib/site-design";

// 홈 '디자인' 편집기 — 섹션별 디자인(기본/모던) + 순서 + 메인·포인트 색을 초안으로 모았다가 한 번에 적용한다.
// 적용 전까지는 공개 홈에 반영되지 않고, 오른쪽 미리보기(?design= 쿼리)에만 보인다.
// 테스트 교회(isTest)에만 노출되는 화면. 기존 교회는 site-template.tsx + home-order.tsx 를 그대로 쓴다.

type Draft = {
  colors: SiteDesignColors | null;
  sections: Partial<Record<HomeSectionKey, SectionDesignId>>;
  order: HomeSectionKey[];
};

type Props = {
  // 공개 홈 주소(미리보기 iframe 의 바탕). 관리자 앱의 buildPreviewUrl 결과.
  previewUrl: string;
  siteTemplate: string;
  saved: SiteDesign | null;
  savedOrder: HomeSectionKey[];
  // 켜진 페이지 기준으로 실제 노출 가능한 섹션.
  activeKeys: HomeSectionKey[];
  saving: boolean;
  onApply: (design: SiteDesign | null, order: HomeSectionKey[]) => Promise<void>;
};

function draftFrom(saved: SiteDesign | null, order: HomeSectionKey[]): Draft {
  return { colors: saved?.colors ?? null, sections: { ...(saved?.sections ?? {}) }, order: mixedSectionOrder(order) };
}

function toDesign(d: Draft): SiteDesign | null {
  return normalizeSiteDesign({ colors: d.colors, sections: d.sections });
}

export function HomeDesignEditor({ previewUrl, siteTemplate, saved, savedOrder, activeKeys, saving, onApply }: Props) {
  const savedKey = JSON.stringify([saved, savedOrder]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(saved, savedOrder));
  // 서버 값이 바뀌면(적용 완료·재조회) 초안을 그 값으로 다시 맞춘다(렌더 중 파생 상태 갱신 패턴).
  const [seenSavedKey, setSeenSavedKey] = useState(savedKey);
  if (seenSavedKey !== savedKey) {
    setSeenSavedKey(savedKey);
    setDraft(draftFrom(saved, savedOrder));
  }

  const [device, setDevice] = useState<"pc" | "mobile">("pc");
  const [previewSrc, setPreviewSrc] = useState("");
  // PC 미리보기: 미리보기 칸이 좁아도 공개 홈이 모바일 레이아웃으로 바뀌지 않도록
  // iframe 을 데스크톱 폭(PC_WIDTH)으로 그린 뒤 칸 너비에 맞게 축소한다.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameBox, setFrameBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setFrameBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const PC_WIDTH = 1280;
  const pcScale = frameBox.w > 0 ? Math.min(1, frameBox.w / PC_WIDTH) : 1;
  const base = baseSectionDesign(siteTemplate);
  const activeSet = new Set(activeKeys);
  const visible = draft.order.filter((k) => activeSet.has(k));

  // 변경 개수: 색 / 순서 / 섹션별 디자인.
  const dirty = useMemo(() => {
    const savedDraft = draftFrom(saved, savedOrder);
    let n = 0;
    if (JSON.stringify(draft.colors) !== JSON.stringify(savedDraft.colors)) n++;
    if (draft.order.join() !== savedDraft.order.join()) n++;
    const keys = new Set([...Object.keys(draft.sections), ...Object.keys(savedDraft.sections)]) as Set<HomeSectionKey>;
    for (const k of keys) {
      if ((draft.sections[k] ?? base) !== (savedDraft.sections[k] ?? base)) n++;
    }
    return n;
  }, [draft, saved, savedOrder, base]);

  // 미리보기는 초안을 쿼리로 넘겨 저장 없이 렌더한다. 색 드래그 중 과도한 새로고침을 막기 위해 잠깐 기다린다.
  useEffect(() => {
    if (!previewUrl) return;
    const t = window.setTimeout(() => {
      const q = encodeDesignPreview({ colors: draft.colors, sections: draft.sections, order: draft.order });
      setPreviewSrc(`${previewUrl}${previewUrl.includes("?") ? "&" : "?"}design=${q}`);
    }, 350);
    return () => window.clearTimeout(t);
  }, [draft, previewUrl]);

  const { getItemProps } = useDragSort(visible.length, (from, to) => {
    if (from === to) return;
    const next = visible.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // 비활성 섹션의 절대 위치는 유지하고, 활성 슬롯에만 새 순서를 채워 넣는다(home-order.tsx 와 같은 규칙).
    let i = 0;
    setDraft((d) => ({ ...d, order: d.order.map((k) => (activeSet.has(k) ? next[i++] : k)) }));
  });

  function setSection(key: HomeSectionKey, id: SectionDesignId) {
    setDraft((d) => {
      const sections = { ...d.sections };
      // 템플릿 기본값과 같으면 굳이 저장하지 않는다(폴백).
      if (id === base) delete sections[key];
      else sections[key] = id;
      return { ...d, sections };
    });
  }

  function setColors(colors: SiteDesignColors | null) {
    setDraft((d) => ({ ...d, colors }));
  }

  // 색상 모달: 고르는 동안은 모달 안의 임시값(pending)만 바꾸고, '선택 완료'에서 초안에 반영한다.
  const [colorModal, setColorModal] = useState(false);
  const [pending, setPending] = useState<SiteDesignColors | null>(null);
  const [hexText, setHexText] = useState({ main: "", point: "" });
  const DEFAULT_COLORS: SiteDesignColors = { main: SITE_COLOR_PRESETS[0].main, point: SITE_COLOR_PRESETS[0].point };

  function pickPending(colors: SiteDesignColors | null) {
    setPending(colors);
    setHexText({ main: colors?.main ?? "", point: colors?.point ?? "" });
  }
  function openColorModal() {
    pickPending(draft.colors);
    setColorModal(true);
  }
  function setPendingPart(part: "main" | "point", value: string) {
    pickPending({ ...(pending ?? DEFAULT_COLORS), [part]: value.toLowerCase() });
  }
  // 직접 입력: 입력 중인 글자는 그대로 두고, #RRGGBB 형식이 완성되면 색에 반영한다.
  function onHexInput(part: "main" | "point", raw: string) {
    const v = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
    setHexText((t) => ({ ...t, [part]: v }));
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setPending({ ...(pending ?? DEFAULT_COLORS), [part]: v.toLowerCase() });
  }
  useEffect(() => {
    if (!colorModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setColorModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [colorModal]);

  const sameColors = (a: SiteDesignColors | null, p: { main: string; point: string }) => !!a && a.main === p.main && a.point === p.point;
  const currentColorLabel = !draft.colors
    ? "템플릿 기본색"
    : SITE_COLOR_PRESETS.find((p) => sameColors(draft.colors, p))?.label ?? "직접 고른 색";

  return (
    <>
      <div className={`admin-design-draftbar ${dirty === 0 ? "clean" : ""}`} role="status">
        <span style={{ flex: 1, minWidth: 0 }}>
          {dirty === 0
            ? "홈페이지와 같습니다. 바꾸면 여기에 초안으로 모였다가 한 번에 적용됩니다."
            : <>저장되지 않은 변경 <strong>{dirty}</strong>개. 적용하기 전까지는 교인들에게 보이지 않습니다.</>}
        </span>
        <button type="button" className="btn btn-secondary" disabled={dirty === 0 || saving} onClick={() => setDraft(draftFrom(saved, savedOrder))}>
          되돌리기
        </button>
        <button type="button" className="btn btn-primary" disabled={dirty === 0 || saving} onClick={() => void onApply(toDesign(draft), draft.order)}>
          {saving ? "적용 중…" : "홈페이지에 적용"}
        </button>
      </div>

      {colorModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="design-color-title" onClick={() => setColorModal(false)}>
          <div className="admin-modal admin-color-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title" id="design-color-title">교회 색상 고르기</h3>

            <div className="admin-color-modal-preview" style={pending ? { background: pending.main } : undefined}>
              <span>{pending ? "제목과 배경에 쓰이는 메인 색" : "템플릿 기본색을 사용합니다"}</span>
              {pending && <b style={{ background: pending.point }}>포인트 버튼</b>}
            </div>

            <div className="admin-color-modal-label">추천 색조합</div>
            <div className="admin-design-presets">
              <button type="button" className={`admin-template-card ${!pending ? "active" : ""}`} aria-pressed={!pending} onClick={() => pickPending(null)}>
                <span className="admin-template-name">템플릿 기본색</span>
                <span className="admin-template-desc">{siteTemplate === "modern" ? "모던" : "기본"} 템플릿의 원래 색</span>
              </button>
              {SITE_COLOR_PRESETS.map((p) => (
                <button key={p.id} type="button" className={`admin-template-card ${sameColors(pending, p) ? "active" : ""}`} aria-pressed={sameColors(pending, p)} onClick={() => pickPending({ main: p.main, point: p.point })}>
                  <span className="admin-template-swatches" style={{ marginTop: 0 }}>
                    <i className="admin-design-swatch" style={{ background: p.main }} aria-hidden="true" />
                    <i className="admin-design-swatch" style={{ background: p.point }} aria-hidden="true" />
                  </span>
                  <span className="admin-template-desc">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="admin-color-modal-label">색 상세 선택</div>
            <div className="admin-color-modal-custom">
              {(["main", "point"] as const).map((part) => (
                <div key={part} className="admin-color-modal-field">
                  <input type="color" aria-label={part === "main" ? "메인 색 고르기" : "포인트 색 고르기"} value={(pending ?? DEFAULT_COLORS)[part]} onChange={(e) => setPendingPart(part, e.target.value)} />
                  <div>
                    <label htmlFor={`design-hex-${part}`}>{part === "main" ? "메인" : "포인트"}</label>
                    <input id={`design-hex-${part}`} type="text" inputMode="text" maxLength={7} placeholder="#1f3a5f" spellCheck={false} value={hexText[part]} onChange={(e) => onHexInput(part, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <p className="form-hint" style={{ margin: "8px 0 20px" }}>메인은 제목·배경·버튼 전반에, 포인트는 강조 글자와 작은 버튼에 쓰입니다.</p>

            <div className="admin-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setColorModal(false)}>취소</button>
              <button type="button" className="btn btn-primary" onClick={() => { setColors(pending); setColorModal(false); }}>선택 완료</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-design-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-eyebrow">COLORS</div>
              <h2>교회 색상</h2>
              <p>홈페이지 전체에 쓰이는 메인·포인트 색입니다. 고르지 않으면 템플릿 기본색을 씁니다.</p>
            </div>
            <div className="admin-section-body">
              <div className="admin-design-colorbar">
                <span className="admin-design-colorbar-swatches" aria-hidden="true">
                  {draft.colors ? (
                    <>
                      <i className="admin-design-swatch" style={{ background: draft.colors.main }} />
                      <i className="admin-design-swatch" style={{ background: draft.colors.point }} />
                    </>
                  ) : (
                    <i className="admin-design-swatch admin-design-swatch-default" />
                  )}
                </span>
                <span className="admin-design-colorbar-text">
                  <strong>{currentColorLabel}</strong>
                  <small>{draft.colors ? `메인 ${draft.colors.main} · 포인트 ${draft.colors.point}` : `${siteTemplate === "modern" ? "모던" : "기본"} 템플릿의 원래 색`}</small>
                </span>
                <button type="button" className="btn btn-secondary" onClick={openColorModal}>색상 변경</button>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-eyebrow">SECTIONS</div>
              <h2>섹션별 디자인 · 순서</h2>
              <p>섹션마다 기본·모던 중 하나를 고르고, 드래그해서 순서를 바꿉니다. 사이드바에서 OFF 로 꺼둔 페이지의 섹션은 표시되지 않습니다.</p>
            </div>
            <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>활성화된 섹션이 없습니다. 좌측에서 페이지를 켜면 여기에 나타납니다.</p>
              ) : (
                visible.map((key, idx) => {
                  const meta = HOME_SECTION_LABELS[key];
                  const current = draft.sections[key] ?? base;
                  return (
                    <div key={key} className="admin-banner-card" {...getItemProps(idx)}>
                      <DragHandle />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--surface-2)", color: "var(--muted)", fontSize: 12, fontWeight: 600, display: "grid", placeItems: "center" }}>
                            {idx + 1}
                          </span>
                          <strong>{meta.title}</strong>
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>{meta.desc.replace(" (모던 템플릿 전용)", "")}</div>
                      </div>
                      <div className="admin-design-seg" role="group" aria-label={`${meta.title} 디자인`}>
                        {SECTION_DESIGN_IDS.map((id) => (
                          <button key={id} type="button" aria-pressed={current === id} onClick={() => setSection(key, id)}>
                            {sectionDesignLabel(key, id)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="admin-design-preview">
          <div className="admin-design-previewbar">
            <span>미리보기</span>
            <span className="admin-design-previewnote">초안 기준 · 저장 전</span>
            <div className="admin-design-seg" role="group" aria-label="미리보기 폭" style={{ marginLeft: "auto" }}>
              <button type="button" aria-pressed={device === "pc"} onClick={() => setDevice("pc")}>PC</button>
              <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>모바일</button>
            </div>
          </div>
          <div className={`admin-design-frame ${device}`} ref={frameRef}>
            {previewSrc ? (
              <iframe
                title="홈 미리보기"
                src={previewSrc}
                style={device === "pc" && frameBox.h > 0
                  ? { width: PC_WIDTH, height: frameBox.h / pcScale, transform: `scale(${pcScale})`, transformOrigin: "top left", maxWidth: "none" }
                  : undefined}
              />
            ) : (
              <div style={{ padding: 32, color: "var(--muted)", fontSize: 13 }}>교회를 먼저 저장하면 미리보기가 표시됩니다.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
