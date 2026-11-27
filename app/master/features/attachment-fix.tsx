"use client";

import { useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview } from "@/lib/api-client";

// 이미 옮긴 교회소식의 첨부파일(주보 PDF 등)을 온교회 저장소로 옮겨 '첨부파일'로 붙이고, 본문의 원래 링크는 지운다.
// 원래 글을 다시 읽어서 처리하므로 원래 사이트가 아직 열려 있어야 한다. 여러 번 눌러도 겹치지 않는다.
const BATCH = 10;

export function AttachmentFixTool({ church, sourceUrl }: { church: ChurchOverview; sourceUrl: string }) {
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<{ done: number; total: number; updated: number; errors: string[]; finished: boolean } | null>(null);
  const [message, setMessage] = useState("");

  async function run() {
    setMessage("");
    setRunning(true);
    const acc = { done: 0, total: 0, updated: 0, errors: [] as string[], finished: false };
    setState({ ...acc });
    let offset: number | null = 0;
    try {
      while (offset !== null) {
        const res = await onchurchMaster.fixImportedNoticeAttachments(church.id, sourceUrl.trim(), offset, BATCH);
        acc.done = offset + res.checked;
        acc.total = res.total;
        acc.updated += res.updated;
        acc.errors = [...acc.errors, ...res.errors].slice(-30);
        acc.finished = res.nextOffset === null;
        setState({ ...acc });
        offset = res.nextOffset;
      }
    } catch (err) {
      setMessage(`${acc.done}번째에서 멈췄습니다: ${err instanceof ApiError ? err.message : "알 수 없는 오류"} — 다시 누르면 이어서 처리합니다.`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">이미 옮긴 교회소식에 첨부파일 붙이기</h3>
      <p className="mt-1 text-sm text-gray-500">본문에 원래 사이트 링크로 남은 주보 PDF·한글 파일을 온교회 저장소로 옮겨 첨부파일로 붙입니다. 원래 사이트가 열려 있을 때 해야 합니다.</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40" onClick={() => void run()} disabled={running || !sourceUrl.trim()}>
          {running ? `처리 중… ${state?.done ?? 0}/${state?.total || "?"}` : "첨부파일 옮기기"}
        </button>
        {!sourceUrl.trim() && <span className="text-xs text-gray-500">위에 원래 홈페이지 주소를 넣어 주세요</span>}
      </div>
      {message && <p className="mt-3 text-sm text-red-700" role="alert">{message}</p>}
      {state && (
        <p className="mt-3 text-sm text-gray-700" role="status">
          {state.finished ? "완료 — " : ""}교회소식 {state.done.toLocaleString()}/{state.total.toLocaleString()}개 확인 · 첨부파일 붙임 <strong>{state.updated.toLocaleString()}</strong>개
        </p>
      )}
      {state && state.errors.length > 0 && (
        <ul className="mt-2 max-h-32 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {state.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </section>
  );
}
