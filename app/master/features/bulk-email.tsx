"use client";

import { useMemo, useState } from "react";
import { ApiError, onchurchMaster, type BulkEmailResult } from "@/lib/api-client";
import { EmailHistoryFeature } from "./email-history";

// 붙여넣은 텍스트(줄바꿈/쉼표/세미콜론/공백 구분)에서 이메일 목록을 추출한다.
function parseRecipients(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const email = piece.trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

type SendState = "idle" | "sending" | "done" | "error";

export function BulkEmailFeature() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");

  const [state, setState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<BulkEmailResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  async function handleSend() {
    setErrorMsg("");
    setResult(null);
    if (!subject.trim()) {
      setErrorMsg("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("본문을 입력해주세요.");
      return;
    }
    if (recipients.length === 0) {
      setErrorMsg("수신자 이메일을 1명 이상 입력해주세요.");
      return;
    }
    if (!confirm(`${recipients.length}명에게 메일을 발송합니다. 진행할까요?`)) return;

    setState("sending");
    try {
      const res = await onchurchMaster.sendBulkEmail({ subject: subject.trim(), content, recipients });
      setResult(res);
      setState("done");
      setHistoryKey((k) => k + 1); // 발송 후 오른쪽 내역 새로고침
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof ApiError ? err.message : "발송 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
      {/* 왼쪽: 발송 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">대량 메일 발송</h2>
        <p className="mt-1 text-sm text-gray-500">온교회 도입 광고 메일을 대량으로 발송합니다.</p>

        <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700">제목</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="메일 제목"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">본문</label>
          <p className="mt-1 text-xs text-gray-400">줄바꿈은 그대로 반영됩니다. HTML 태그(링크 등)도 사용할 수 있습니다.</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="메일 본문을 입력하세요."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            수신자 이메일 <span className="text-gray-400">({recipients.length}명)</span>
          </label>
          <p className="mt-1 text-xs text-gray-400">줄바꿈, 쉼표(,), 세미콜론(;)으로 구분해 붙여넣으세요. 중복은 자동 제거됩니다.</p>
          <textarea
            value={recipientsRaw}
            onChange={(e) => setRecipientsRaw(e.target.value)}
            rows={8}
            placeholder={"a@example.com\nb@example.com, c@example.com"}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        {errorMsg && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

        {result && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold">발송 완료</p>
            <p className="mt-1">
              총 {result.total}명 중 성공 {result.sent}명 · 실패 {result.failed}명
            </p>
            {result.failures.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-red-600">
                {result.failures.map((f) => (
                  <li key={f.email}>
                    {f.email} — {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={state === "sending"}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "sending" ? "발송 중…" : `${recipients.length}명에게 발송`}
        </button>
        </div>
      </div>

      {/* 오른쪽: 발송 내역 */}
      <div className="border-t border-gray-200 pt-8 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
        <EmailHistoryFeature reloadKey={historyKey} />
      </div>
    </div>
  );
}
