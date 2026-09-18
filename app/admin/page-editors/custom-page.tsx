"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchCustomPage, uploadImages, type CustomPage } from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
// 공개 페이지와 같은 렌더러를 그대로 쓴다 — 미리보기가 실제 화면과 어긋나지 않게.
import { RichText } from "@/components/custom-page/rich-text";
import { useDragSort } from "@/lib/use-drag-sort";
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  createBlock,
  isBlockEmpty,
  normalizeBlocks,
  suggestSlug,
  engFromSlug,
  type BlockType,
  type CustomPageBlock,
} from "@/lib/custom-page-blocks";

type Props = {
  // 아직 만들지 않았으면 null — 저장 시점에 생성한다.
  page: CustomPage | null;
  onSaved: (page: CustomPage) => void;
};

export function CustomPageEditor({ page, onSaved }: Props) {
  const [title, setTitle] = useState(page?.title ?? "");
  // 영문 이름 하나로 주소(slug)와 제목 위 eyebrow를 함께 만든다.
  const [eng, setEng] = useState(page?.slug ? engFromSlug(page.slug) : "");
  const [summary, setSummary] = useState(page?.summary ?? "");
  const [blocks, setBlocks] = useState<CustomPageBlock[]>(() => normalizeBlocks(page?.blocks));
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const textAreas = useRef(new Map<string, HTMLTextAreaElement>());

  useEffect(() => {
    setTitle(page?.title ?? "");
    setEng(page?.slug ? engFromSlug(page.slug) : "");
    setSummary(page?.summary ?? "");
    setBlocks(normalizeBlocks(page?.blocks));
    setErrMsg("");
    setSavedMsg("");
  }, [page?.id, page?.title, page?.slug, page?.summary, page?.blocks]);

  const { getItemProps } = useDragSort(blocks.length, (from, to) => {
    if (from === to) return;
    setBlocks((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  });

  function patch(id: string, changes: Partial<CustomPageBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...changes } as CustomPageBlock) : b)));
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function pickImages(blockId: string) {
    uploadTargetRef.current = blockId;
    fileRef.current?.click();
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const blockId = uploadTargetRef.current;
    if (files.length === 0 || !blockId) return;
    setErrMsg("");
    try {
      const uploaded = await uploadImages(files);
      const urls = uploaded.map((u) => u?.url).filter((u): u is string => !!u);
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId && b.type === "image" ? { ...b, urls: [...b.urls, ...urls].slice(0, 3) } : b)),
      );
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "사진 업로드에 실패했습니다.");
    }
  }

  async function save() {
    const nextTitle = title.trim();
    const nextSlug = suggestSlug(eng);
    if (!nextTitle) { setErrMsg("페이지 이름을 입력해주세요."); return; }
    if (!nextSlug) { setErrMsg("영문 이름을 입력해주세요. 주소로도 함께 쓰입니다."); return; }
    setSaving(true);
    setErrMsg("");
    setSavedMsg("");
    // 비어 있는 블록은 저장하지 않는다 — 공개 페이지에 빈 자리로 남지 않도록.
    const input = {
      slug: nextSlug,
      title: nextTitle,
      summary: summary.trim() || null,
      blocks: blocks.filter((b) => !isBlockEmpty(b)),
      isActive: page?.isActive ?? true,
    };
    try {
      const saved = page ? await onchurchCustomPage.update(page.id, input) : await onchurchCustomPage.create(input);
      setEng(engFromSlug(saved.slug));
      onSaved(saved);
      setSavedMsg("저장했습니다.");
      window.setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // 텍스트 블록 툴바 — 선택한 부분을 마크다운 서식으로 감싼다.
  // 문법을 몰라도 쓸 수 있게 하되, 저장되는 건 여전히 HTML이 아닌 텍스트다.
  function wrapSelection(blockId: string, before: string, after: string, placeholder: string) {
    const ta = textAreas.current.get(blockId);
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const picked = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${picked}${after}${value.slice(end)}`;
    patch(blockId, { text: next });
    // 감싼 내용이 선택된 채로 남아 바로 덮어쓸 수 있게 한다.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + picked.length);
    });
  }

  function toggleList(blockId: string) {
    const ta = textAreas.current.get(blockId);
    if (!ta) return;
    const value = ta.value;
    const lineStart = value.lastIndexOf("\n", Math.max(0, ta.selectionStart - 1)) + 1;
    const lineEndRaw = value.indexOf("\n", ta.selectionEnd);
    const lineEnd = lineEndRaw < 0 ? value.length : lineEndRaw;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const allListed = lines.every((l) => l.trim().startsWith("- "));
    const next = lines.map((l) => (allListed ? l.replace(/^\s*-\s/, "") : `- ${l}`)).join("\n");
    patch(blockId, { text: `${value.slice(0, lineStart)}${next}${value.slice(lineEnd)}` });
    requestAnimationFrame(() => ta.focus());
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">CUSTOM PAGE</div>
        <h2>새 페이지</h2>
        <p>페이지 이름을 정하고 블록을 쌓아 자유롭게 꾸밉니다. 공개 여부는 왼쪽 목록의 토글로 바꿉니다.</p>
      </div>

      <div className="admin-section-body">
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="cp-eng">영문 이름</label>
            <input id="cp-eng" value={eng} maxLength={80} placeholder="Vision" onChange={(e) => setEng(e.target.value)} />
            <span className="form-hint">제목 위에 작게 표시되고, 주소로도 쓰입니다 — /p/{suggestSlug(eng) || "vision"}</span>
          </div>
          <div className="form-row">
            <label htmlFor="cp-title">페이지 이름</label>
            <input id="cp-title" value={title} maxLength={100} placeholder="비전" onChange={(e) => setTitle(e.target.value)} />
            <span className="form-hint">네비게이션과 제목에 이 이름으로 나옵니다.</span>
          </div>
          <div className="form-row full">
            <label htmlFor="cp-summary">한 줄 요약</label>
            <input
              id="cp-summary"
              value={summary}
              maxLength={200}
              placeholder="예: 우리 교회가 바라보는 방향입니다."
              onChange={(e) => setSummary(e.target.value)}
            />
            <span className="form-hint">제목 아래에 들어가는 안내 문구입니다. 비워두면 표시되지 않습니다.</span>
          </div>
        </div>

        <div className="cp-editor-blocks">
          {blocks.length === 0 && <p className="cp-editor-empty">아래에서 블록을 추가해 내용을 채워보세요.</p>}
          {blocks.map((b, idx) => (
            <div key={b.id} className="cp-editor-block" {...getItemProps(idx)}>
              <div className="cp-editor-block-head">
                <DragHandle />
                <strong>{BLOCK_LABELS[b.type].title}</strong>
                <button type="button" className="btn btn-ghost cp-btn-sm" onClick={() => removeBlock(b.id)}>삭제</button>
              </div>
              <BlockFields
                block={b}
                patch={patch}
                pickImages={pickImages}
                registerTextArea={(id, el) => {
                  if (el) textAreas.current.set(id, el);
                  else textAreas.current.delete(id);
                }}
                wrapSelection={wrapSelection}
                toggleList={toggleList}
              />
            </div>
          ))}
        </div>

        <div className="cp-editor-add">
          <span className="cp-editor-add-label">블록 추가</span>
          <div className="cp-editor-add-list">
            {BLOCK_ORDER.map((type) => (
              <button key={type} type="button" className="btn btn-secondary cp-btn-sm" onClick={() => addBlock(type)}>
                + {BLOCK_LABELS[type].title}
              </button>
            ))}
          </div>
        </div>

        {errMsg && <p className="phone-msg phone-msg-error">{errMsg}</p>}
        {savedMsg && <p className="cp-editor-saved">{savedMsg}</p>}

        <div className="cp-editor-actions">
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFilesPicked(e)} />
    </section>
  );
}

type FieldProps = {
  block: CustomPageBlock;
  patch: (id: string, changes: Partial<CustomPageBlock>) => void;
  pickImages: (blockId: string) => void;
  registerTextArea: (id: string, el: HTMLTextAreaElement | null) => void;
  wrapSelection: (blockId: string, before: string, after: string, placeholder: string) => void;
  toggleList: (blockId: string) => void;
};

function BlockFields({ block: b, patch, pickImages, registerTextArea, wrapSelection, toggleList }: FieldProps) {
  switch (b.type) {
    case "heading":
      return (
        <div className="cp-editor-fields">
          <input value={b.text} placeholder="소제목" maxLength={120} onChange={(e) => patch(b.id, { text: e.target.value })} />
          <div className="cp-editor-opts">
            <Segmented value={String(b.level)} options={[["2", "크게"], ["3", "작게"]]} onChange={(v) => patch(b.id, { level: v === "3" ? 3 : 2 })} />
            <AlignOpt value={b.align} onChange={(align) => patch(b.id, { align })} />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="cp-editor-fields">
          <div className="cp-toolbar">
            <button type="button" title="굵게" onClick={() => wrapSelection(b.id, "**", "**", "굵은 글자")}><b>B</b></button>
            <button type="button" title="링크" onClick={() => wrapSelection(b.id, "[", "](https://)", "링크 글자")}>🔗</button>
            <button type="button" title="목록" onClick={() => toggleList(b.id)}>≡</button>
            <span className="cp-toolbar-sep" />
            <Segmented
              value={b.size}
              options={[["sm", "작게"], ["md", "보통"], ["lg", "크게"]]}
              onChange={(v) => patch(b.id, { size: v as "sm" | "md" | "lg" })}
            />
            <AlignOpt value={b.align} onChange={(align) => patch(b.id, { align })} />
          </div>
          <textarea
            ref={(el) => registerTextArea(b.id, el)}
            value={b.text}
            rows={6}
            placeholder="내용을 입력하세요. 글자를 선택한 뒤 위 버튼을 누르면 서식이 적용됩니다."
            onChange={(e) => patch(b.id, { text: e.target.value })}
          />
          {b.text.trim() && (
            <div className="cp-preview">
              <span className="cp-preview-label">미리보기</span>
              <div className={`cp-text sz-${b.size} al-${b.align}`}>
                <RichText text={b.text} />
              </div>
            </div>
          )}
        </div>
      );

    case "image":
      return (
        <div className="cp-editor-fields">
          <div className="cp-editor-thumbs">
            {b.urls.map((url, i) => (
              <div key={`${url}-${i}`} className="cp-editor-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" aria-label="사진 제거" onClick={() => patch(b.id, { urls: b.urls.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            {b.urls.length < 3 && (
              <button type="button" className="cp-editor-thumb-add" onClick={() => pickImages(b.id)}>+ 사진</button>
            )}
          </div>
          <input value={b.caption} placeholder="설명 (선택)" maxLength={200} onChange={(e) => patch(b.id, { caption: e.target.value })} />
          <div className="cp-editor-opts">
            <Segmented
              value={b.width}
              options={[["normal", "보통"], ["wide", "넓게"], ["full", "전체폭"]]}
              onChange={(v) => patch(b.id, { width: v as "normal" | "wide" | "full" })}
            />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="cp-editor-fields">
          <input value={b.url} placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => patch(b.id, { url: e.target.value })} />
          <input value={b.caption} placeholder="설명 (선택)" maxLength={200} onChange={(e) => patch(b.id, { caption: e.target.value })} />
        </div>
      );

    case "button":
      return (
        <div className="cp-editor-fields">
          <input value={b.label} placeholder="버튼에 보일 글자" maxLength={40} onChange={(e) => patch(b.id, { label: e.target.value })} />
          <input value={b.href} placeholder="이동할 주소 (https://... 또는 /worship)" onChange={(e) => patch(b.id, { href: e.target.value })} />
          <div className="cp-editor-opts">
            <AlignOpt value={b.align} onChange={(align) => patch(b.id, { align })} />
          </div>
        </div>
      );

    case "divider":
      return <p className="cp-editor-note">가로선이 들어갑니다.</p>;
  }
}

function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="cp-seg">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={value === v ? "active" : ""} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

function AlignOpt({ value, onChange }: { value: "left" | "center"; onChange: (v: "left" | "center") => void }) {
  return (
    <Segmented value={value} options={[["left", "왼쪽"], ["center", "가운데"]]} onChange={(v) => onChange(v === "center" ? "center" : "left")} />
  );
}
