"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  clearTokens,
  onchurchMaster,
  onchurchUser,
  type BulkEmailResult,
} from "@/lib/api-client";

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

export function MasterApp() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");

  const [state, setState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<BulkEmailResult | null>(null);

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await onchurchUser.getMe();
        if (cancelled) return;
        if (profile.role !== "master") {
          alert("마스터 계정만 접근할 수 있습니다.");
          router.push("/");
          return;
        }
        setAuthorized(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.push("/login");
          return;
        }
        alert("접근 권한을 확인할 수 없습니다.");
        router.push("/");
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
      const res = await onchurchMaster.sendBulkEmail({
        subject: subject.trim(),
        content,
        recipients,
      });
      setResult(res);
      setState("done");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof ApiError ? err.message : "발송 중 오류가 발생했습니다.");
    }
  }

  if (!checked) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">불러오는 중…</div>;
  }
  if (!authorized) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">마스터 콘솔 — 대량 메일 발송</h1>
      <p className="mt-1 text-sm text-gray-500">온교회 도입 광고 메일을 대량으로 발송합니다.</p>

      <div className="mt-8 space-y-6">
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
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "sending" ? "발송 중…" : `${recipients.length}명에게 발송`}
        </button>
      </div>
    </div>
  );
}
