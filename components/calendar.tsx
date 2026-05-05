import { Icon } from "@/components/icons";
import type { CalendarConfig, EventItem } from "@/lib/types";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

type Props = {
  config: CalendarConfig;
  events: EventItem[];
};

export function Calendar({ config, events }: Props) {
  const firstDay = new Date(config.year, config.month - 1, 1).getDay();
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const eventSet = new Set(config.eventDays);
  const trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;

  return (
    <div className="calendar-wrap">
      <div className="cal">
        <div className="cal-head">
          <div className="cal-month">
            {config.year}년 {config.month}월
            <span>{new Date(config.year, config.month - 1, 1).toLocaleString("en-US", { month: "long" })}</span>
          </div>
          <div className="cal-nav">
            <button aria-label="이전 달"><Icon.chevL /></button>
            <button aria-label="다음 달"><Icon.chevR /></button>
          </div>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => (
            <div key={d} className={`cal-dow ${i === 0 ? "sun" : ""}`}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`m-${i}`} className="cal-day muted">{29 + i}</div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dow = (firstDay + i) % 7;
            const cls = [
              "cal-day",
              dow === 0 ? "sun" : "",
              day === config.today ? "today" : "",
              eventSet.has(day) ? "has-event" : "",
            ].filter(Boolean).join(" ");
            return <div key={day} className={cls}>{day}</div>;
          })}
          {Array.from({ length: trailing }).map((_, i) => (
            <div key={`t-${i}`} className="cal-day muted">{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="upcoming-list">
        {events.map((e, i) => (
          <div key={i} className="upcoming-item">
            <div className="upcoming-date">{e.date}</div>
            <div className="upcoming-title">{e.title}</div>
            <div className="upcoming-meta">{e.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
