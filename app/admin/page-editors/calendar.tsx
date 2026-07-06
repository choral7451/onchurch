"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, onchurchEvent, type EventItem, type Subscription } from "@/lib/api-client";
import { Calendar } from "@/components/calendar";

function formatYMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function daysLeft(iso: string): number {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  // 시·분 단위 잔여시간이 올림되지 않도록 달력 날짜(연·월·일)끼리 차이를 센다.
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endDay.getTime() - todayDay.getTime()) / (24 * 60 * 60 * 1000));
}

// 구독 종료일을 달력에 종일 마커로 얹기 위한 합성 이벤트. 실제 일정과 id가 겹치지 않도록 음수 id 사용.
function billingMarkers(subscription: Subscription | null): EventItem[] {
  if (!subscription) return [];
  const markers: EventItem[] = [];
  if (subscription.freeTrialUntil) {
    markers.push({
      id: -1,
      title: "🔔 무료체험 종료",
      description: "이 날짜까지 무료체험이 유효합니다. 이후에도 계속 이용하시려면 결제해 주세요.",
      location: null,
      startAt: subscription.freeTrialUntil,
      endAt: null,
      isAllDay: true,
    });
  }
  if (subscription.paidUntil) {
    markers.push({
      id: -2,
      title: "💳 결제 종료",
      description: "이 날짜까지 결제가 유효합니다. 계속 이용하시려면 만료 전에 결제해 주세요.",
      location: null,
      startAt: subscription.paidUntil,
      endAt: null,
      isAllDay: true,
    });
  }
  return markers;
}

function BillingChip({ kind, iso }: { kind: "trial" | "paid"; iso: string }) {
  const left = daysLeft(iso);
  const label = kind === "trial" ? "무료체험 종료" : "결제 종료";
  const dday = left > 0 ? `D-${left}` : left === 0 ? "D-DAY" : "만료됨";
  return (
    <div className={`admin-cal-chip ${kind} ${left < 0 ? "expired" : ""}`}>
      <span className="admin-cal-chip-label">{kind === "trial" ? "🔔" : "💳"} {label}</span>
      <span className="admin-cal-chip-date">{formatYMD(iso)}</span>
      <span className="admin-cal-chip-dday">{dday}</span>
    </div>
  );
}

export function CalendarView({ subscription }: { subscription: Subscription | null }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await onchurchEvent.listMine();
        if (alive) setEvents(res.events);
      } catch (err) {
        if (alive) setErrMsg(err instanceof ApiError ? err.message : "일정을 불러오지 못했습니다.");
      } finally {
        if (alive) setStatus("idle");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allEvents = useMemo(
    () => [...events, ...billingMarkers(subscription)],
    [events, subscription],
  );

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">CALENDAR</div>
        <h2>달력</h2>
        <p>교회 일정과 무료체험·결제 종료일을 한 달력에서 확인하세요. 종료일은 🔔·💳 마커로 표시됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(subscription?.freeTrialUntil || subscription?.paidUntil) && (
          <div className="admin-cal-chips">
            {subscription?.freeTrialUntil && <BillingChip kind="trial" iso={subscription.freeTrialUntil} />}
            {subscription?.paidUntil && <BillingChip kind="paid" iso={subscription.paidUntil} />}
          </div>
        )}

        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
        {status === "loading" ? (
          <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
        ) : (
          <Calendar events={allEvents} />
        )}
      </div>
    </section>
  );
}
