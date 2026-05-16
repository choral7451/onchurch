"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  isActive: boolean;
};

function fmtUpcomingDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(d: Date): string {
  return `${d.getHours() < 12 ? "오전" : "오후"} ${String(((d.getHours() + 11) % 12) + 1).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtMeta(ev: CalendarEvent): string {
  const parts: string[] = [];
  if (!ev.isAllDay) parts.push(fmtTime(new Date(ev.startAt)));
  if (ev.location) parts.push(ev.location);
  return parts.join(" · ");
}

function fmtDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtRange(ev: CalendarEvent): string {
  const s = new Date(ev.startAt);
  const sLabel = fmtDateLabel(ev.startAt);
  if (ev.isAllDay) {
    if (!ev.endAt) return `${sLabel} · 종일`;
    const e = new Date(ev.endAt);
    const eLabel = fmtDateLabel(ev.endAt);
    return sLabel === eLabel ? `${sLabel} · 종일` : `${sLabel} – ${eLabel} · 종일`;
  }
  if (!ev.endAt) return `${sLabel} · ${fmtTime(s)}`;
  const e = new Date(ev.endAt);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${sLabel} · ${fmtTime(s)} – ${fmtTime(e)}`;
  return `${sLabel} ${fmtTime(s)} – ${fmtDateLabel(ev.endAt)} ${fmtTime(e)}`;
}

export function Calendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [activeEvents, setActiveEvents] = useState<CalendarEvent[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const firstDay = new Date(view.year, view.month - 1, 1).getDay();
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  const isCurrent = view.year === today.getFullYear() && view.month === today.getMonth() + 1;

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      if (e.isActive === false) continue;
      const d = new Date(e.startAt);
      if (d.getFullYear() === view.year && d.getMonth() + 1 === view.month) {
        const arr = map.get(d.getDate()) ?? [];
        arr.push(e);
        map.set(d.getDate(), arr);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events, view]);

  const upcoming = useMemo(() => {
    // 캘린더에서 보고 있는 달의 일정만 (startAt 기준).
    // 현재 달을 보는 경우엔 오늘 이후 일정만으로 좁혀, 지나간 일정은 제외.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const isViewingCurrentMonth =
      view.year === startOfToday.getFullYear() && view.month === startOfToday.getMonth() + 1;
    return events
      .filter((e) => e.isActive !== false)
      .filter((e) => {
        const d = new Date(e.startAt);
        if (Number.isNaN(d.getTime())) return false;
        if (d.getFullYear() !== view.year || d.getMonth() + 1 !== view.month) return false;
        if (!isViewingCurrentMonth) return true;
        const ref = new Date(d);
        if (e.isAllDay) ref.setHours(23, 59, 59, 999);
        return ref.getTime() >= todayMs;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 8);
  }, [events, view]);

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.year, v.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  }

  function openEvent(ev: CalendarEvent) {
    setActiveEvents([ev]);
    setActiveIndex(0);
  }
  function openDay(day: number) {
    const list = eventsByDay.get(day);
    if (!list || list.length === 0) return;
    setActiveEvents(list);
    setActiveIndex(0);
  }
  function close() { setActiveEvents(null); setActiveIndex(0); }

  useEffect(() => {
    if (!activeEvents) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeEvents]);

  const activeEvent = activeEvents ? activeEvents[activeIndex] : null;

  return (
    <div className="calendar-wrap">
      <div className="cal">
        <div className="cal-head">
          <div className="cal-month">
            {view.year}년 {view.month}월
            <span>{new Date(view.year, view.month - 1, 1).toLocaleString("en-US", { month: "long" })}</span>
          </div>
          <div className="cal-nav">
            <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)}>
              <Icon.chevL />
            </button>
            <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)}>
              <Icon.chevR />
            </button>
          </div>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => (
            <div key={d} className={`cal-dow ${i === 0 ? "sun" : ""}`}>
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`m-${i}`} className="cal-day muted">
              {new Date(view.year, view.month - 1, -firstDay + i + 1).getDate()}
            </div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dow = (firstDay + i) % 7;
            const has = eventsByDay.has(day);
            const cls = [
              "cal-day",
              dow === 0 ? "sun" : "",
              isCurrent && day === today.getDate() ? "today" : "",
              has ? "has-event" : "",
              has ? "clickable" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const dayEvents = eventsByDay.get(day);
            return (
              <div
                key={day}
                className={cls}
                role={has ? "button" : undefined}
                tabIndex={has ? 0 : undefined}
                aria-label={has ? `${view.month}월 ${day}일 일정 보기 (${dayEvents!.length}건)` : undefined}
                onClick={has ? () => openDay(day) : undefined}
                onKeyDown={
                  has
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDay(day);
                        }
                      }
                    : undefined
                }
              >
                {day}
              </div>
            );
          })}
          {Array.from({ length: trailing }).map((_, i) => (
            <div key={`t-${i}`} className="cal-day muted">{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="upcoming-list">
        {upcoming.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>
            {view.year === today.getFullYear() && view.month === today.getMonth() + 1
              ? "다가오는 일정이 없습니다."
              : `${view.month}월 일정이 없습니다.`}
          </div>
        ) : (
          upcoming.map((e) => (
            <button
              type="button"
              key={e.id}
              className="upcoming-item upcoming-item-btn"
              onClick={() => openEvent(e)}
              aria-label={`${e.title} 상세 보기`}
            >
              <div className="upcoming-date">{fmtUpcomingDate(e.startAt)}</div>
              <div className="upcoming-title">{e.title}</div>
              <div className="upcoming-meta">{fmtMeta(e)}</div>
            </button>
          ))
        )}
      </div>

      {activeEvent && (
        <div
          className="event-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activeEvent.title}
          onClick={close}
        >
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="event-modal-close"
              aria-label="닫기"
              onClick={close}
            >
              ×
            </button>
            <div className="event-modal-body">
              {activeEvents && activeEvents.length > 1 && (
                <div className="event-modal-tabs" role="tablist">
                  {activeEvents.map((e, i) => (
                    <button
                      key={e.id}
                      type="button"
                      role="tab"
                      aria-selected={i === activeIndex}
                      className={`event-modal-tab ${i === activeIndex ? "active" : ""}`}
                      onClick={() => setActiveIndex(i)}
                    >
                      {i + 1}. {e.title}
                    </button>
                  ))}
                </div>
              )}
              <h3 className="event-modal-title">{activeEvent.title}</h3>
              <div className="event-modal-meta">{fmtRange(activeEvent)}</div>
              {activeEvent.location && (
                <div className="event-modal-loc">
                  <Icon.mapPin style={{ width: 14, height: 14 }} />
                  <span>{activeEvent.location}</span>
                </div>
              )}
              {activeEvent.description && (
                <p className="event-modal-desc">{activeEvent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
