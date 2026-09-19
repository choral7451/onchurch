"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchChurch, type MyReferral } from "@/lib/api-client";

// 추천인 이벤트 카드. '결제 · 입금 계좌' 화면 맨 위에 둔다 — 보상이 이용 기간으로 돌아오므로
// 계좌·요금표와 같은 화면에서 보는 게 자연스럽고, 사이드바 항목을 늘리지 않는다.
// 혜택: 추천받은 교회가 결제하면 양쪽 교회에 사용 기간 3개월 추가.
// 지급은 마스터가 교회 목록의 '추천' 열을 보고 수동으로 처리한다(입금 확인 시점).
export function ReferralCard() {
  const [referral, setReferral] = useState<MyReferral | null>(null);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setReferral(await onchurchChurch.getReferral());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "추천 코드를 불러오지 못했습니다.");
      }
    })();
  }, []);

  async function copyCode() {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 미지원 환경 — 무시
    }
  }

  async function applyCode() {
    const code = input.trim();
    if (!code) return;
    setApplying(true);
    setApplyError("");
    try {
      setReferral(await onchurchChurch.applyReferralCode(code));
      setInput("");
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : "추천인 코드 등록에 실패했습니다.");
    } finally {
      setApplying(false);
    }
  }

  if (loadError) return <p className="admin-template-note">{loadError}</p>;
  if (!referral) return null;

  return (
    <div className="referral-card">
      <div className="referral-head">
        <span className="referral-eyebrow">추천 이벤트</span>
        {referral.referredCount > 0 && <span className="referral-count">추천한 교회 {referral.referredCount}곳</span>}
      </div>

      <p className="referral-reward">
        추천받은 교회가 결제하면 <b>두 교회 모두 사용 기간 3개월</b>이 추가됩니다.
      </p>

      <div className="referral-block">
        <div className="referral-block-head">
          <span className="referral-block-title">우리 교회 코드</span>
          <span className="referral-block-desc">주변 교회에 알려주세요</span>
        </div>
        <div className="referral-code-row">
          <span className="referral-code">{referral.code}</span>
          <button type="button" className="btn btn-secondary" onClick={copyCode}>
            {copied ? "복사됨 ✓" : "코드 복사"}
          </button>
        </div>
      </div>

      <div className="referral-block">
        {referral.referredByChurchName ? (
          <>
            <div className="referral-block-head">
              <span className="referral-block-title">받은 추천인 코드</span>
              <span className="referral-block-desc">등록 완료</span>
            </div>
            <p className="referral-applied">
              <b>{referral.referredByChurchName}</b> 교회의 추천으로 등록되었습니다.
            </p>
          </>
        ) : referral.canApply ? (
          <>
            <div className="referral-block-head">
              <span className="referral-block-title">받은 추천인 코드</span>
              <span className="referral-block-desc">있으면 등록해주세요</span>
            </div>
            <div className="referral-apply-row">
              <input
                id="referral-input"
                type="text"
                autoComplete="off"
                placeholder="A3K9QF"
                aria-label="받은 추천인 코드"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                maxLength={10}
                disabled={applying}
              />
              <button type="button" className="btn btn-primary" onClick={applyCode} disabled={applying || !input.trim()}>
                {applying ? "등록 중" : "등록"}
              </button>
            </div>
            <span className="referral-note">결제 전까지 한 번만 등록할 수 있어요.</span>
            {applyError && <span className="referral-apply-error">{applyError}</span>}
          </>
        ) : (
          <>
            <div className="referral-block-head">
              <span className="referral-block-title">받은 추천인 코드</span>
            </div>
            <span className="referral-note">첫 결제가 확인된 뒤에는 등록할 수 없습니다.</span>
          </>
        )}
      </div>
    </div>
  );
}
