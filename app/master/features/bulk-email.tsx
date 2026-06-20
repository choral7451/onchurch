"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, onchurchMaster, type EmailLog, type EmailTemplate } from "@/lib/api-client";
import { EmailHistoryFeature } from "./email-history";

const POLL_INTERVAL_MS = 1500;

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

// 백엔드 buildHtml과 동일한 규칙으로 본문을 렌더링한다(미리보기를 실제 발송과 일치시키기 위함).
//  - HTML 태그가 포함되면: 그대로 사용(줄바꿈 변환하지 않음)
//  - 일반 텍스트면: 줄바꿈만 <br/>로 변환
function buildPreviewHtml(content: string): string {
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(content);
  return looksLikeHtml ? content : content.replace(/\r\n/g, "\n").replace(/\n/g, "<br />");
}

export function BulkEmailFeature() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");

  const [state, setState] = useState<SendState>("idle");
  const [showPreview, setShowPreview] = useState(false); // 본문 작성/미리보기 전환
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState<EmailLog | null>(null); // 발송 중 진행 상황(폴링)
  const [result, setResult] = useState<EmailLog | null>(null); // 발송 완료 결과
  const [historyKey, setHistoryKey] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 언마운트 시 진행 중인 폴링 정리
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);

  // 저장된 템플릿 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onchurchMaster.listEmailTemplates();
        if (!cancelled) setTemplates(res.items);
      } catch {
        // 템플릿 로드 실패는 발송 기능에 영향 없으므로 조용히 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 선택한 템플릿의 제목·본문을 입력란에 채운다.
  function handleLoadTemplate(idStr: string) {
    setSelectedTemplateId(idStr);
    const tpl = templates.find((t) => String(t.id) === idStr);
    if (!tpl) return;
    setSubject(tpl.subject);
    setContent(tpl.content);
  }

  // 현재 제목·본문을 새 템플릿으로 저장한다.
  async function handleSaveTemplate() {
    if (!subject.trim() || !content.trim()) {
      setErrorMsg("템플릿으로 저장하려면 제목과 본문을 입력해주세요.");
      return;
    }
    const name = prompt("템플릿 이름을 입력하세요.");
    if (!name?.trim()) return;
    try {
      const created = await onchurchMaster.createEmailTemplate({ name: name.trim(), subject: subject.trim(), content });
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplateId(String(created.id));
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "템플릿 저장에 실패했습니다.");
    }
  }

  // 선택한 템플릿을 삭제한다.
  async function handleDeleteTemplate() {
    const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
    if (!tpl) return;
    if (!confirm(`"${tpl.name}" 템플릿을 삭제할까요?`)) return;
    try {
      await onchurchMaster.deleteEmailTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      setSelectedTemplateId("");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "템플릿 삭제에 실패했습니다.");
    }
  }

  // 발송 로그를 주기적으로 조회해 진행 상황을 갱신하고, 완료되면 결과로 확정한다.
  function pollLog(logId: number) {
    const tick = async () => {
      try {
        const log = await onchurchMaster.getEmailLog(logId);
        setProgress(log);
        if (log.status === "completed") {
          setResult(log);
          setProgress(null);
          setState("done");
          setHistoryKey((k) => k + 1); // 완료 후 오른쪽 내역 새로고침
          return;
        }
      } catch {
        // 일시적 조회 실패는 무시하고 다음 주기에 재시도
      }
      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  }

  async function handleSend() {
    setErrorMsg("");
    setResult(null);
    setProgress(null);
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
      const { logId } = await onchurchMaster.sendBulkEmail({ subject: subject.trim(), content, recipients });
      // 접수 완료 — 발송은 백그라운드로 진행되며 진행 상황을 폴링한다.
      setHistoryKey((k) => k + 1); // 접수되자마자 내역에 노출
      // 발송 후 입력 초기화
      setSubject("");
      setContent("");
      setRecipientsRaw("");
      setSelectedTemplateId("");
      pollLog(logId);
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
          <label className="block text-sm font-semibold text-gray-700">템플릿</label>
          <p className="mt-1 text-xs text-gray-400">저장된 템플릿을 불러오거나, 현재 제목·본문을 템플릿으로 저장할 수 있습니다.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleLoadTemplate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            >
              <option value="">불러올 템플릿 선택…</option>
              {templates.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              템플릿으로 저장
            </button>
            <button
              type="button"
              onClick={handleDeleteTemplate}
              disabled={!selectedTemplateId}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              삭제
            </button>
          </div>
        </div>

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
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">본문</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-xs font-medium">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-3 py-1.5 transition ${!showPreview ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                작성
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-3 py-1.5 transition ${showPreview ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                미리보기
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">줄바꿈은 그대로 반영됩니다. HTML 태그(링크 등)도 사용할 수 있습니다.</p>
          {showPreview ? (
            <div className="mt-2 min-h-[18rem] w-full overflow-auto rounded-lg border border-gray-300 bg-white px-3 py-2">
              {content.trim() ? (
                <div
                  style={{ fontFamily: "'Apple SD Gothic Neo', sans-serif", fontSize: 15, lineHeight: 1.7, color: "#222" }}
                  className="break-words"
                  dangerouslySetInnerHTML={{ __html: buildPreviewHtml(content) }}
                />
              ) : (
                <p className="text-sm text-gray-400">미리볼 본문이 없습니다.</p>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="메일 본문을 입력하세요."
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          )}
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

        {state === "sending" && (
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">발송 중…</p>
            {progress ? (
              <>
                <p className="mt-1">
                  {progress.sent + progress.failed + progress.excluded} / {progress.total} 처리됨 (성공 {progress.sent} · 제외{" "}
                  {progress.excluded} · 실패 {progress.failed})
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${progress.total ? Math.round(((progress.sent + progress.failed + progress.excluded) / progress.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1">발송을 접수했습니다. 진행 상황을 불러오는 중…</p>
            )}
            <p className="mt-2 text-xs text-blue-600">이 창을 닫아도 발송은 백그라운드에서 계속 진행됩니다.</p>
          </div>
        )}

        {result && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold">발송 완료</p>
            <p className="mt-1">
              총 {result.total}명 중 성공 {result.sent}명 · 제외 {result.excluded}명 · 실패 {result.failed}명
            </p>
            {result.results.filter((r) => r.status !== "sent").length > 0 && (
              <ul className="mt-2 space-y-0.5 pl-1 text-xs">
                {result.results
                  .filter((r) => r.status !== "sent")
                  .map((r) => (
                    <li key={r.email} className={r.status === "failed" ? "text-red-600" : "text-amber-700"}>
                      [{r.status === "failed" ? "실패" : "제외"}] {r.email} — {r.reason}
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
