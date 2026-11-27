"use client";

import { useRef, useState } from "react";
import { ApiError, onchurchMaster, type ChurchOverview, type WordpressImportTarget } from "@/lib/api-client";

// 다른 교회 홈페이지(워드프레스)의 글을 온교회 교회로 옮긴다.
// 서버가 한 번에 한 쪽(PER_PAGE 개)씩 오래된 글부터 옮기고, 이 화면이 다음 쪽을 이어 부른다.
// 이미 옮긴 글은 서버가 기록해 두므로 중간에 멈췄다가 다시 시작해도 겹치지 않는다.
const PER_PAGE = 10;

type Choice = WordpressImportTarget | "skip";
type Row = { id: number; name: string; count: number; target: Choice; targetName: string };

const TARGET_LABEL: Record<Choice, string> = {
  skip: "옮기지 않음",
  sermon: "설교",
  notice: "교회소식",
  gallery: "갤러리",
  community: "교제 게시판",
};

// 카테고리 이름으로 옮길 곳을 미리 골라 둔다(바꿀 수 있다).
function guessTarget(name: string): Choice {
  if (/설교|말씀\s*영상|sermon/i.test(name)) return "sermon";
  if (/소식|주보|공지|광고/.test(name)) return "notice";
  if (/사진|앨범|갤러리|영상/.test(name)) return "gallery";
  if (/말씀|기도|은혜|묵상|큐티|글/.test(name)) return "community";
  return "skip";
}

type Progress = { page: number; totalPages: number; imported: number; skipped: number; failed: number; errors: string[]; done: boolean };

export function ContentImportFeature() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [churches, setChurches] = useState<ChurchOverview[]>([]);
  const [church, setChurch] = useState<ChurchOverview | null>(null);
  const [pastorName, setPastorName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);

  async function loadCategories() {
    setError("");
    setLoadingCats(true);
    try {
      const res = await onchurchMaster.listWordpressCategories(sourceUrl.trim());
      setRows(res.categories.filter((c) => c.count > 0).map((c) => ({ ...c, target: guessTarget(c.name), targetName: c.name })));
    } catch (err) {
      setRows(null);
      setError(err instanceof ApiError ? err.message : "카테고리를 불러오지 못했습니다.");
    } finally {
      setLoadingCats(false);
    }
  }

  async function searchChurches() {
    setError("");
    try {
      const res = await onchurchMaster.listChurches({ keyword, publishedOnly: false, page: 1, size: 10 });
      setChurches(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "교회를 찾지 못했습니다.");
    }
  }

  function pickChurch(c: ChurchOverview) {
    setChurch(c);
    setChurches([]);
    setPastorName(c.pastorName ?? "");
    setAuthorName(c.name);
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
  }

  const mappings = (rows ?? [])
    .filter((r) => r.target !== "skip" && r.targetName.trim())
    .map((r) => ({ categoryId: r.id, name: r.targetName.trim(), target: r.target as WordpressImportTarget }));
  const totalPosts = (rows ?? []).filter((r) => r.target !== "skip").reduce((n, r) => n + r.count, 0);
  const canStart = !!church && mappings.length > 0 && !!authorName.trim() && !running;

  async function start() {
    if (!church || !canStart) return;
    if (!confirm(`${church.name}(${church.slug})에 글 약 ${totalPosts.toLocaleString()}개를 옮길까요?\n이미 옮긴 글은 건너뜁니다.`)) return;
    setError("");
    setRunning(true);
    stopRef.current = false;
    const acc: Progress = { page: 0, totalPages: 0, imported: 0, skipped: 0, failed: 0, errors: [], done: false };
    setProgress({ ...acc });
    let page: number | null = 1;
    try {
      while (page !== null && !stopRef.current) {
        const res = await onchurchMaster.importWordpressPage(church.id, {
          sourceUrl: sourceUrl.trim(),
          mappings,
          pastorName: pastorName.trim() || null,
          authorName: authorName.trim(),
          page,
          perPage: PER_PAGE,
        });
        acc.page = page;
        acc.totalPages = res.totalPages;
        acc.imported += res.imported;
        acc.skipped += res.skipped;
        acc.failed += res.failed;
        acc.errors = [...acc.errors, ...res.errors].slice(-50);
        acc.done = res.nextPage === null;
        setProgress({ ...acc });
        page = res.nextPage;
      }
    } catch (err) {
      setError(`${acc.page + 1}쪽에서 멈췄습니다: ${err instanceof ApiError ? err.message : "알 수 없는 오류"} — 다시 시작하면 이어서 옮깁니다.`);
    } finally {
      setRunning(false);
    }
  }

  const pct = progress && progress.totalPages ? Math.round((progress.page / progress.totalPages) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900">콘텐츠 가져오기</h2>
      <p className="mt-1 text-sm text-gray-500">
        교회가 쓰던 워드프레스 홈페이지의 설교·소식·사진·글을 온교회 교회로 옮깁니다. 원래 날짜를 그대로 쓰고, 사진은 온교회 저장소로 옮기며, 앱 알림은 보내지 않습니다.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">1. 원래 홈페이지</h3>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="예) http://chambit.org"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            disabled={running}
          />
          <button type="button" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={() => void loadCategories()} disabled={!sourceUrl.trim() || loadingCats || running}>
            {loadingCats ? "불러오는 중…" : "카테고리 불러오기"}
          </button>
        </div>

        {rows && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 font-medium">원래 카테고리</th>
                <th className="py-2 font-medium">글 수</th>
                <th className="py-2 font-medium">옮길 곳</th>
                <th className="py-2 font-medium">온교회 카테고리 이름</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{r.name}</td>
                  <td className="py-2 text-gray-500">{r.count.toLocaleString()}</td>
                  <td className="py-2">
                    <select className="rounded-md border border-gray-300 px-2 py-1" value={r.target} onChange={(e) => updateRow(r.id, { target: e.target.value as Choice })} disabled={running} aria-label={`${r.name} 옮길 곳`}>
                      {(Object.keys(TARGET_LABEL) as Choice[]).map((k) => (
                        <option key={k} value={k}>{TARGET_LABEL[k]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      className="w-full rounded-md border border-gray-300 px-2 py-1 disabled:bg-gray-50 disabled:text-gray-400"
                      value={r.targetName}
                      maxLength={50}
                      onChange={(e) => updateRow(r.id, { targetName: e.target.value })}
                      disabled={running || r.target === "skip"}
                      aria-label={`${r.name} 온교회 카테고리 이름`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows && <p className="mt-2 text-xs text-gray-500">설교는 카테고리 이름이 설교 시리즈가 되고, 사진이 없는 갤러리 글은 건너뜁니다.</p>}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">2. 옮길 교회</h3>
        {church ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span><strong>{church.name}</strong> <span className="text-gray-500">{church.slug}.everychurch.co.kr</span></span>
            <button type="button" className="text-gray-500 underline disabled:opacity-40" onClick={() => setChurch(null)} disabled={running}>바꾸기</button>
          </div>
        ) : (
          <>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void searchChurches(); }}>
              <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="교회 이름 또는 서브도메인" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">찾기</button>
            </form>
            {churches.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                {churches.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => pickChurch(c)}>
                      <span>{c.name}</span>
                      <span className="text-gray-500">{c.slug}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {church && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-gray-600">설교자 이름</span>
              <input className="rounded-lg border border-gray-300 px-3 py-2" value={pastorName} onChange={(e) => setPastorName(e.target.value)} disabled={running} placeholder="예) 홍길동 목사" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-600">교제 글 작성자 이름 *</span>
              <input className="rounded-lg border border-gray-300 px-3 py-2" value={authorName} onChange={(e) => setAuthorName(e.target.value)} disabled={running} />
            </label>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">3. 옮기기</h3>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={() => void start()} disabled={!canStart}>
            {progress && !progress.done && !running ? "이어서 옮기기" : "옮기기 시작"}
          </button>
          {running && (
            <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" onClick={() => { stopRef.current = true; }}>
              멈추기
            </button>
          )}
          {!canStart && !running && <span className="text-xs text-gray-500">{!rows ? "카테고리를 불러오세요" : mappings.length === 0 ? "옮길 카테고리를 하나 이상 고르세요" : !church ? "옮길 교회를 고르세요" : "작성자 이름을 입력하세요"}</span>}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {progress.done ? "완료 — " : running ? `${progress.page}/${progress.totalPages || "?"}쪽 — ` : "멈춤 — "}
              옮김 <strong>{progress.imported.toLocaleString()}</strong> · 건너뜀 {progress.skipped.toLocaleString()} · 실패 {progress.failed.toLocaleString()}
            </p>
            {progress.errors.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {progress.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
