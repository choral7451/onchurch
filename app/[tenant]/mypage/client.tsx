"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Lang, pick } from "@/lib/i18n";
import {
  ApiError,
  clearTokens,
  getCurrentUserId,
  getCurrentUserName,
  isLoggedInForChurch,
  onchurchAuth,
  onchurchCommunity,
  onchurchUser,
  type CommunityPost,
} from "@/lib/api-client";

const CODE_TTL_SECONDS = 300;
type PhoneStatus = "idle" | "code-sent" | "verifying" | "verified";

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function MyPageClient({ slug, loginHref, communityHref, lang = "ko" }: { slug: string; loginHref: string; communityHref: string; lang?: Lang }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState<string>(pick(lang, { ko: "성도", en: "Member" }));
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);

  // 회원정보 수정
  const [loginId, setLoginId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [origPhone, setOrigPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // 휴대폰 재인증 (번호 변경 시)
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [code, setCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [phoneMsg, setPhoneMsg] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const phoneChanged = editPhone.trim() !== origPhone.trim();
  const phoneVerified = !phoneChanged || phoneStatus === "verified";

  useEffect(() => {
    if (phoneStatus !== "code-sent" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phoneStatus, secondsLeft]);

  function onEditPhone(v: string) {
    setEditPhone(formatPhone(v));
    setPhoneStatus("idle");
    setCode("");
    setPhoneMsg(null);
  }

  const digitsOnly = (s: string) => s.replace(/[^0-9]/g, "");

  async function sendPhoneCode() {
    if (digitsOnly(editPhone).length < 10) { setPhoneMsg({ kind: "error", text: pick(lang, { ko: "올바른 휴대전화 번호를 입력해주세요.", en: "Please enter a valid mobile phone number." }) }); return; }
    setPhoneSending(true);
    setPhoneMsg(null);
    try {
      await onchurchAuth.sendVerification(editPhone);
      setPhoneStatus("code-sent");
      setSecondsLeft(CODE_TTL_SECONDS);
      setPhoneMsg({ kind: "info", text: pick(lang, { ko: "인증번호가 발송되었습니다. 5분 안에 입력해주세요.", en: "A verification code has been sent. Please enter it within 5 minutes." }) });
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "인증번호 발송에 실패했습니다.", en: "Failed to send the verification code." }) });
    } finally {
      setPhoneSending(false);
    }
  }

  async function verifyPhoneCode() {
    if (!/^\d{6}$/.test(code)) { setPhoneMsg({ kind: "error", text: pick(lang, { ko: "6자리 숫자 인증번호를 입력해주세요.", en: "Please enter the 6-digit verification code." }) }); return; }
    if (secondsLeft <= 0) { setPhoneMsg({ kind: "error", text: pick(lang, { ko: "인증번호가 만료되었습니다. 다시 발송해주세요.", en: "The verification code has expired. Please send a new one." }) }); return; }
    setPhoneStatus("verifying");
    setPhoneMsg(null);
    try {
      await onchurchAuth.verifyCode(editPhone, code);
      setPhoneStatus("verified");
      setPhoneMsg({ kind: "success", text: pick(lang, { ko: "휴대폰 인증이 완료되었습니다.", en: "Phone verification complete." }) });
    } catch (err) {
      setPhoneStatus("code-sent");
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "인증번호 검증에 실패했습니다.", en: "Failed to verify the code." }) });
    }
  }

  // 비밀번호 변경
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const ok = isLoggedInForChurch(slug);
    setLoggedIn(ok);
    if (!ok) { setReady(true); return; }
    setName(getCurrentUserName() ?? pick(lang, { ko: "성도", en: "Member" }));
    const myId = getCurrentUserId();
    (async () => {
      try {
        const [profile, postsRes] = await Promise.all([
          onchurchUser.getMe().catch(() => null),
          onchurchCommunity.listPublic(slug, { size: 100 }).catch(() => ({ posts: [], totalCount: 0 })),
        ]);
        if (profile) {
          setName(profile.name);
          setLoginId(profile.loginId);
          setEditName(profile.name);
          setEditPhone(profile.phone);
          setOrigPhone(profile.phone);
        }
        setMyPosts((postsRes.posts ?? []).filter((p) => myId != null && p.authorId === myId));
      } finally {
        setReady(true);
      }
    })();
  }, [slug]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (profileSaving) return;
    if (!editName.trim()) { setProfileMsg({ kind: "error", text: pick(lang, { ko: "이름을 입력해주세요.", en: "Please enter your name." }) }); return; }
    if (phoneChanged && !phoneVerified) { setProfileMsg({ kind: "error", text: pick(lang, { ko: "변경한 휴대폰 번호의 인증을 완료해주세요.", en: "Please verify your new phone number." }) }); return; }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await onchurchUser.updateProfile({ name: editName.trim(), phone: editPhone.trim() });
      setName(updated.name);
      setOrigPhone(updated.phone);
      setPhoneStatus("idle");
      setCode("");
      setPhoneMsg(null);
      setProfileMsg({ kind: "success", text: pick(lang, { ko: "회원정보가 저장되었습니다.", en: "Your profile has been saved." }) });
    } catch (err) {
      setProfileMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "저장에 실패했습니다.", en: "Failed to save." }) });
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwSaving) return;
    if (newPw.length < 8) { setPwMsg({ kind: "error", text: pick(lang, { ko: "새 비밀번호는 8자 이상이어야 합니다.", en: "The new password must be at least 8 characters." }) }); return; }
    if (newPw !== newPw2) { setPwMsg({ kind: "error", text: pick(lang, { ko: "새 비밀번호가 일치하지 않습니다.", en: "The new passwords do not match." }) }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await onchurchUser.changePassword({ currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw(""); setNewPw2("");
      setPwMsg({ kind: "success", text: pick(lang, { ko: "비밀번호가 변경되었습니다.", en: "Your password has been changed." }) });
    } catch (err) {
      setPwMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "비밀번호 변경에 실패했습니다.", en: "Failed to change the password." }) });
    } finally {
      setPwSaving(false);
    }
  }

  function logout() {
    clearTokens();
    router.push(communityHref);
    router.refresh();
  }

  if (!ready) return <p style={{ color: "var(--muted)" }}>{pick(lang, { ko: "불러오는 중...", en: "Loading..." })}</p>;

  if (!loggedIn) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>{pick(lang, { ko: "로그인이 필요합니다.", en: "Login required." })}</p>
        <Link href={loginHref} className="btn btn-primary">{pick(lang, { ko: "로그인 / 성도 가입", en: "Log in / Sign up" })}</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card" style={{ padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{pick(lang, { ko: "안녕하세요", en: "Hello" })}</div>
          <strong style={{ fontSize: 20 }}>{pick(lang, { ko: `${name} 님`, en: name })}</strong>
        </div>
        <button type="button" className="btn btn-ghost" onClick={logout}>{pick(lang, { ko: "로그아웃", en: "Log out" })}</button>
      </div>

      {/* 회원정보 수정 */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{pick(lang, { ko: "회원정보 수정", en: "Edit Profile" })}</h3>
        <form className="card" style={{ padding: 24 }} onSubmit={saveProfile}>
          {profileMsg && <div className={`phone-msg phone-msg-${profileMsg.kind === "success" ? "success" : "error"}`} style={{ marginBottom: 16 }}>{profileMsg.text}</div>}
          <div className="form-grid">
            <div className="form-row">
              <label>{pick(lang, { ko: "아이디", en: "ID" })}</label>
              <input type="text" value={loginId} disabled readOnly />
            </div>
            <div className="form-row">
              <label>{pick(lang, { ko: "이름", en: "Name" })} <span className="req">*</span></label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={pick(lang, { ko: "이름", en: "Name" })} required />
            </div>
            <div className="form-row full">
              <label>
                {pick(lang, { ko: "연락처", en: "Phone" })}
                {phoneChanged && phoneStatus === "verified" && <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>{pick(lang, { ko: "· 인증 완료", en: "· Verified" })}</span>}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input type="tel" inputMode="numeric" value={editPhone} onChange={(e) => onEditPhone(e.target.value)} placeholder="010-0000-0000" />
                {phoneChanged && phoneStatus !== "verified" && (
                  <button type="button" className="btn btn-secondary" onClick={sendPhoneCode} disabled={phoneSending || digitsOnly(editPhone).length < 10} style={{ whiteSpace: "nowrap" }}>
                    {phoneSending ? pick(lang, { ko: "발송 중...", en: "Sending..." }) : phoneStatus === "idle" ? pick(lang, { ko: "인증번호 발송", en: "Send code" }) : pick(lang, { ko: "재발송", en: "Resend" })}
                  </button>
                )}
              </div>
              {phoneChanged && (phoneStatus === "code-sent" || phoneStatus === "verifying") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
                  <div style={{ position: "relative" }}>
                    <input ref={codeInputRef} type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder={pick(lang, { ko: "6자리 인증번호", en: "6-digit code" })} style={{ paddingRight: 64, width: "100%", letterSpacing: "0.2em" }} />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: 12, color: secondsLeft <= 30 ? "oklch(0.55 0.15 28)" : "var(--muted)" }}>
                      {`${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}
                    </span>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={verifyPhoneCode} disabled={code.length < 6 || secondsLeft <= 0 || phoneStatus === "verifying"} style={{ whiteSpace: "nowrap" }}>
                    {phoneStatus === "verifying" ? pick(lang, { ko: "확인 중...", en: "Verifying..." }) : pick(lang, { ko: "확인", en: "Verify" })}
                  </button>
                </div>
              )}
              {phoneMsg && <div className={`phone-msg phone-msg-${phoneMsg.kind}`} style={{ marginTop: 8 }}>{phoneMsg.text}</div>}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={profileSaving || !editName.trim() || (phoneChanged && !phoneVerified)}>
              {profileSaving ? pick(lang, { ko: "저장 중...", en: "Saving..." }) : pick(lang, { ko: "회원정보 저장", en: "Save Profile" })}
            </button>
          </div>
        </form>
      </div>

      {/* 비밀번호 변경 */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{pick(lang, { ko: "비밀번호 변경", en: "Change Password" })}</h3>
        <form className="card" style={{ padding: 24 }} onSubmit={changePassword}>
          {pwMsg && <div className={`phone-msg phone-msg-${pwMsg.kind === "success" ? "success" : "error"}`} style={{ marginBottom: 16 }}>{pwMsg.text}</div>}
          <div className="form-grid">
            <div className="form-row full">
              <label>{pick(lang, { ko: "현재 비밀번호", en: "Current password" })} <span className="req">*</span></label>
              <input type="password" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder={pick(lang, { ko: "현재 비밀번호", en: "Current password" })} required />
            </div>
            <div className="form-row">
              <label>{pick(lang, { ko: "새 비밀번호", en: "New password" })} <span className="req">*</span></label>
              <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={pick(lang, { ko: "8자 이상", en: "8+ characters" })} minLength={8} required />
            </div>
            <div className="form-row">
              <label>{pick(lang, { ko: "새 비밀번호 확인", en: "Confirm new password" })} <span className="req">*</span></label>
              <input type="password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder={pick(lang, { ko: "다시 입력", en: "Re-enter" })} minLength={8} required />
              {newPw2.length > 0 && newPw !== newPw2 && (
                <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>{pick(lang, { ko: "비밀번호가 일치하지 않습니다.", en: "The passwords do not match." })}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={pwSaving || !curPw || newPw.length < 8 || newPw !== newPw2}>
              {pwSaving ? pick(lang, { ko: "변경 중...", en: "Changing..." }) : pick(lang, { ko: "비밀번호 변경", en: "Change Password" })}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{pick(lang, { ko: "내가 쓴 교제 글", en: "My Community Posts" })}</h3>
        {myPosts.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            {pick(lang, { ko: "아직 작성한 글이 없습니다.", en: "You haven't written any posts yet." })}{" "}
            <Link href={communityHref} style={{ color: "var(--accent)", fontWeight: 600 }}>{pick(lang, { ko: "교제 게시판으로 가기", en: "Go to the community board" })}</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myPosts.map((p) => (
              <Link
                key={p.id}
                href={communityHref}
                className="card card-hover"
                style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {p.category && <span className="notice-cat">{p.category}</span>}
                  <strong style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</strong>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>{formatDate(p.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
