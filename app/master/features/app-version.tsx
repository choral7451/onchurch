"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchMaster, type AppPlatform, type MasterAppVersion } from "@/lib/api-client";

const PLATFORM_LABEL: Record<AppPlatform, string> = { ios: "iOS (App Store)", android: "Android (Google Play)" };
const PLATFORM_ORDER: AppPlatform[] = ["ios", "android"];

// 서버와 같은 규칙 — 숫자와 점만, 1~4마디 (1 · 1.1 · 1.2.3)
const VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppVersionFeature() {
  const [versions, setVersions] = useState<MasterAppVersion[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await onchurchMaster.listAppVersions();
        if (!cancelled) setVersions(res.versions);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "앱 버전 설정을 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900">앱 버전</h2>
      <p className="mt-1 text-sm text-gray-500">
        온교회 앱이 켜질 때 이 값을 확인합니다. <strong className="text-gray-700">최소 버전</strong>보다 낮은 앱은 업데이트해야만 쓸 수 있고,{" "}
        <strong className="text-gray-700">최신 버전</strong>보다 낮은 앱에는 업데이트 안내만 한 번 띄웁니다.
      </p>

      {loadError && <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
      {!versions && !loadError && <p className="mt-6 text-sm text-gray-500">불러오는 중…</p>}

      {versions && (
        <div className="mt-6 space-y-6">
          {PLATFORM_ORDER.map((platform) => {
            const row = versions.find((v) => v.platform === platform);
            if (!row) return null;
            // 저장하면 updatedAt 이 바뀌어 폼이 저장된 값으로 다시 만들어진다.
            return <PlatformForm key={`${platform}-${row.updatedAt}`} row={row} onSaved={setVersions} />;
          })}
        </div>
      )}
    </div>
  );
}

function PlatformForm({ row, onSaved }: { row: MasterAppVersion; onSaved: (versions: MasterAppVersion[]) => void }) {
  const [minVersion, setMinVersion] = useState(row.minVersion);
  const [latestVersion, setLatestVersion] = useState(row.latestVersion ?? "");
  const [message, setMessage] = useState(row.message ?? "");
  const [storeUrl, setStoreUrl] = useState(row.storeUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const min = minVersion.trim();
  const latest = latestVersion.trim();
  const url = storeUrl.trim();
  const minInvalid = !VERSION_PATTERN.test(min);
  const latestInvalid = latest !== "" && !VERSION_PATTERN.test(latest);
  const urlInvalid = url !== "" && !/^https:\/\/\S+$/.test(url);
  const dirty =
    min !== row.minVersion || latest !== (row.latestVersion ?? "") || message.trim() !== (row.message ?? "") || url !== (row.storeUrl ?? "");
  const canSave = dirty && !minInvalid && !latestInvalid && !urlInvalid && !saving;

  async function save() {
    // 최소 버전을 올리면 그 아래 버전 사용자는 즉시 앱을 못 쓰게 되므로 한 번 확인한다.
    if (min !== row.minVersion && !confirm(`${PLATFORM_LABEL[row.platform]} 최소 버전을 ${row.minVersion} → ${min} 로 바꿉니다.\n${min} 보다 낮은 앱은 업데이트 전까지 사용할 수 없습니다. 저장할까요?`)) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await onchurchMaster.saveAppVersion(row.platform, {
        minVersion: min,
        latestVersion: latest || null,
        message: message.trim() || null,
        storeUrl: url || null,
      });
      onSaved(res.versions);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "저장하지 못했습니다.");
      setSaving(false);
    }
  }

  const inputClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";
  const id = (name: string) => `appver-${row.platform}-${name}`;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900">{PLATFORM_LABEL[row.platform]}</h3>
        <span className="text-xs text-gray-400">마지막 저장 {formatDate(row.updatedAt)}</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id("min")} className="block text-sm font-semibold text-gray-700">
            최소 버전 <span className="text-gray-400">(강제 업데이트)</span>
          </label>
          <input id={id("min")} value={minVersion} onChange={(e) => setMinVersion(e.target.value)} inputMode="decimal" placeholder="1.0.0" className={inputClass} aria-invalid={minInvalid} />
          {minInvalid && <p className="mt-1 text-xs text-red-600">숫자와 점으로 적어주세요. 예: 1.2.0</p>}
        </div>
        <div>
          <label htmlFor={id("latest")} className="block text-sm font-semibold text-gray-700">
            최신 버전 <span className="text-gray-400">(선택 안내 · 비워도 됨)</span>
          </label>
          <input id={id("latest")} value={latestVersion} onChange={(e) => setLatestVersion(e.target.value)} inputMode="decimal" placeholder="1.2.0" className={inputClass} aria-invalid={latestInvalid} />
          {latestInvalid && <p className="mt-1 text-xs text-red-600">숫자와 점으로 적어주세요. 예: 1.2.0</p>}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor={id("message")} className="block text-sm font-semibold text-gray-700">
          안내 문구 <span className="text-gray-400">(비우면 기본 문구)</span>
        </label>
        <textarea id={id("message")} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2} placeholder="안정적인 이용을 위해 최신 버전으로 업데이트해 주세요." className={inputClass} />
      </div>

      <div className="mt-4">
        <label htmlFor={id("store")} className="block text-sm font-semibold text-gray-700">
          스토어 주소 <span className="text-gray-400">(업데이트 버튼이 여는 주소)</span>
        </label>
        <input id={id("store")} value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} inputMode="url" placeholder={row.platform === "ios" ? "https://apps.apple.com/kr/app/id0000000000" : "https://play.google.com/store/apps/details?id=…"} className={inputClass} aria-invalid={urlInvalid} />
        {urlInvalid ? (
          <p className="mt-1 text-xs text-red-600">https:// 로 시작하는 주소를 적어주세요.</p>
        ) : url === "" && row.effectiveStoreUrl ? (
          <p className="mt-1 break-all text-xs text-gray-500">비워두면 기본 주소를 씁니다: {row.effectiveStoreUrl}</p>
        ) : url === "" ? (
          <p className="mt-1 text-xs text-amber-700">아직 주소가 없어 앱의 업데이트 버튼이 스토어를 열지 못합니다. App Store 에 앱이 등록되면 주소를 넣어주세요.</p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={!canSave} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300">
          {saving ? "저장 중…" : "저장"}
        </button>
        {errorMsg && <span className="text-sm text-red-600">{errorMsg}</span>}
        {!errorMsg && !dirty && <span className="text-sm text-gray-400">저장된 상태입니다</span>}
      </div>
    </section>
  );
}
