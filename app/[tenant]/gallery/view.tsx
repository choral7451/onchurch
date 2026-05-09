"use client";

import { useState } from "react";

type Category = { id: number; name: string };
type Gallery = {
  id: number;
  categoryId: number | null;
  title: string;
  date: string | null;
  photoUrl: string | null;
  grad: string | null;
};
type Layout = { col: number; row: number };

type Props = {
  categories: Category[];
  galleries: Gallery[];
  layout: Layout[];
};

const ALL_KEY = -1 as const;

export function GalleryView({ categories, galleries, layout }: Props) {
  const [filter, setFilter] = useState<number>(ALL_KEY);

  const filtered =
    filter === ALL_KEY
      ? galleries
      : galleries.filter((g) => g.categoryId === filter);

  return (
    <>
      {categories.length > 0 && (
        <div className="chips">
          <div
            className={`chip ${filter === ALL_KEY ? "active" : ""}`}
            onClick={() => setFilter(ALL_KEY)}
          >
            전체
          </div>
          {categories.map((c) => (
            <div
              key={c.id}
              className={`chip ${filter === c.id ? "active" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div className="gallery-grid">
        {filtered.map((g, i) => {
          const l = layout[i] ?? { col: 4, row: 1 };
          return (
            <div
              key={g.id}
              className="gallery-item"
              style={{ gridColumn: `span ${l.col}`, gridRow: `span ${l.row}` }}
            >
              {g.photoUrl ? (
                <div
                  className="placeholder-img"
                  style={{
                    backgroundImage: `url(${g.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {g.date && <span className="placeholder-img-tag">PHOTO · {g.date}</span>}
                </div>
              ) : (
                <div className={`placeholder-img ${g.grad ?? "ph-grad-1"}`}>
                  {g.date && <span className="placeholder-img-tag">PHOTO · {g.date}</span>}
                </div>
              )}
              <div className="gallery-overlay">
                <div className="gallery-cap-title">{g.title}</div>
                {g.date && <div className="gallery-cap-meta">{g.date}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          이 카테고리에 사진이 없습니다.
        </div>
      )}
    </>
  );
}
