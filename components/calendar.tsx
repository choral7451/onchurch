"use client";

import { useMemo, useState } from "react";
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

function fmtMeta(ev: CalendarEvent): string {
  const parts: string[] = [];
  if (!ev.isAllDay) {
    const d = new Date(ev.startAt);
    parts.push(`${d.getHours() < 12 ? "오전" : "오후"} ${String(((d.getHours() + 11) % 12) + 1).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  }
  if (ev.location) parts.push(ev.location);
  return parts.join(" · ");
}

export function Calendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });

  const firstDay = new Date(view.year, view.month - 1, 1).getDay();
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  const isCurrent = view.year === today.getFullYear() && view.month === today.getMonth() + 1;

  const eventDaysInMonth = useMemo(() => {
    const set = new Set<number>();
    for (const e of events) {
      const d = new Date(e.startAt);
      if (d.getFullYear() === view.year && d.getMonth() + 1 === view.month) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [events, view]);

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = startOfToday.getTime();
    return events
      .filter((e) => e.isActive !== false)
      .filter((e) => {
        const ref = new Date(e.endAt ?? e.startAt);
        if (Number.isNaN(ref.getTime())) return false;
        if (!e.endAt || e.isAllDay) ref.setHours(23, 59, 59, 999);
        return ref.getTime() >= cutoff;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6);
  }, [events]);

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.year, v.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  }

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
            const cls = [
              "cal-day",
              dow === 0 ? "sun" : "",
              isCurrent && day === today.getDate() ? "today" : "",
              eventDaysInMonth.has(day) ? "has-event" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return <div key={day} className={cls}>{day}</div>;
          })}
          {Array.from({ length: trailing }).map((_, i) => (
            <div key={`t-${i}`} className="cal-day muted">{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="upcoming-list">
        {upcoming.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>다가오는 일정이 없습니다.</div>
        ) : (
          upcoming.map((e) => (
            <div key={e.id} className="upcoming-item">
              <div className="upcoming-date">{fmtUpcomingDate(e.startAt)}</div>
              <div className="upcoming-title">{e.title}</div>
              <div className="upcoming-meta">{fmtMeta(e)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
