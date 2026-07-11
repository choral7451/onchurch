"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { type Lang, pick } from "@/lib/i18n";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
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

const UPCOMING_PREVIEW_LIMIT = 8;
// PC에서는 한 페이지에 이 개수만큼만 보여주고 화살표로 페이지를 넘긴다 (목록이 세로로 늘어나지 않게).
const UPCOMING_PAGE_SIZE = 5;

// 뷰포트가 PC 폭인지 판별. 반응형 분기점(960px, globals.css)과 동일하게 맞춘다.
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

// "YYYY-MM"(예: "2026-04") 파싱. 홈페이지에서 특정 일정을 클릭해 넘어온 경우 그 달을 연다.
function parseYm(ym: string | undefined): { year: number; month: number } | null {
  if (!ym) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(ym);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function Calendar({ events, initialYm, lang = "ko" }: { events: CalendarEvent[]; initialYm?: string; lang?: Lang }) {
  const today = new Date();
  const dowLabels = pick(lang, { ko: DOW, en: DOW_EN });
  const [view, setView] = useState(
    parseYm(initialYm) ?? { year: today.getFullYear(), month: today.getMonth() + 1 },
  );
  const [activeEvents, setActiveEvents] = useState<CalendarEvent[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const isDesktop = useIsDesktop();

  const firstDay = new Date(view.year, view.month - 1, 1).getDay();
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  const isCurrent = view.year === today.getFullYear() && view.month === today.getMonth() + 1;

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
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
    // 캘린더에서 보고 있는 달의 일정은 지난 일정 포함 모두 표시 (startAt 기준).
    return events
      .filter((e) => {
        const d = new Date(e.startAt);
        if (Number.isNaN(d.getTime())) return false;
        return d.getFullYear() === view.year && d.getMonth() + 1 === view.month;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, view]);

  // 달이 바뀌면 펼친 상태를 닫고 페이지를 처음으로 되돌린다 (새 달 기준으로 다시 처음부터).
  useEffect(() => {
    setExpanded(false);
    setPage(0);
  }, [view.year, view.month]);

  const visibleUpcoming = expanded ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW_LIMIT);
  const hiddenCount = upcoming.length - UPCOMING_PREVIEW_LIMIT;

  // PC 페이지네이션: 총 페이지 수와 현재 페이지에 보일 일정 목록.
  const pageCount = Math.max(1, Math.ceil(upcoming.length / UPCOMING_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedUpcoming = upcoming.slice(safePage * UPCOMING_PAGE_SIZE, safePage * UPCOMING_PAGE_SIZE + UPCOMING_PAGE_SIZE);

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

  const renderUpcomingItem = (e: CalendarEvent) => (
    <button
      type="button"
      key={e.id}
      className="upcoming-item upcoming-item-btn"
      onClick={() => openEvent(e)}
      aria-label={pick(lang, { ko: `${e.title} 상세 보기`, en: `View ${e.title}` })}
    >
      <div className="upcoming-date">{fmtUpcomingDate(e.startAt)}</div>
      <div className="upcoming-title">{e.title}</div>
      <div className="upcoming-meta">{fmtMeta(e)}</div>
    </button>
  );

  return (
    <div className="calendar-wrap">
      <div className="cal">
        <div className="cal-head">
          <div className="cal-month">
            {pick(lang, {
              ko: `${view.year}년 ${view.month}월`,
              en: new Date(view.year, view.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
            })}
            {lang === "ko" && (
              <span>{new Date(view.year, view.month - 1, 1).toLocaleString("en-US", { month: "long" })}</span>
            )}
          </div>
          <div className="cal-nav">
            <button type="button" aria-label={pick(lang, { ko: "이전 달", en: "Previous month" })} onClick={() => shiftMonth(-1)}>
              <Icon.chevL />
            </button>
            <button type="button" aria-label={pick(lang, { ko: "다음 달", en: "Next month" })} onClick={() => shiftMonth(1)}>
              <Icon.chevR />
            </button>
          </div>
        </div>
        <div className="cal-grid">
          {dowLabels.map((d, i) => (
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
                aria-label={
                  has
                    ? pick(lang, {
                        ko: `${view.month}월 ${day}일 일정 보기 (${dayEvents!.length}건)`,
                        en: `View events for ${view.month}/${day} (${dayEvents!.length})`,
                      })
                    : undefined
                }
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
              ? pick(lang, { ko: "다가오는 일정이 없습니다.", en: "No upcoming events." })
              : pick(lang, {
                  ko: `${view.month}월 일정이 없습니다.`,
                  en: `No events in ${new Date(view.year, view.month - 1, 1).toLocaleString("en-US", { month: "long" })}.`,
                })}
          </div>
        ) : isDesktop ? (
          <>
            {pagedUpcoming.map(renderUpcomingItem)}
            {pageCount > 1 && (
              <div className="upcoming-pager">
                <button
                  type="button"
                  aria-label={pick(lang, { ko: "이전 페이지", en: "Previous page" })}
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <Icon.chevL />
                </button>
                <span className="upcoming-pager-info">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  aria-label={pick(lang, { ko: "다음 페이지", en: "Next page" })}
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <Icon.chevR />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {visibleUpcoming.map(renderUpcomingItem)}
            {hiddenCount > 0 && (
              <button
                type="button"
                className="upcoming-more"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded
                  ? pick(lang, { ko: "접기", en: "Collapse" })
                  : pick(lang, { ko: `+${hiddenCount}개 더 보기`, en: `+${hiddenCount} more` })}
              </button>
            )}
          </>
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
              aria-label={pick(lang, { ko: "닫기", en: "Close" })}
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
