"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { GalleryItem } from "@/lib/types";

type Props = {
  galleries: GalleryItem[];
  setGalleries: (next: GalleryItem[]) => void;
  categories: string[];
  setCategories: (next: string[]) => void;
};

const GRADS: GalleryItem["grad"][] = ["ph-grad-1", "ph-grad-2", "ph-grad-3", "ph-grad-4"];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function GalleryEditor({ galleries, setGalleries, categories, setCategories }: Props) {
  const [newCategory, setNewCategory] = useState("");
  const photoRefs = useRef<Array<HTMLInputElement | null>>([]);

  function addCategory() {
    const v = newCategory.trim();
    if (!v) return;
    if (categories.includes(v)) {
      setNewCategory("");
      return;
    }
    setCategories([...categories, v]);
    setNewCategory("");
  }
  function removeCategory(idx: number) {
    setCategories(categories.filter((_, i) => i !== idx));
  }

  function update(idx: number, patch: Partial<GalleryItem>) {
    setGalleries(galleries.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }
  function remove(idx: number) {
    setGalleries(galleries.filter((_, i) => i !== idx));
  }
  function add() {
    setGalleries([{ title: "", date: "", grad: "ph-grad-1" }, ...galleries]);
  }

  async function onPickPhoto(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    update(idx, { photo: dataUrl });
  }

  return (
    <>
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">CATEGORIES</div>
          <h2>갤러리 카테고리</h2>
          <p>갤러리 페이지 상단의 필터 칩으로 노출됩니다. &quot;전체&quot;는 항상 첫 항목으로 두는 것을 권장합니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-chips">
            {categories.map((c, i) => (
              <span key={`${c}-${i}`} className="editor-chip">
                {c}
                <button type="button" onClick={() => removeCategory(i)} aria-label={`${c} 삭제`}>✕</button>
              </span>
            ))}
          </div>
          <div className="editor-chip-add">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="새 카테고리"
            />
            <button type="button" className="btn btn-secondary" onClick={addCategory}>
              + 추가
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">PHOTOS</div>
          <h2>갤러리 사진</h2>
          <p>제목, 날짜, 사진을 추가합니다. 사진을 올리지 않으면 그라데이션 색상이 표시됩니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="gallery-editor-grid">
            {galleries.map((g, i) => (
              <div key={i} className="gallery-editor-card">
                <button
                  type="button"
                  className={`gallery-editor-photo ${g.photo ? "" : g.grad}`}
                  onClick={() => photoRefs.current[i]?.click()}
                  aria-label={`${g.title || `갤러리 ${i + 1}`} 사진 업로드`}
                >
                  {g.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.photo} alt="" />
                  ) : (
                    <span className="gallery-editor-photo-cta">
                      <Icon.image width={20} height={20} />
                      사진 업로드
                    </span>
                  )}
                </button>
                <input
                  ref={(el) => {
                    photoRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickPhoto(i, e)}
                  style={{ display: "none" }}
                />
                <div className="gallery-editor-fields">
                  <input
                    type="text"
                    value={g.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder="제목"
                  />
                  <div className="gallery-editor-meta">
                    <input
                      type="text"
                      value={g.date}
                      onChange={(e) => update(i, { date: e.target.value })}
                      placeholder="JAN 01"
                    />
                    <select
                      value={g.grad}
                      onChange={(e) => update(i, { grad: e.target.value as GalleryItem["grad"] })}
                      aria-label="배경 색상"
                    >
                      {GRADS.map((gd) => (
                        <option key={gd} value={gd}>{gd.replace("ph-grad-", "색상 ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="gallery-editor-actions">
                    {g.photo && (
                      <button type="button" className="gallery-editor-link" onClick={() => update(i, { photo: undefined })}>
                        사진 제거
                      </button>
                    )}
                    <button type="button" className="gallery-editor-link danger" onClick={() => remove(i)}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="editor-add-btn" onClick={add}>
            + 사진 추가
          </button>
        </div>
      </section>
    </>
  );
}
