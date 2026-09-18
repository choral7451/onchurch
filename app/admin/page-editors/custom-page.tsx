"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchCustomPage, uploadImages, type CustomPage } from "@/lib/api-client";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  createBlock,
  isBlockEmpty,
  normalizeBlocks,
  suggestSlug,
  type BlockType,
  type CustomPageBlock,
} from "@/lib/custom-page-blocks";

type Props = {
  page: CustomPage;
  onSaved: (page: CustomPage) => void;
  onDeleted: (id: number) => void;
};

type Status = "idle" | "saving" | "deleting";

export function CustomPageEditor({ page, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [blocks, setBlocks] = useState<CustomPageBlock[]>(() => normalizeBlocks(page.blocks));
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  // 사이드바에서 다른 페이지를 고르면 폼을 그 페이지로 갈아끼운다.
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
    setBlocks(normalizeBlocks(page.blocks));
    setErrMsg("");
    setSavedMsg("");
  }, [page.id, page.title, page.slug, page.blocks]);

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
    const nextSlug = slug.trim().toLowerCase();
    if (!nextTitle) { setErrMsg("페이지 이름을 입력해주세요."); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      setErrMsg("주소는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.");
      return;
    }
    setStatus("saving");
    setErrMsg("");
    setSavedMsg("");
    try {
      // 비어 있는 블록은 저장하지 않는다 — 공개 페이지에 빈 자리로 남지 않도록.
      const saved = await onchurchCustomPage.update(page.id, {
        slug: nextSlug,
        title: nextTitle,
        blocks: blocks.filter((b) => !isBlockEmpty(b)),
        isActive: page.isActive,
      });
      onSaved(saved);
      setSavedMsg("저장했습니다.");
      window.setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setStatus("idle");
    }
  }

  async function remove() {
    if (!window.confirm(`'${page.title}' 페이지를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setStatus("deleting");
    setErrMsg("");
    try {
      await onchurchCustomPage.remove(page.id);
      onDeleted(page.id);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
      setStatus("idle");
    }
  }

  const publicUrl = `/p/${slug || page.slug}`;

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">CUSTOM PAGE</div>
        <h2>{page.title || "커스텀 페이지"}</h2>
        <p>페이지 이름과 주소를 정하고, 아래에 블록을 쌓아 내용을 꾸밉니다.</p>
      </div>

      <div className="admin-section-body">
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="cp-title">페이지 이름</label>
            <input
              id="cp-title"
              value={title}
              maxLength={100}
              placeholder="예: 비전"
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                // 주소를 아직 정하지 않았을 때만 제목에서 제안값을 채운다.
                if (!page.slug && !slug) setSlug(suggestSlug(v));
              }}
            />
            <span className="form-hint">네비게이션에 이 이름으로 나옵니다.</span>
          </div>
          <div className="form-row">
            <label htmlFor="cp-slug">주소</label>
            <input
              id="cp-slug"
              value={slug}
              maxLength={80}
              placeholder="vision"
              onChange={(e) => setSlug(e.target.value)}
            />
            <span className="form-hint">{publicUrl}</span>
          </div>
        </div>

        <div className="cp-editor-blocks">
          {blocks.length === 0 && (
            <p className="cp-editor-empty">아래에서 블록을 추가해 내용을 채워보세요.</p>
          )}
          {blocks.map((b, idx) => (
            <div key={b.id} className="cp-editor-block" {...getItemProps(idx)}>
              <div className="cp-editor-block-head">
                <DragHandle />
                <strong>{BLOCK_LABELS[b.type].title}</strong>
                <button type="button" className="btn btn-ghost cp-btn-sm" onClick={() => removeBlock(b.id)}>
                  삭제
                </button>
              </div>
              <BlockFields block={b} patch={patch} pickImages={pickImages} />
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
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={status !== "idle"}>
            {status === "saving" ? "저장 중…" : "저장"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void remove()} disabled={status !== "idle"}>
            페이지 삭제
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
};

function BlockFields({ block: b, patch, pickImages }: FieldProps) {
  switch (b.type) {
    case "heading":
      return (
        <div className="cp-editor-fields">
          <input value={b.text} placeholder="소제목" maxLength={120} onChange={(e) => patch(b.id, { text: e.target.value })} />
          <div className="cp-editor-opts">
            <Segmented
              value={String(b.level)}
              options={[["2", "크게"], ["3", "작게"]]}
              onChange={(v) => patch(b.id, { level: v === "3" ? 3 : 2 })}
            />
            <AlignOpt value={b.align} onChange={(align) => patch(b.id, { align })} />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="cp-editor-fields">
          <textarea
            value={b.text}
            rows={6}
            placeholder={"내용을 입력하세요.\n\n**굵게**, [링크](https://...), '- '로 시작하면 목록이 됩니다."}
            onChange={(e) => patch(b.id, { text: e.target.value })}
          />
          <div className="cp-editor-opts">
            <AlignOpt value={b.align} onChange={(align) => patch(b.id, { align })} />
          </div>
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
                <button
                  type="button"
                  aria-label="사진 제거"
                  onClick={() => patch(b.id, { urls: b.urls.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
            {b.urls.length < 3 && (
              <button type="button" className="cp-editor-thumb-add" onClick={() => pickImages(b.id)}>
                + 사진
              </button>
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
        <button key={v} type="button" className={value === v ? "active" : ""} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function AlignOpt({ value, onChange }: { value: "left" | "center"; onChange: (v: "left" | "center") => void }) {
  return (
    <Segmented
      value={value}
      options={[["left", "왼쪽"], ["center", "가운데"]]}
      onChange={(v) => onChange(v === "center" ? "center" : "left")}
    />
  );
}
