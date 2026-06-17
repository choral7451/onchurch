"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchMaster, type EmailLog } from "@/lib/api-client";

type LoadState = "loading" | "done" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EmailHistoryFeature() {
  const [state, setState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onchurchMaster.listEmailLogs();
        if (cancelled) return;
        setLogs(res.items);
        setState("done");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMsg(err instanceof ApiError ? err.message : "내역을 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900">메일 발송 내역</h2>
      <p className="mt-1 text-sm text-gray-500">누구에게 어떤 내용의 메일을 보냈는지 확인할 수 있습니다.</p>

      <div className="mt-6 space-y-3">
        {state === "loading" && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {state === "error" && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
        )}
        {state === "done" && logs.length === 0 && (
          <p className="text-sm text-gray-500">아직 발송 내역이 없습니다.</p>
        )}

        {logs.map((log) => {
          const open = openId === log.id;
          return (
            <div key={log.id} className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : log.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{log.subject}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(log.createdAt)} · {log.senderName} · 수신자 {log.total}명
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500">
                  성공 {log.sent} / 실패 {log.failed}
                </span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">수신자 ({log.recipients.length}명)</p>
                    <p className="mt-1 break-all text-sm text-gray-700">{log.recipients.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">본문</p>
                    <div className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {log.content}
                    </div>
                  </div>
                  {log.failures.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500">실패 ({log.failures.length}명)</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-red-600">
                        {log.failures.map((f) => (
                          <li key={f.email}>
                            {f.email} — {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
