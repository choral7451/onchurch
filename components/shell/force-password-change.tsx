"use client";

import { useState } from "react";
import { ApiError, onchurchUser } from "@/lib/api-client";

/**
 * 위저드(임시비밀번호)로 생성된 계정이 관리자 콘솔 최초 진입 시 강제로 뜨는 비밀번호 변경 모달.
 * 변경 성공 전까지 닫을 수 없다(배경 클릭·ESC·닫기 버튼 없음).
 * 임시 비밀번호 입력 없이 새 비밀번호만 설정한다(인증 + mustChangePassword 플래그로 검증).
 */
export function ForcePasswordChangeModal({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = pw.length >= 8 && pw === pwConfirm && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      setErrMsg("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pw !== pwConfirm) {
      setErrMsg("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    setErrMsg("");
    try {
      await onchurchUser.setInitialPassword({ newPassword: pw });
      onDone();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="recovery-modal-backdrop" role="dialog" aria-modal="true" aria-label="비밀번호 변경" style={{ zIndex: 3000 }}>
      <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>비밀번호 변경이 필요합니다</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
          문자로 받으신 임시 비밀번호로 로그인하셨습니다. 보안을 위해 새 비밀번호로 변경한 뒤 이용해주세요.
        </p>
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="form-row full">
            <label htmlFor="fpc-new">새 비밀번호</label>
            <input
              id="fpc-new"
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="8자 이상"
              minLength={8}
              required
            />
          </div>
          <div className="form-row full">
            <label htmlFor="fpc-new2">새 비밀번호 확인</label>
            <input
              id="fpc-new2"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="새 비밀번호를 다시 입력해주세요"
              minLength={8}
              required
            />
            {pwConfirm.length > 0 && pw !== pwConfirm && (
              <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>비밀번호가 일치하지 않습니다.</span>
            )}
          </div>
          {errMsg && <div className="auth-error">{errMsg}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!canSubmit}
            style={{ width: "100%", justifyContent: "center", opacity: canSubmit ? 1 : 0.6 }}
          >
            {submitting ? "변경 중..." : "비밀번호 변경하고 시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
