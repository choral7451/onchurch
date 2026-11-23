"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import { HOME_SECTION_LABELS, type HomeSectionKey } from "@/lib/home-sections";
import {
  SECTION_DESIGN_IDS,
  SITE_COLOR_PRESETS,
  SITE_COLOR_TONE_LABELS,
  type SiteColorTone,
  baseSectionDesign,
  encodeDesignPreview,
  mixedSectionOrder,
  normalizeSiteDesign,
  sectionDesignLabel,
  type SectionDesignId,
  type SiteDesign,
  type SiteDesignColors,
  type DesignPreviewSite,
} from "@/lib/site-design";

// 홈 '디자인' 편집기 — 섹션별 디자인(기본/모던) + 순서 + 메인·포인트 색을 초안으로 모았다가 한 번에 적용한다.
// 적용 전까지는 공개 홈에 반영되지 않고, 오른쪽 미리보기(?design= 쿼리)에만 보인다.
// 모든 교회의 관리자 '디자인' 화면 (2026-11-23 전체 적용).

type Draft = {
  colors: SiteDesignColors | null;
  sections: Partial<Record<HomeSectionKey, SectionDesignId>>;
  order: HomeSectionKey[];
};

type Toggle = { on: boolean; toggle: () => void };

type Props = {
  // 공개 홈 주소(미리보기 iframe 의 바탕). 관리자 앱의 buildPreviewUrl 결과.
  previewUrl: string;
  siteTemplate: string;
  saved: SiteDesign | null;
  savedOrder: HomeSectionKey[];
  // 홈 섹션별 줄 이름, '홈에 표시' 토글, 짝을 이루는 메뉴(페이지) 토글. 배너·빠른 이동처럼 메뉴가 없는 섹션은 menu 가 없다.
  pages: Partial<Record<HomeSectionKey, { label: string; home: Toggle; menu?: Toggle & { label: string } }>>;
  // 홈 섹션이 없는 메뉴(교제·자유 페이지). 목록 아래에 켜고 끄기만 있는 줄로 붙는다.
  menuOnly: { key: string; label: string; on: boolean; toggle: () => void }[];
  saving: boolean;
  onApply: (design: SiteDesign | null, order: HomeSectionKey[]) => Promise<void>;
  // 색상 카드와 메뉴 · 홈 구성 카드 사이에 넣는 카드(로고).
  afterSlot?: React.ReactNode;
  // 값이 바뀌면 미리보기를 다시 불러온다(메뉴 구성처럼 바로 저장되는 변경을 미리보기에 반영).
  refreshKey?: number;
  // 이 편집기 밖에서 관리하는 초안(로고). 변경 개수에 더하고, 되돌리기·미리보기에 함께 반영한다.
  extraDirty?: number;
  onRevertExtra?: () => void;
  previewLogo?: string | null;
  // 상세 설정이 있는 섹션(예: 빠른 이동). 해당 줄에 '설정' 버튼을 보여주고 누르면 알려준다.
  settingsKeys?: HomeSectionKey[];
  onSectionSettings?: (key: HomeSectionKey) => void;
  // 이 편집기 밖에서 모으는 메뉴 초안(켜진 페이지·빠른 이동·자유 페이지 공개). 미리보기에 함께 넘긴다.
  previewSite?: DesignPreviewSite;
};

function draftFrom(saved: SiteDesign | null, order: HomeSectionKey[]): Draft {
  return { colors: saved?.colors ?? null, sections: { ...(saved?.sections ?? {}) }, order: mixedSectionOrder(order) };
}

function toDesign(d: Draft): SiteDesign | null {
  return normalizeSiteDesign({ colors: d.colors, sections: d.sections });
}

export function HomeDesignEditor({ previewUrl, siteTemplate, saved, savedOrder, pages, menuOnly, saving, onApply, afterSlot, refreshKey = 0, extraDirty = 0, onRevertExtra, previewLogo = null, settingsKeys, onSectionSettings, previewSite }: Props) {
  const savedKey = JSON.stringify([saved, savedOrder]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(saved, savedOrder));
  // 서버 값이 바뀌면(적용 완료·재조회) 초안을 그 값으로 다시 맞춘다(렌더 중 파생 상태 갱신 패턴).
  const [seenSavedKey, setSeenSavedKey] = useState(savedKey);
  if (seenSavedKey !== savedKey) {
    setSeenSavedKey(savedKey);
    setDraft(draftFrom(saved, savedOrder));
  }

  const [device, setDevice] = useState<"pc" | "mobile">("pc");
  // 펼친 줄 — 디자인·메뉴 표시·상세 설정은 줄을 눌러 펼쳤을 때만 보여 한 줄을 단순하게 둔다.
  const [openKey, setOpenKey] = useState<HomeSectionKey | null>(null);
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
  // 꺼진 메뉴의 섹션도 목록에서 빼지 않고 흐리게 남긴다(다시 켜도 순서가 유지된다).
  const visible = draft.order;

  // 변경 개수: 색 / 순서 / 섹션별 디자인.
  const ownDirty = useMemo(() => {
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
  const dirty = ownDirty + extraDirty;

  // 미리보기는 초안을 쿼리로 넘겨 저장 없이 렌더한다. 색 드래그 중 과도한 새로고침을 막기 위해 잠깐 기다린다.
  // 처음 한 번만 iframe 주소로 불러오고, 그 뒤로는 불러온 미리보기에 메시지를 보내 새로고침 없이 갱신한다
  // (components/shell/nav.tsx 가 받아 쿼리만 바꾼다). 주소를 바꾸면 화면이 깜빡이고 스크롤 위치가 초기화되기 때문.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);
  // iframe 이 다 불러와지면 한 번 더 보내 로고 초안까지 맞춘다.
  const [loadedTick, setLoadedTick] = useState(0);
  const sentRefreshKey = useRef(refreshKey);
  const previewSiteKey = JSON.stringify(previewSite ?? null);
  useEffect(() => {
    if (!previewUrl) return;
    const t = window.setTimeout(() => {
      const site = JSON.parse(previewSiteKey) as DesignPreviewSite | null;
      const q = encodeDesignPreview({ colors: draft.colors, sections: draft.sections, order: draft.order, ...(site ? { site } : {}) });
      const win = iframeRef.current?.contentWindow;
      if (loadedRef.current && win) {
        let origin = window.location.origin;
        try { origin = new URL(previewUrl, window.location.href).origin; } catch { /* 상대 주소면 현재 출처 */ }
        win.postMessage({ type: "onchurch:design-preview", design: q, refresh: sentRefreshKey.current !== refreshKey, logo: previewLogo }, origin);
      } else {
        setPreviewSrc(`${previewUrl}${previewUrl.includes("?") ? "&" : "?"}design=${q}`);
      }
      sentRefreshKey.current = refreshKey;
    }, loadedRef.current ? 120 : 350);
    return () => window.clearTimeout(t);
  }, [draft, previewUrl, refreshKey, previewLogo, loadedTick, previewSiteKey]);

  const { getItemProps } = useDragSort(visible.length, (from, to) => {
    if (from === to) return;
    const next = visible.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft((d) => ({ ...d, order: next }));
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

  // 모든 섹션을 한 번에 같은 디자인으로 맞춘다. 템플릿 기본값과 같으면 저장할 값이 없으므로 비운다.
  function setAllSections(id: SectionDesignId) {
    setDraft((d) => ({ ...d, sections: id === base ? {} : Object.fromEntries(d.order.map((k) => [k, id])) }));
  }
  const allSame = (id: SectionDesignId) => draft.order.every((k) => (draft.sections[k] ?? base) === id);

  function setColors(colors: SiteDesignColors | null) {
    setDraft((d) => ({ ...d, colors }));
  }

  // 추천 색조합 모달: 조합을 고르면 바로 초안(미리보기)에 반영하고 닫는다. 상세 색은 카드의 메인·포인트 칸에서 바로 고른다.
  const [colorModal, setColorModal] = useState(false);
  // 색을 고르지 않았을 때 보여줄 템플릿의 실제 색(기본 템플릿 = navy, 모던 템플릿 = slate 프리셋과 같다).
  const TEMPLATE_PRESET = SITE_COLOR_PRESETS.find((p) => p.id === (siteTemplate === "modern" ? "slate" : "navy")) ?? SITE_COLOR_PRESETS[0];
  const DEFAULT_COLORS: SiteDesignColors = { main: TEMPLATE_PRESET.main, point: TEMPLATE_PRESET.point };
  function setColorPart(part: "main" | "point", value: string) {
    setDraft((d) => ({ ...d, colors: { ...(d.colors ?? DEFAULT_COLORS), [part]: value.toLowerCase() } }));
  }
  function pickPreset(colors: SiteDesignColors | null) {
    setColors(colors);
    setColorModal(false);
  }
  useEffect(() => {
    if (!colorModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setColorModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [colorModal]);

  const sameColors = (a: SiteDesignColors | null, p: { main: string; point: string }) => !!a && a.main === p.main && a.point === p.point;

  return (
    <>
      {/* 스크롤해도 항상 보이도록 '되돌리기 · 홈페이지에 적용'은 화면 오른쪽 아래에 고정한다. */}
      <div className={`admin-design-fab ${dirty === 0 ? "clean" : ""}`}>
        {dirty > 0 && (
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setDraft(draftFrom(saved, savedOrder)); onRevertExtra?.(); }}>
            되돌리기
          </button>
        )}
        <button type="button" className="btn btn-primary admin-design-fab-apply" disabled={dirty === 0 || saving} onClick={() => void onApply(toDesign(draft), draft.order)}>
          {saving ? "적용 중…" : dirty === 0 ? "✓ 적용 완료" : "홈페이지에 적용"}
          {dirty > 0 && !saving && <span className="admin-design-fab-count">{dirty}</span>}
        </button>
      </div>

      {colorModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="design-color-title" onClick={() => setColorModal(false)}>
          <div className="admin-modal admin-color-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-color-modal-head">
              <h3 className="admin-modal-title" id="design-color-title">추천 색조합</h3>
              <button type="button" className="admin-color-modal-close" aria-label="닫기" onClick={() => setColorModal(false)}>×</button>
            </div>
            <p className="form-hint" style={{ margin: "0 0 14px" }}>조합을 누르면 바로 미리보기에 적용됩니다. 왼쪽이 메인, 오른쪽이 포인트 색입니다.</p>
            <button type="button" className={`admin-template-card admin-color-modal-default ${!draft.colors ? "active" : ""}`} aria-pressed={!draft.colors} onClick={() => pickPreset(null)}>
              <span className="admin-template-name">템플릿 기본색</span>
              <span className="admin-template-desc">{siteTemplate === "modern" ? "모던" : "기본"} 템플릿의 원래 색</span>
            </button>
            {(Object.keys(SITE_COLOR_TONE_LABELS) as SiteColorTone[]).map((tone) => (
              <div key={tone} className="admin-color-modal-tone">
                <div className="admin-color-modal-tone-label">{SITE_COLOR_TONE_LABELS[tone]}</div>
                <div className="admin-design-presets">
                  {SITE_COLOR_PRESETS.filter((p) => p.tone === tone).map((p) => (
                    <button key={p.id} type="button" className={`admin-template-card ${sameColors(draft.colors, p) ? "active" : ""}`} aria-pressed={sameColors(draft.colors, p)} onClick={() => pickPreset({ main: p.main, point: p.point })}>
                      <span className="admin-color-modal-chip" aria-hidden="true">
                        <i style={{ background: p.main }} />
                        <i style={{ background: p.point }} />
                      </span>
                      <span className="admin-template-desc">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-design-layout">
        <div className="admin-design-side">
          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-eyebrow">COLORS</div>
              <h2>교회 색상</h2>
            </div>
            <div className="admin-section-body">
              <div className="admin-design-colorbar">
                {(["main", "point"] as const).map((part) => (
                  <label key={part} className="admin-design-colorpick" title={`${part === "main" ? "메인" : "포인트"} 색 고르기`}>
                    <input type="color" value={(draft.colors ?? DEFAULT_COLORS)[part]} onChange={(e) => setColorPart(part, e.target.value)} />
                    <span className="admin-design-colorpick-chip" style={{ background: (draft.colors ?? DEFAULT_COLORS)[part] }} aria-hidden="true" />
                    <span className="admin-design-colorpick-text">
                      <strong>{part === "main" ? "메인" : "포인트"}</strong>
                      <small>{(draft.colors ?? DEFAULT_COLORS)[part]}</small>
                    </span>
                  </label>
                ))}
                <button type="button" className="btn btn-secondary" onClick={() => setColorModal(true)}>추천</button>
              </div>
            </div>
          </section>

          {afterSlot}

          <section className="admin-section">
            <div className="admin-section-head">
              <div className="admin-section-eyebrow">MENU · HOME</div>
              <div className="admin-design-head-row">
                <h2>메뉴 · 홈 구성</h2>
                <div className="admin-design-all">
                  <span>전체</span>
                  <div className="admin-design-seg" role="group" aria-label="모든 섹션 디자인 한 번에 바꾸기">
                    {SECTION_DESIGN_IDS.map((id) => (
                      <button key={id} type="button" aria-pressed={allSame(id)} onClick={() => setAllSections(id)}>
                        {sectionDesignLabel("banner", id)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p>오른쪽 스위치로 홈에 보일지 정하고, 드래그해서 순서를 바꿔요. 줄을 누르면 디자인과 메뉴 표시를 바꿀 수 있어요.</p>
            </div>
            <div className="admin-section-body">
              <ol className="admin-design-rows">
                {visible.map((key, idx) => {
                  const meta = HOME_SECTION_LABELS[key];
                  const page = pages[key];
                  const label = page?.label ?? meta.title;
                  const homeOn = page?.home.on ?? true;
                  const menuOff = !!page?.menu && !page.menu.on;
                  // 메뉴(페이지)를 끄면 그 섹션도 홈에서 빠진다.
                  const shown = homeOn && !menuOff;
                  const current = draft.sections[key] ?? base;
                  const hasSettings = !!settingsKeys?.includes(key);
                  const open = openKey === key;
                  const note = menuOff ? "메뉴가 꺼져 홈에도 안 보여요" : !homeOn ? "홈에서 숨김" : `${sectionDesignLabel(key, current)} 디자인`;
                  return (
                    <li key={key} className={`admin-design-row ${shown ? "" : "off"} ${open ? "open" : ""}`} {...getItemProps(idx)}>
                      <div className="admin-design-row-main">
                        <DragHandle />
                        <button
                          type="button"
                          className="admin-design-row-head"
                          aria-expanded={open}
                          aria-controls={`design-row-${key}`}
                          onClick={() => setOpenKey(open ? null : key)}
                        >
                          <span className="admin-design-row-title" title={meta.desc}>{label}</span>
                          <span className="admin-design-row-sub">{note}</span>
                        </button>
                        <svg className="admin-design-row-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        {page && (
                          <button
                            type="button"
                            className={`toggle ${shown ? "on" : ""}`}
                            // 스위치는 '홈에 실제로 보이는지'. 메뉴가 꺼져 숨은 섹션은 켜면 메뉴부터 켠다.
                            onClick={menuOff ? page.menu?.toggle : page.home.toggle}
                            aria-label={`${label} 홈에 표시`}
                            aria-pressed={shown}
                          />
                        )}
                      </div>
                      {open && (
                        <div className="admin-design-row-detail" id={`design-row-${key}`}>
                          <div className="admin-design-row-opt">
                            <span>디자인</span>
                            <div className="admin-design-seg" role="group" aria-label={`${label} 디자인`}>
                              {SECTION_DESIGN_IDS.map((id) => (
                                <button key={id} type="button" aria-pressed={current === id} onClick={() => setSection(key, id)}>
                                  {sectionDesignLabel(key, id)}
                                </button>
                              ))}
                            </div>
                          </div>
                          {page?.menu && (
                            <div className="admin-design-row-opt">
                              <span>메뉴에 ‘{page.menu.label}’ 표시</span>
                              <button type="button" className={`toggle ${page.menu.on ? "on" : ""}`} onClick={page.menu.toggle} aria-label={`메뉴에 ${page.menu.label} 표시`} aria-pressed={page.menu.on} />
                            </div>
                          )}
                          {hasSettings && (
                            <button type="button" className="admin-design-row-set" onClick={() => onSectionSettings?.(key)}>
                              {label} 내용 설정
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
                {menuOnly.map((m) => (
                  <li key={m.key} className={`admin-design-row menu-only ${m.on ? "" : "off"}`}>
                    <div className="admin-design-row-main">
                    <span className="admin-design-row-spacer" aria-hidden="true" />
                    <span className="admin-design-row-head">
                      <span className="admin-design-row-title">{m.label}</span>
                      <span className="admin-design-row-sub">메뉴에만 있는 페이지</span>
                    </span>
                    <button type="button" className={`toggle ${m.on ? "on" : ""}`} onClick={m.toggle} aria-label={`${m.label} 메뉴에 표시`} aria-pressed={m.on} />
                    </div>
                  </li>
                ))}
              </ol>
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
                ref={iframeRef}
                title="홈 미리보기"
                src={previewSrc}
                onLoad={() => { loadedRef.current = true; setLoadedTick((n) => n + 1); }}
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
