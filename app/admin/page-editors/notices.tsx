"use client";

import { useState } from "react";
import type { Notice, EventItem } from "@/lib/types";

type Props = {
  notices: Notice[];
  setNotices: (next: Notice[]) => void;
  categories: string[];
  setCategories: (next: string[]) => void;
  events: EventItem[];
  setEvents: (next: EventItem[]) => void;
};

export function NoticesEditor({ notices, setNotices, categories, setCategories, events, setEvents }: Props) {
  const [newCategory, setNewCategory] = useState("");

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

  function updateNotice(idx: number, patch: Partial<Notice>) {
    setNotices(notices.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  }
  function removeNotice(idx: number) {
    setNotices(notices.filter((_, i) => i !== idx));
  }
  function addNotice() {
    setNotices([
      { num: "", cat: categories[1] ?? categories[0] ?? "", title: "", author: "", date: "" },
      ...notices,
    ]);
  }

  function updateEvent(idx: number, patch: Partial<EventItem>) {
    setEvents(events.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function removeEvent(idx: number) {
    setEvents(events.filter((_, i) => i !== idx));
  }
  function addEvent() {
    setEvents([...events, { date: "", title: "", meta: "" }]);
  }

  const noticeCatOptions = categories.filter((c) => c !== "전체");

  return (
    <>
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">CATEGORIES</div>
          <h2>공지 카테고리</h2>
          <p>공지 목록 상단의 필터 칩으로 노출됩니다. &quot;전체&quot;는 항상 첫 항목으로 두는 것을 권장합니다.</p>
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
          <div className="admin-section-eyebrow">NOTICES</div>
          <h2>공지 목록</h2>
          <p>최근 작성된 공지가 위에 노출됩니다. 고정 공지는 우측 토글로 표시할 수 있습니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {notices.map((n, i) => (
              <div key={i} className="editor-row editor-row-notice">
                <input
                  type="text"
                  value={n.num}
                  onChange={(e) => updateNotice(i, { num: e.target.value })}
                  placeholder="번호"
                />
                <select
                  value={n.cat}
                  onChange={(e) => updateNotice(i, { cat: e.target.value })}
                >
                  {noticeCatOptions.length === 0 && <option value="">카테고리</option>}
                  {noticeCatOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={n.title}
                  onChange={(e) => updateNotice(i, { title: e.target.value })}
                  placeholder="제목"
                />
                <input
                  type="text"
                  value={n.author}
                  onChange={(e) => updateNotice(i, { author: e.target.value })}
                  placeholder="작성자"
                />
                <input
                  type="text"
                  value={n.date}
                  onChange={(e) => updateNotice(i, { date: e.target.value })}
                  placeholder="2026.03.25"
                />
                <label className="editor-feat">
                  <input
                    type="checkbox"
                    checked={!!n.pinned}
                    onChange={(e) => updateNotice(i, { pinned: e.target.checked })}
                  />
                  <span>고정</span>
                </label>
                <button type="button" className="editor-row-remove" onClick={() => removeNotice(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addNotice}>
              + 공지 추가
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">EVENTS</div>
          <h2>행사 캘린더</h2>
          <p>다가오는 교회 행사 일정입니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {events.map((ev, i) => (
              <div key={i} className="editor-row editor-row-event">
                <input
                  type="text"
                  value={ev.date}
                  onChange={(e) => updateEvent(i, { date: e.target.value })}
                  placeholder="APR 05"
                />
                <input
                  type="text"
                  value={ev.title}
                  onChange={(e) => updateEvent(i, { title: e.target.value })}
                  placeholder="행사 이름"
                />
                <input
                  type="text"
                  value={ev.meta}
                  onChange={(e) => updateEvent(i, { meta: e.target.value })}
                  placeholder="오전 11:00 · 본당"
                />
                <button type="button" className="editor-row-remove" onClick={() => removeEvent(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addEvent}>
              + 행사 추가
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
