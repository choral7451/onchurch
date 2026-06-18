"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, onchurchMaster, type BulkSmsResult, type SmsTemplate } from "@/lib/api-client";
import { SmsHistoryFeature } from "./sms-history";

const SMS_CONTENT_MAX_BYTES = 2000;

// 한글 등 멀티바이트 문자는 2바이트, ASCII는 1바이트로 계산 (국내 문자 발송 바이트 기준).
function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return bytes;
}

// 붙여넣은 텍스트(줄바꿈/쉼표/세미콜론/공백 구분)에서 휴대폰 번호 목록을 추출한다. 숫자만 남기고 중복 제거.
function parseRecipients(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const phone = piece.replace(/[^0-9]/g, "");
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    out.push(phone);
  }
  return out;
}

type SendState = "idle" | "sending" | "done" | "error";

export function BulkSmsFeature() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");

  const [state, setState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<BulkSmsResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);
  const contentBytes = useMemo(() => smsByteLength(content), [content]);
  const overByteLimit = contentBytes > SMS_CONTENT_MAX_BYTES;

  // 저장된 템플릿 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onchurchMaster.listSmsTemplates();
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
    if (overByteLimit) {
      setErrorMsg(`본문은 최대 ${SMS_CONTENT_MAX_BYTES}바이트까지 입력할 수 있습니다.`);
      return;
    }
    const name = prompt("템플릿 이름을 입력하세요.");
    if (!name?.trim()) return;
    try {
      const created = await onchurchMaster.createSmsTemplate({ name: name.trim(), subject: subject.trim(), content });
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
      await onchurchMaster.deleteSmsTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      setSelectedTemplateId("");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "템플릿 삭제에 실패했습니다.");
    }
  }

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
    if (overByteLimit) {
      setErrorMsg(`본문은 최대 ${SMS_CONTENT_MAX_BYTES}바이트까지 입력할 수 있습니다.`);
      return;
    }
    if (recipients.length === 0) {
      setErrorMsg("수신자 번호를 1명 이상 입력해주세요.");
      return;
    }
    if (!confirm(`${recipients.length}명에게 문자를 발송합니다. 진행할까요?`)) return;

    setState("sending");
    try {
      const res = await onchurchMaster.sendBulkSms({ subject: subject.trim(), content, recipients });
      setResult(res);
      setState("done");
      setHistoryKey((k) => k + 1); // 발송 후 오른쪽 내역 새로고침
      // 발송 후 입력 초기화
      setSubject("");
      setContent("");
      setRecipientsRaw("");
      setSelectedTemplateId("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof ApiError ? err.message : "발송 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
      {/* 왼쪽: 발송 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">대량 문자 발송</h2>
        <p className="mt-1 text-sm text-gray-500">온교회 도입 광고 문자를 대량으로 발송합니다.</p>

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
            maxLength={40}
            placeholder="문자 제목 (장문 문자 제목)"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>본문</span>
            <span className={`text-xs font-normal ${overByteLimit ? "text-red-600" : "text-gray-400"}`}>
              {contentBytes} / {SMS_CONTENT_MAX_BYTES} 바이트
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-400">한글은 2바이트로 계산됩니다. 90바이트 이하는 단문(SMS), 초과 시 장문(LMS)으로 발송됩니다.</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="문자 본문을 입력하세요."
            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              overByteLimit ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-gray-900"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            수신자 번호 <span className="text-gray-400">({recipients.length}명)</span>
          </label>
          <p className="mt-1 text-xs text-gray-400">줄바꿈, 쉼표(,), 세미콜론(;)으로 구분해 붙여넣으세요. 하이픈은 무시되며 중복은 자동 제거됩니다.</p>
          <textarea
            value={recipientsRaw}
            onChange={(e) => setRecipientsRaw(e.target.value)}
            rows={8}
            placeholder={"010-1234-5678\n01098765432, 010 1111 2222"}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        {errorMsg && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

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
                    <li key={r.phone} className={r.status === "failed" ? "text-red-600" : "text-amber-700"}>
                      [{r.status === "failed" ? "실패" : "제외"}] {r.phone} — {r.reason}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={state === "sending" || overByteLimit}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "sending" ? "발송 중…" : `${recipients.length}명에게 발송`}
        </button>
        </div>
      </div>

      {/* 오른쪽: 발송 내역 */}
      <div className="border-t border-gray-200 pt-8 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
        <SmsHistoryFeature reloadKey={historyKey} />
      </div>
    </div>
  );
}
