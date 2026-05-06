"use client";

import type { EventItem } from "@/lib/types";

type Props = {
  events: EventItem[];
  setEvents: (next: EventItem[]) => void;
};

export function ScheduleEditor({ events, setEvents }: Props) {
  function updateEvent(idx: number, patch: Partial<EventItem>) {
    setEvents(events.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function removeEvent(idx: number) {
    setEvents(events.filter((_, i) => i !== idx));
  }
  function addEvent() {
    setEvents([...events, { date: "", title: "", meta: "" }]);
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">EVENTS</div>
        <h2>행사 캘린더</h2>
        <p>다가오는 교회 행사 일정입니다. 메인 페이지의 캘린더와 일정 페이지에 노출됩니다.</p>
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
  );
}
