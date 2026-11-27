"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  onchurchMaster,
  type SalesHomepageStatus,
  type SalesLead,
  type SalesLeadFilter,
  type SalesLeadInput,
  type SalesLeadStatus,
} from "@/lib/api-client";

// 영업 대상 교회 DB: 홈페이지가 없거나 오래된 교회를 모아 연락 상태를 관리한다.
// 교단 주소록·지도에서 모은 표를 붙여넣어 한 번에 넣고, 같은 교회(이름+전화/주소)는 서버가 건너뛴다.

const PAGE_SIZE = 50;

const STATUS: { key: SalesLeadStatus; label: string; tone: string }[] = [
  { key: "new", label: "미접촉", tone: "bg-gray-100 text-gray-700" },
  { key: "contacted", label: "연락함", tone: "bg-sky-50 text-sky-700" },
  { key: "consulting", label: "상담 중", tone: "bg-amber-50 text-amber-700" },
  { key: "trial", label: "체험 중", tone: "bg-violet-50 text-violet-700" },
  { key: "joined", label: "가입", tone: "bg-emerald-50 text-emerald-700" },
  { key: "rejected", label: "거절", tone: "bg-rose-50 text-rose-700" },
];
const STATUS_LABEL = Object.fromEntries(STATUS.map((s) => [s.key, s.label])) as Record<SalesLeadStatus, string>;
const STATUS_TONE = Object.fromEntries(STATUS.map((s) => [s.key, s.tone])) as Record<SalesLeadStatus, string>;

const HOMEPAGE: { key: SalesHomepageStatus; label: string }[] = [
  { key: "none", label: "없음" },
  { key: "blog", label: "블로그·카페만" },
  { key: "old", label: "오래됨" },
  { key: "has", label: "있음" },
  { key: "unknown", label: "모름" },
];
const HOMEPAGE_LABEL = Object.fromEntries(HOMEPAGE.map((h) => [h.key, h.label])) as Record<SalesHomepageStatus, string>;

const EMPTY: SalesLeadInput = {
  name: "",
  denomination: null,
  region: null,
  address: null,
  pastor: null,
  phone: null,
  email: null,
  homepageStatus: "unknown",
  homepageUrl: null,
  source: null,
  status: "new",
  emailConsent: false,
  memo: null,
};

function toInput(l: SalesLead): SalesLeadInput {
  return {
    name: l.name,
    denomination: l.denomination,
    region: l.region,
    address: l.address,
    pastor: l.pastor,
    phone: l.phone,
    email: l.email,
    homepageStatus: l.homepageStatus,
    homepageUrl: l.homepageUrl,
    source: l.source,
    status: l.status,
    emailConsent: l.emailConsent,
    memo: l.memo,
  };
}

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function SalesLeadsFeature() {
  const [status, setStatus] = useState<SalesLeadStatus | null>(null);
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("");
  const [homepage, setHomepage] = useState<SalesLeadFilter["homepage"]>(null);
  const [contact, setContact] = useState<SalesLeadFilter["contact"]>(null);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<SalesLead[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<SalesLeadStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<SalesLead | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [reload, setReload] = useState(0);

  const filter = useMemo<SalesLeadFilter>(
    () => ({ status, keyword: keyword.trim() || null, region: region.trim() || null, homepage, contact, page, size: PAGE_SIZE }),
    [status, keyword, region, homepage, contact, page],
  );

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      onchurchMaster
        .searchSalesLeads(filter)
        .then((r) => {
          if (!alive) return;
          setItems(r.items);
          setTotal(r.total);
          setCounts(r.counts);
          setError("");
        })
        .catch((e) => alive && setError(e instanceof ApiError ? e.message : "목록을 불러오지 못했습니다."))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [filter, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);
  const allCount = STATUS.reduce((a, s) => a + (counts[s.key] ?? 0), 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetPage<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
      setSelected(new Set());
    };
  }

  async function changeStatus(lead: SalesLead, next: SalesLeadStatus) {
    try {
      const updated = await onchurchMaster.updateSalesLead(lead.id, { ...toInput(lead), status: next });
      setItems((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "상태를 바꾸지 못했습니다.");
    }
  }

  async function removeSelected() {
    const ids = [...selected];
    if (ids.length === 0 || !confirm(`선택한 ${ids.length}곳을 목록에서 지울까요?`)) return;
    try {
      await onchurchMaster.deleteSalesLeads(ids);
      setSelected(new Set());
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "지우지 못했습니다.");
    }
  }

  async function exportCsv() {
    const all: SalesLead[] = [];
    for (let p = 1; ; p++) {
      const r = await onchurchMaster.searchSalesLeads({ ...filter, page: p, size: 200 });
      all.push(...r.items);
      if (all.length >= r.total || r.items.length === 0) break;
    }
    const head = ["교회명", "교단", "지역", "주소", "담임목사", "전화", "이메일", "홈페이지", "홈페이지 주소", "상태", "메일 수신 동의", "마지막 연락", "출처", "메모"];
    const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = all.map((l) =>
      [l.name, l.denomination, l.region, l.address, l.pastor, l.phone, l.email, HOMEPAGE_LABEL[l.homepageStatus], l.homepageUrl, STATUS_LABEL[l.status], l.emailConsent ? "동의" : "", shortDate(l.lastContactedAt), l.source, l.memo]
        .map(esc)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `영업대상_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPage = items.length > 0 && items.every((l) => selected.has(l.id));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">영업 대상</h2>
          <p className="mt-1 text-sm text-gray-500">홈페이지가 없거나 오래된 교회를 모으고 연락 상태를 기록합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" onClick={() => setImporting(true)}>
            붙여넣어 가져오기
          </button>
          <button type="button" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" onClick={() => void exportCsv()} disabled={total === 0}>
            CSV 내려받기
          </button>
          <button type="button" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing("new")}>
            교회 추가
          </button>
        </div>
      </header>

      {/* 단계별 개수 = 상태 필터 */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1" aria-label="상태">
        {[{ key: null, label: "전체", n: allCount }, ...STATUS.map((s) => ({ key: s.key, label: s.label, n: counts[s.key] ?? 0 }))].map((s) => (
          <button
            key={s.key ?? "all"}
            type="button"
            aria-pressed={status === s.key}
            onClick={() => resetPage(setStatus)(s.key)}
            className={`flex min-w-[84px] flex-1 flex-col items-start rounded-lg px-3 py-2 text-left ${status === s.key ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <span className="text-xs opacity-70">{s.label}</span>
            <span className="text-lg font-bold tabular-nums">{s.n.toLocaleString("ko-KR")}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="교회명·주소·목사·메모 검색"
          value={keyword}
          onChange={(e) => resetPage(setKeyword)(e.target.value)}
        />
        <input className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="지역 (예: 수원)" value={region} onChange={(e) => resetPage(setRegion)(e.target.value)} />
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={homepage ?? ""} onChange={(e) => resetPage(setHomepage)((e.target.value || null) as SalesLeadFilter["homepage"])}>
          <option value="">홈페이지 전체</option>
          <option value="need">필요한 곳 (없음·블로그·오래됨)</option>
          {HOMEPAGE.map((h) => (
            <option key={h.key} value={h.key}>
              홈페이지 {h.label}
            </option>
          ))}
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={contact ?? ""} onChange={(e) => resetPage(setContact)((e.target.value || null) as SalesLeadFilter["contact"])}>
          <option value="">연락처 전체</option>
          <option value="any">연락처 있음</option>
          <option value="phone">전화 있음</option>
          <option value="email">이메일 있음</option>
        </select>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm">
          <span>{selected.size}곳 선택</span>
          <button type="button" className="font-semibold text-rose-700" onClick={() => void removeSelected()}>
            지우기
          </button>
          <button type="button" className="text-gray-500" onClick={() => setSelected(new Set())}>
            선택 해제
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-gray-200 text-left text-xs text-gray-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="이 쪽 모두 선택"
                  checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(items.map((l) => l.id)))}
                />
              </th>
              <th className="px-3 py-2 font-medium">교회</th>
              <th className="px-3 py-2 font-medium">지역</th>
              <th className="px-3 py-2 font-medium">연락처</th>
              <th className="px-3 py-2 font-medium">홈페이지</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">마지막 연락</th>
              <th className="px-3 py-2 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 align-top">
                  <input type="checkbox" aria-label={`${l.name} 선택`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                </td>
                <td className="px-3 py-2 align-top">
                  <button type="button" className="text-left font-semibold text-gray-900 hover:underline" onClick={() => setEditing(l)}>
                    {l.name}
                  </button>
                  <div className="text-xs text-gray-500">{[l.denomination, l.pastor && `${l.pastor} 목사`].filter(Boolean).join(" / ") || " "}</div>
                </td>
                <td className="px-3 py-2 align-top text-gray-700">{l.region ?? <span className="text-gray-400">-</span>}</td>
                <td className="px-3 py-2 align-top">
                  {l.phone && (
                    <a className="block text-gray-900 tabular-nums hover:underline" href={`tel:${l.phone}`}>
                      {l.phone}
                    </a>
                  )}
                  {l.email && (
                    <span className="block text-xs text-gray-500">
                      {l.email}
                      {l.emailConsent && <span className="ml-1 rounded bg-emerald-50 px-1 text-emerald-700">수신 동의</span>}
                    </span>
                  )}
                  {!l.phone && !l.email && <span className="text-gray-400">-</span>}
                </td>
                <td className="px-3 py-2 align-top">
                  {l.homepageUrl ? (
                    <a className="text-gray-700 underline decoration-gray-300" href={l.homepageUrl} target="_blank" rel="noreferrer">
                      {HOMEPAGE_LABEL[l.homepageStatus]}
                    </a>
                  ) : (
                    <span className={l.homepageStatus === "none" ? "font-semibold text-gray-900" : "text-gray-500"}>{HOMEPAGE_LABEL[l.homepageStatus]}</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    aria-label={`${l.name} 상태`}
                    className={`rounded-md border-0 px-2 py-1 text-xs font-semibold ${STATUS_TONE[l.status]}`}
                    value={l.status}
                    onChange={(e) => void changeStatus(l, e.target.value as SalesLeadStatus)}
                  >
                    {STATUS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 align-top text-gray-500 tabular-nums">{shortDate(l.lastContactedAt)}</td>
                <td className="max-w-[220px] truncate px-3 py-2 align-top text-gray-500" title={l.memo ?? ""}>
                  {l.memo ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            {allCount === 0 && !keyword && !region && !homepage && !contact ? (
              <>
                아직 영업 대상이 없습니다. 교단 주소록 표를 복사해 <b>붙여넣어 가져오기</b>로 넣어 보세요.
              </>
            ) : (
              "조건에 맞는 교회가 없습니다."
            )}
          </div>
        )}
        {loading && items.length === 0 && <div className="px-6 py-12 text-center text-sm text-gray-400">불러오는 중…</div>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            이전
          </button>
          <span className="tabular-nums text-gray-600">
            {page} / {pages}
          </span>
          <button type="button" className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            다음
          </button>
        </div>
      )}

      {editing && (
        <LeadEditor
          lead={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ── 한 곳 추가·수정

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function LeadEditor({ lead, onClose, onSaved }: { lead: SalesLead | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<SalesLeadInput>(lead ? toInput(lead) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof SalesLeadInput>(k: K, v: SalesLeadInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof SalesLeadInput) => ({
    value: (form[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value || null) as never),
    className: "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
  });
  const nameMissing = !form.name.trim();

  async function save() {
    setTried(true);
    if (nameMissing) return;
    setSaving(true);
    setError("");
    try {
      if (lead) await onchurchMaster.updateSalesLead(lead.id, form);
      else await onchurchMaster.createSalesLead(form);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={lead ? lead.name : "교회 추가"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="교회명 (필수)">
          <input {...text("name")} value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus aria-invalid={tried && nameMissing} />
          {tried && nameMissing && <span className="mt-1 block text-xs text-rose-600">교회명을 입력해 주세요.</span>}
        </Field>
        <Field label="교단">
          <input {...text("denomination")} placeholder="예) 예장 통합" />
        </Field>
        <Field label="지역">
          <input {...text("region")} placeholder="예) 경기 수원시" />
        </Field>
        <Field label="담임목사">
          <input {...text("pastor")} />
        </Field>
        <Field label="주소" wide>
          <input {...text("address")} />
        </Field>
        <Field label="전화">
          <input {...text("phone")} inputMode="tel" />
        </Field>
        <Field label="이메일">
          <input {...text("email")} type="email" />
        </Field>
        <Field label="홈페이지">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.homepageStatus} onChange={(e) => set("homepageStatus", e.target.value as SalesHomepageStatus)}>
            {HOMEPAGE.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="홈페이지·블로그 주소">
          <input {...text("homepageUrl")} placeholder="https://" />
        </Field>
        <Field label="상태">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => set("status", e.target.value as SalesLeadStatus)}>
            {STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="출처">
          <input {...text("source")} placeholder="예) 예장통합 교회주소록" />
        </Field>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5" checked={form.emailConsent} onChange={(e) => set("emailConsent", e.target.checked)} />
          <span>
            소개 메일 받기에 동의함
            <span className="block text-xs text-gray-500">광고성 메일은 받는 분의 사전 동의가 있어야 보낼 수 있습니다(정보통신망법 제50조). 전화로 동의를 받은 뒤 체크하세요.</span>
          </span>
        </label>
        <Field label="메모" wide>
          <textarea {...text("memo")} rows={4} placeholder="통화 내용, 다음 연락 날짜 등" />
        </Field>
      </div>
      {lead && (
        <p className="mt-3 text-xs text-gray-400">
          마지막 연락 {shortDate(lead.lastContactedAt)} · 등록 {shortDate(lead.createdAt)}
        </p>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        {error && <span className="mr-auto text-sm text-rose-600">{error}</span>}
        <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" onClick={onClose}>
          취소
        </button>
        <button type="button" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={() => void save()} disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </Modal>
  );
}

// ── 붙여넣어 가져오기: 엑셀·구글시트에서 복사한 표(탭) 또는 CSV. 첫 줄 제목으로 칸을 맞춘다.

type ImportKey = "name" | "denomination" | "region" | "address" | "pastor" | "phone" | "email" | "homepageStatus" | "homepageUrl" | "source" | "memo";
const HEADER_ALIASES: [ImportKey, RegExp][] = [
  ["homepageUrl", /홈페이지\s*(주소|url)|^url$|사이트\s*주소|블로그\s*주소/i],
  ["homepageStatus", /홈페이지|website|homepage/i],
  ["name", /교회\s*(명|이름)?$|^이름$|^name$|church/i],
  ["denomination", /교단|노회|지방회/],
  ["region", /지역|시\s*군\s*구|시도|region/i],
  ["address", /주소|address/i],
  ["pastor", /목사|담임|pastor/i],
  ["phone", /전화|연락처|tel|phone/i],
  ["email", /메일|email|e-mail/i],
  ["source", /출처|source/i],
  ["memo", /메모|비고|memo|note/i],
];
const KEY_LABEL: Record<ImportKey, string> = {
  name: "교회명",
  denomination: "교단",
  region: "지역",
  address: "주소",
  pastor: "담임목사",
  phone: "전화",
  email: "이메일",
  homepageStatus: "홈페이지",
  homepageUrl: "홈페이지 주소",
  source: "출처",
  memo: "메모",
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseTable(text: string): { columns: (ImportKey | null)[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { columns: [], rows: [] };
  const tab = lines[0].includes("\t");
  const cells = lines.map((l) => (tab ? l.split("\t") : splitCsvLine(l)).map((c) => c.trim()));
  const used = new Set<ImportKey>();
  const columns = cells[0].map((h) => {
    const hit = HEADER_ALIASES.find(([k, re]) => !used.has(k) && re.test(h));
    if (!hit) return null;
    used.add(hit[0]);
    return hit[0];
  });
  return { columns, rows: cells.slice(1) };
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [onlyNeed, setOnlyNeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; invalid: number } | null>(null);
  const [error, setError] = useState("");
  const table = useMemo(() => parseTable(text), [text]);
  const hasName = table.columns.includes("name");

  const records = useMemo(
    () =>
      table.rows.map((cells) => {
        const r: Partial<Record<ImportKey, string>> = {};
        table.columns.forEach((k, i) => {
          if (k && cells[i]) r[k] = cells[i];
        });
        if (source.trim() && !r.source) r.source = source.trim();
        return r;
      }),
    [table, source],
  );

  async function run() {
    setBusy(true);
    setError("");
    const total = { created: 0, skipped: 0, invalid: 0 };
    try {
      let rows = records;
      if (onlyNeed) rows = rows.filter((r) => !r.homepageUrl || /blog|cafe|band|tistory/i.test(r.homepageUrl) || /없/.test(r.homepageStatus ?? ""));
      for (let i = 0; i < rows.length; i += 500) {
        const r = await onchurchMaster.importSalesLeads(rows.slice(i, i + 500));
        total.created += r.created;
        total.skipped += r.skipped;
        total.invalid += r.invalid;
        setResult({ ...total });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "가져오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="붙여넣어 가져오기" onClose={result ? onDone : onClose}>
      {result ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <b className="text-gray-900">{result.created.toLocaleString("ko-KR")}곳</b>을 새로 넣었습니다.
            {result.skipped > 0 && ` 이미 있는 ${result.skipped}곳은 건너뛰었습니다.`}
            {result.invalid > 0 && ` 교회명이 빈 ${result.invalid}줄은 뺐습니다.`}
          </p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end">
            <button type="button" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white" onClick={onDone} disabled={busy}>
              {busy ? "넣는 중…" : "확인"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            엑셀·구글 시트에서 <b>제목 줄까지</b> 복사해 붙여넣거나 CSV·TSV 파일을 고르세요. 교회명, 교단, 지역, 주소, 담임목사, 전화, 이메일, 홈페이지, 출처, 메모 제목을 알아봅니다.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold">
            파일 선택
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void file.text().then((t) => setText(t.replace(/^\uFEFF/, "")));
              }}
            />
          </label>
          <textarea
            className="h-48 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
            placeholder={"교회명\t교단\t지역\t전화\t이메일\t홈페이지\n사랑교회\t예장통합\t경기 수원시\t031-123-4567\tlove@naver.com\t홈페이지가 없습니다"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          {table.rows.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <div>
                {table.rows.length.toLocaleString("ko-KR")}줄 · 알아본 칸:{" "}
                {table.columns.filter(Boolean).map((k) => KEY_LABEL[k as ImportKey]).join(", ") || "없음"}
              </div>
              {!hasName && <div className="mt-1 font-semibold text-rose-600">첫 줄에 ‘교회명’ 제목이 있어야 가져올 수 있어요.</div>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="출처 (모든 줄에 적용)">
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)} placeholder="예) 예장통합 교회주소록" />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={onlyNeed} onChange={(e) => setOnlyNeed(e.target.checked)} />
              자체 홈페이지가 있는 교회는 빼기
            </label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => void run()}
              disabled={busy || !hasName || table.rows.length === 0}
            >
              {busy ? "넣는 중…" : `${table.rows.length.toLocaleString("ko-KR")}줄 가져오기`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button type="button" aria-label="닫기" className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
