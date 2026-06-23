const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresIn: string;
  refreshToken: string;
  refreshTokenExpiresIn: string;
};

export type Church = {
  id: number;
  slug: string;
  name: string;
  eng: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  representative: string | null;
  businessNo: string | null;
  logoUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  naverVerification: string | null;
  liveUrl: string | null;
  isLive: boolean;
  liveStartedAt: string | null;
  enabledPages: string[];
  homeSectionOrder: string[];
  homeQuickLinks: string[];
  isPublished: boolean;
  // 최초 사이트 오픈(첫 공개) 시각. 한 번이라도 오픈하면 채워지고 OFF해도 유지 — 온보딩 완료 판단에 사용.
  firstPublishedAt: string | null;
};

export type Subscription = {
  isActive: boolean;
  isFreeTrial: boolean;
  freeTrialUntil: string | null;
  paidUntil: string | null;
};

export type UpsertChurchInput = {
  slug: string;
  name: string;
  eng?: string | null;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  representative?: string | null;
  businessNo?: string | null;
  logoUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  naverVerification?: string | null;
  liveUrl?: string | null;
  isLive?: boolean;
  enabledPages: string[];
  homeSectionOrder?: string[];
  homeQuickLinks?: string[];
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type CommonResponse<T> = {
  code: string;
  message: string | null;
  item: T | null;
};

type RequestOpts = RequestInit & { auth?: boolean };

const TOKEN_KEYS = {
  accessToken: "onchurch.accessToken",
  accessTokenExpiresIn: "onchurch.accessTokenExpiresIn",
  refreshToken: "onchurch.refreshToken",
  refreshTokenExpiresIn: "onchurch.refreshTokenExpiresIn",
} as const;

// 이 세션이 어느 교회 사이트에서 로그인했는지(성도 로그인 스코프). "admin"이면 관리 콘솔(루트) 로그인.
const SESSION_CHURCH_KEY = "onchurch.sessionChurch";

const COOKIE_ROOTS = ["everychurch.co.kr", "onchurch.kr"];

function getCookieDomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.host.split(":")[0];
  if (!host) return null;
  if (host === "localhost" || host === "127.0.0.1") return null;
  for (const root of COOKIE_ROOTS) {
    if (host === root || host.endsWith(`.${root}`)) return `.${root}`;
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 30) {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSec}`,
    "SameSite=Lax",
  ];
  if (window.location.protocol === "https:") parts.push("Secure");
  if (domain) parts.push(`Domain=${domain}`);
  document.cookie = parts.join("; ");
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const parts = [`${name}=`, "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (domain) parts.push(`Domain=${domain}`);
  document.cookie = parts.join("; ");
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  for (const raw of document.cookie.split(";")) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

export const AUTH_CHANGE_EVENT = "onchurch-auth-change";

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  setCookie(TOKEN_KEYS.accessToken, tokens.accessToken);
  setCookie(TOKEN_KEYS.accessTokenExpiresIn, tokens.accessTokenExpiresIn);
  setCookie(TOKEN_KEYS.refreshToken, tokens.refreshToken);
  setCookie(TOKEN_KEYS.refreshTokenExpiresIn, tokens.refreshTokenExpiresIn);
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
  emitAuthChange();
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  Object.values(TOKEN_KEYS).forEach((k) => {
    deleteCookie(k);
    localStorage.removeItem(k);
  });
  deleteCookie(SESSION_CHURCH_KEY);
  localStorage.removeItem(SESSION_CHURCH_KEY);
  emitAuthChange();
}

// 로그인한 교회 slug를 세션에 기록한다. (관리 콘솔 로그인은 "admin")
export function saveSessionChurch(slug: string) {
  if (typeof window === "undefined") return;
  setCookie(SESSION_CHURCH_KEY, slug);
  localStorage.removeItem(SESSION_CHURCH_KEY);
  emitAuthChange();
}

export function getSessionChurch(): string | null {
  if (typeof window === "undefined") return null;
  return getCookie(SESSION_CHURCH_KEY) ?? localStorage.getItem(SESSION_CHURCH_KEY);
}

// 현재 교회 사이트에 대해 로그인된 상태인가?
// 토큰이 있고, 세션이 이 교회(slug)에서 로그인된 경우에만 true.
export function isLoggedInForChurch(slug: string): boolean {
  return isLoggedIn() && getSessionChurch() === slug;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return getCookie(TOKEN_KEYS.accessToken) ?? localStorage.getItem(TOKEN_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return getCookie(TOKEN_KEYS.refreshToken) ?? localStorage.getItem(TOKEN_KEYS.refreshToken);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

function decodeTokenPayload(): Record<string, unknown> | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// 액세스 토큰(JWT) 페이로드에서 현재 로그인 사용자 id를 추출한다. (본인 글 판별용)
export function getCurrentUserId(): number | null {
  const payload = decodeTokenPayload();
  if (!payload) return null;
  const cand = payload.id ?? payload.sub ?? payload.userId;
  const n = Number(cand);
  return Number.isFinite(n) ? n : null;
}

// 토큰 페이로드에서 사용자 이름을 추출한다. (없으면 null)
export function getCurrentUserName(): string | null {
  const payload = decodeTokenPayload();
  if (!payload) return null;
  const name = payload.name;
  return typeof name === "string" && name.trim() ? name : null;
}

async function rawRequest<T>(path: string, opts: RequestOpts, accessToken: string | null): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  if (opts.auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR", message: "네트워크 오류가 발생했습니다." };
  }

  let body: CommonResponse<T> | { code?: string; message?: string | string[] } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const code = body && "code" in body && body.code ? body.code : "ERROR";
    const rawMessage = body && "message" in body ? body.message : null;
    const message = Array.isArray(rawMessage) ? rawMessage.join("\n") : rawMessage ?? "요청 처리 중 오류가 발생했습니다.";
    return { ok: false, status: res.status, code, message };
  }

  return { ok: true, data: (body as CommonResponse<T>)?.item as T };
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const accessToken = opts.auth ? getAccessToken() : null;
  const result = await rawRequest<T>(path, opts, accessToken);

  if (result.ok) return result.data;

  // 401 + auth 요청이면 refresh 한 번 시도
  if (result.status === 401 && opts.auth) {
    const refreshToken = getRefreshToken();
    if (accessToken && refreshToken) {
      const refreshResult = await rawRequest<AuthTokens>(
        "/onchurch/auths/refresh",
        { method: "POST", body: JSON.stringify({ accessToken, refreshToken }) },
        null,
      );
      if (refreshResult.ok) {
        saveTokens(refreshResult.data);
        const retry = await rawRequest<T>(path, opts, refreshResult.data.accessToken);
        if (retry.ok) return retry.data;
        throw new ApiError(retry.message, retry.code, retry.status);
      }
      // refresh 실패 → 토큰 무효, 로그인 화면으로
      clearTokens();
    }
  }

  throw new ApiError(result.message, result.code, result.status);
}

export type UploadedImage = {
  id: number;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  originalFilename: string;
};

export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
  if (!files.length) return [];
  const accessToken = getAccessToken();
  const form = new FormData();
  form.append("target", "USER");
  files.forEach((f) => form.append("imageFiles", f));
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}/system/upload/images`, {
    method: "POST",
    headers,
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.code ?? "ERROR";
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join("\n") : rawMessage ?? "이미지 업로드에 실패했습니다.";
    throw new ApiError(message, code, res.status);
  }
  return (body?.item?.images ?? []) as UploadedImage[];
}

export type UploadedFile = {
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

// 이미지 외 일반 첨부파일 업로드(다운로드용). 원본 파일명·크기·MIME을 함께 반환한다.
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  if (!files.length) return [];
  const accessToken = getAccessToken();
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}/system/upload/files`, {
    method: "POST",
    headers,
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.code ?? "ERROR";
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join("\n") : rawMessage ?? "파일 업로드에 실패했습니다.";
    throw new ApiError(message, code, res.status);
  }
  return (body?.item?.files ?? []) as UploadedFile[];
}

export type FoundAccount = {
  loginId: string;
  name: string;
  createdAt: string;
};

export const onchurchAuth = {
  sendVerification: (phone: string) =>
    request<{ sent: boolean }>("/onchurch/auths/verifications/mobile", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyCode: (phone: string, code: string) =>
    request<{ verified: boolean }>("/onchurch/auths/verifications/mobile", {
      method: "PUT",
      body: JSON.stringify({ phone, code }),
    }),
  signup: (params: {
    userId: string;
    password: string;
    name: string;
    phone: string;
    marketingConsent?: boolean;
    churchSlug?: string | null;
    referralSource?: "naver" | "instagram" | "mail" | "etc" | "";
    referralSourceEtc?: string | null;
  }) =>
    request<AuthTokens>("/onchurch/auths/sign-up", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  login: (userId: string, password: string, churchSlug?: string | null) =>
    request<AuthTokens>("/onchurch/auths/login", {
      method: "POST",
      body: JSON.stringify({ userId, password, churchSlug: churchSlug ?? null }),
    }),
  // 아이디 찾기: 휴대폰 인증(sendVerification → verifyCode) 후 호출. 해당 연락처의 모든 아이디 반환.
  // churchSlug를 넘기면 그 교회 소속 계정만 조회한다(교회 홈페이지).
  findLoginIds: (phone: string, churchSlug?: string | null) =>
    request<{ accounts: FoundAccount[] }>("/onchurch/auths/find-id", {
      method: "POST",
      body: JSON.stringify({ phone, churchSlug: churchSlug ?? null }),
    }),
  // 비밀번호 재설정: 아이디+휴대폰 인증 후 호출. 새 비밀번호로 변경.
  // churchSlug를 넘기면 그 교회 소속 계정만 허용한다(교회 홈페이지).
  resetPassword: (loginId: string, phone: string, newPassword: string, churchSlug?: string | null) =>
    request<null>("/onchurch/auths/reset-password", {
      method: "PUT",
      body: JSON.stringify({ loginId, phone, newPassword, churchSlug: churchSlug ?? null }),
    }),
  refresh: (accessToken: string, refreshToken: string) =>
    request<AuthTokens>("/onchurch/auths/refresh", {
      method: "POST",
      body: JSON.stringify({ accessToken, refreshToken }),
    }),
};

export type UserProfile = {
  id: number;
  loginId: string;
  name: string;
  phone: string;
  role: string;
  churchName: string | null;
};

export const onchurchUser = {
  getMe: () => request<UserProfile>("/onchurch/users/me", { method: "GET", auth: true }),
  updateProfile: (input: { name: string; phone: string }) =>
    request<UserProfile>("/onchurch/users/me", { method: "PUT", auth: true, body: JSON.stringify(input) }),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<unknown>("/onchurch/users/me/password", { method: "PUT", auth: true, body: JSON.stringify(input) }),
};

export type EmailRecipientStatus = "sent" | "failed" | "excluded";

export type EmailRecipientResult = {
  email: string;
  status: EmailRecipientStatus;
  reason: string | null;
};

// 대량 메일 발송 "접수" 응답 — 실제 발송은 큐 워커가 백그라운드로 처리한다.
export type EnqueueBulkEmailResult = {
  logId: number;
  total: number;
};

export type EmailLogStatus = "queued" | "processing" | "completed";

export type EmailLog = {
  id: number;
  senderId: number;
  senderName: string;
  subject: string;
  content: string;
  results: EmailRecipientResult[];
  total: number;
  sent: number;
  failed: number;
  excluded: number;
  status: EmailLogStatus;
  createdAt: string;
};

export const onchurchMaster = {
  sendBulkEmail: (input: { subject: string; content: string; recipients: string[] }) =>
    request<EnqueueBulkEmailResult>("/onchurch/master/emails", {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }),
  getEmailLog: (id: number) =>
    request<EmailLog>(`/onchurch/master/emails/${id}`, { method: "GET", auth: true }),
  listEmailLogs: (params: { keyword?: string; page: number; size: number }) => {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
    if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
    return request<{ items: EmailLog[]; totalCount: number }>(`/onchurch/master/emails?${query.toString()}`, {
      method: "GET",
      auth: true,
    });
  },
  listEmailTemplates: () =>
    request<{ items: EmailTemplate[] }>("/onchurch/master/email-templates", { method: "GET", auth: true }),
  createEmailTemplate: (input: { name: string; subject: string; content: string }) =>
    request<EmailTemplate>("/onchurch/master/email-templates", {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }),
  deleteEmailTemplate: (id: number) =>
    request<unknown>(`/onchurch/master/email-templates/${id}`, { method: "DELETE", auth: true }),

  sendBulkSms: (input: { subject: string; content: string; recipients: string[] }) =>
    request<BulkSmsResult>("/onchurch/master/sms", {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }),
  listSmsLogs: (params: { keyword?: string; page: number; size: number }) => {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
    if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
    return request<{ items: SmsLog[]; totalCount: number }>(`/onchurch/master/sms?${query.toString()}`, {
      method: "GET",
      auth: true,
    });
  },
  listSmsTemplates: () =>
    request<{ items: SmsTemplate[] }>("/onchurch/master/sms-templates", { method: "GET", auth: true }),
  createSmsTemplate: (input: { name: string; subject: string; content: string }) =>
    request<SmsTemplate>("/onchurch/master/sms-templates", {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }),
  deleteSmsTemplate: (id: number) =>
    request<unknown>(`/onchurch/master/sms-templates/${id}`, { method: "DELETE", auth: true }),

  listChurches: (params: { keyword?: string; publishedOnly: boolean; page: number; size: number }) => {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
    if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
    query.set("publishedOnly", String(params.publishedOnly));
    return request<{ items: ChurchOverview[]; totalCount: number }>(`/onchurch/master/churches?${query.toString()}`, {
      method: "GET",
      auth: true,
    });
  },
  // paidUntil: "YYYY-MM-DD" 또는 null(해제). 응답으로 갱신된 만료일/활성여부 반환.
  updateChurchPaidUntil: (churchId: number, paidUntil: string | null) =>
    request<{ paidUntil: string | null; isPaidActive: boolean }>(`/onchurch/master/churches/${churchId}/paid-until`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ paidUntil }),
    }),
  // 오너 이관 대상 후보 검색(마스터 제외). 검색어가 비면 빈 목록.
  searchUsers: (keyword: string) => {
    const query = new URLSearchParams();
    if (keyword.trim()) query.set("keyword", keyword.trim());
    return request<{ items: OwnerCandidate[] }>(`/onchurch/master/users?${query.toString()}`, {
      method: "GET",
      auth: true,
    });
  },
  // 교회 소유자를 지정한 사용자에게 이관. 기존 오너는 일반 멤버로 강등됨.
  transferChurchOwner: (churchId: number, userId: number) =>
    request<{ ownerId: number; ownerName: string; ownerPhone: string }>(`/onchurch/master/churches/${churchId}/owner`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ userId }),
    }),

  createLedgerEntry: (input: { entryDate: string; type: LedgerType; amount: number; category: string; memo?: string }) =>
    request<LedgerEntry>("/onchurch/master/ledger", {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    }),
  listLedger: (params: { month?: string; page: number; size: number }) => {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
    if (params.month?.trim()) query.set("month", params.month.trim());
    return request<LedgerListResult>(`/onchurch/master/ledger?${query.toString()}`, { method: "GET", auth: true });
  },
  deleteLedgerEntry: (id: number) =>
    request<unknown>(`/onchurch/master/ledger/${id}`, { method: "DELETE", auth: true }),
};

export type LedgerType = "income" | "expense";

export type LedgerEntry = {
  id: number;
  entryDate: string;
  type: LedgerType;
  amount: number;
  category: string;
  memo: string | null;
  createdAt: string;
};

export type LedgerListResult = {
  items: LedgerEntry[];
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

export type ChurchOverview = {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  isPublished: boolean;
  ownerName: string | null;
  ownerPhone: string | null;
  freeTrialStartAt: string | null;
  freeTrialUntil: string | null;
  paidUntil: string | null;
  isFreeTrialActive: boolean;
  isPaidActive: boolean;
};

export type OwnerCandidate = {
  id: number;
  name: string;
  loginId: string;
  phone: string;
  role: "master" | "owner" | "admin" | "member";
  churchName: string | null;
};

export type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
};

export type SmsRecipientStatus = "sent" | "failed" | "excluded";

export type SmsRecipientResult = {
  phone: string;
  status: SmsRecipientStatus;
  reason: string | null;
};

export type BulkSmsResult = {
  total: number;
  sent: number;
  failed: number;
  excluded: number;
  results: SmsRecipientResult[];
};

export type SmsLog = {
  id: number;
  senderId: number;
  senderName: string;
  subject: string;
  content: string;
  results: SmsRecipientResult[];
  total: number;
  sent: number;
  failed: number;
  excluded: number;
  createdAt: string;
};

export type SmsTemplate = {
  id: number;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
};

export type ChurchRole = "owner" | "admin" | "member";

export type ChurchMember = {
  id: number;
  loginId: string;
  name: string;
  phone: string;
  role: string;
  churchRole: ChurchRole;
  createdAt: string;
};

export const onchurchChurchMember = {
  listMine: () =>
    request<{ members: ChurchMember[] }>("/onchurch/church-members/me", { method: "GET", auth: true }).then(
      (r) => r.members ?? [],
    ),
  changeRole: (id: number, role: "admin" | "member") =>
    request<unknown>(`/onchurch/church-members/me/${id}/role`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ role }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/church-members/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchChurch = {
  getMine: () =>
    request<{ church: Church | null; subscription: Subscription; churchRole: ChurchRole | null }>("/onchurch/churches/me", {
      method: "GET",
      auth: true,
    }),
  upsertMine: (input: UpsertChurchInput) =>
    request<Church>("/onchurch/churches/me", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        eng: input.eng ?? null,
        tagline: input.tagline ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        representative: input.representative ?? null,
        businessNo: input.businessNo ?? null,
        logoUrl: input.logoUrl ?? null,
        youtubeUrl: input.youtubeUrl ?? null,
        instagramUrl: input.instagramUrl ?? null,
        naverVerification: input.naverVerification ?? null,
        liveUrl: input.liveUrl ?? null,
        isLive: input.isLive ?? false,
        enabledPages: input.enabledPages,
        homeSectionOrder: input.homeSectionOrder ?? [],
        homeQuickLinks: input.homeQuickLinks ?? [],
      }),
    }),
  publish: (isPublished: boolean) =>
    request<{ church: Church; subscription: Subscription }>("/onchurch/churches/me/publish", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ isPublished }),
    }),
  checkSlug: (slug: string) =>
    request<{ available: boolean }>(`/onchurch/churches/check-slug?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
      auth: true,
    }),
};

export type Banner = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type BannerWriteInput = {
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder: number;
};

export type PublicBanner = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isDefault: boolean;
};

export const onchurchBanner = {
  listMine: () =>
    request<{ banners: Banner[] }>("/onchurch/banners/me", { method: "GET", auth: true }),
  create: (input: BannerWriteInput) =>
    request<Banner>("/onchurch/banners/me", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl ?? null,
        sortOrder: input.sortOrder,
      }),
    }),
  update: (id: number, input: BannerWriteInput) =>
    request<Banner>(`/onchurch/banners/me/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl ?? null,
        sortOrder: input.sortOrder,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/banners/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string) =>
    request<{ banners: PublicBanner[] }>(`/onchurch/sites/${encodeURIComponent(slug)}/banners`, {
      method: "GET",
    }),
};

export type NoticeAttachment = {
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

export type Notice = {
  id: number;
  seqNo: number | null;
  category: string | null;
  title: string;
  content: string | null;
  imageUrls: string[];
  attachments: NoticeAttachment[];
  author: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export type NoticeWriteInput = {
  category?: string | null;
  title: string;
  content?: string | null;
  imageUrls?: string[];
  attachments?: NoticeAttachment[];
  author?: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt?: string | null;
};

export type NoticeCategoryItem = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isAll: boolean;
};

export type NoticeCategoryWriteInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchNoticeCategory = {
  listMine: () =>
    request<{ categories: NoticeCategoryItem[] }>("/onchurch/notice-categories/me", { method: "GET", auth: true }).then(
      (r) => r.categories ?? [],
    ),
  create: (input: NoticeCategoryWriteInput) =>
    request<NoticeCategoryItem>("/onchurch/notice-categories/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  restoreAll: () =>
    request<{ categories: NoticeCategoryItem[] }>("/onchurch/notice-categories/me/all", { method: "POST", auth: true }).then(
      (r) => r.categories ?? [],
    ),
  update: (id: number, input: NoticeCategoryWriteInput) =>
    request<NoticeCategoryItem>(`/onchurch/notice-categories/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/notice-categories/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchNotice = {
  listMine: () =>
    request<{ notices: Notice[] }>("/onchurch/notices/me", { method: "GET", auth: true }),
  create: (input: NoticeWriteInput) =>
    request<Notice>("/onchurch/notices/me", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        category: input.category ?? null,
        title: input.title,
        content: input.content ?? null,
        imageUrls: input.imageUrls ?? [],
        attachments: input.attachments ?? [],
        author: input.author ?? null,
        isPinned: input.isPinned,
        isActive: input.isActive,
        publishedAt: input.publishedAt ?? null,
      }),
    }),
  update: (id: number, input: NoticeWriteInput) =>
    request<Notice>(`/onchurch/notices/me/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        category: input.category ?? null,
        title: input.title,
        content: input.content ?? null,
        imageUrls: input.imageUrls ?? [],
        attachments: input.attachments ?? [],
        author: input.author ?? null,
        isPinned: input.isPinned,
        isActive: input.isActive,
        publishedAt: input.publishedAt ?? null,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/notices/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string, opts?: { category?: string; keyword?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.category && opts.category !== "전체") qs.set("category", opts.category);
    if (opts?.keyword?.trim()) qs.set("keyword", opts.keyword.trim());
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.size) qs.set("size", String(opts.size));
    const query = qs.toString();
    const path = `/onchurch/sites/${encodeURIComponent(slug)}/notices${query ? `?${query}` : ""}`;
    return request<{ notices: Notice[]; totalCount: number }>(path, { method: "GET" });
  },
  listPublicCategories: (slug: string) =>
    request<{ categories: NoticeCategoryItem[] }>(
      `/onchurch/sites/${encodeURIComponent(slug)}/notice-categories`,
      { method: "GET" },
    ).then((r) => r.categories ?? []),
};

export type EventItem = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  isActive: boolean;
};

export type EventWriteInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  isActive: boolean;
};

export const onchurchEvent = {
  listMine: () =>
    request<{ events: EventItem[] }>("/onchurch/events/me", { method: "GET", auth: true }),
  create: (input: EventWriteInput) =>
    request<EventItem>("/onchurch/events/me", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        isAllDay: input.isAllDay,
        isActive: input.isActive,
      }),
    }),
  update: (id: number, input: EventWriteInput) =>
    request<EventItem>(`/onchurch/events/me/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        isAllDay: input.isAllDay,
        isActive: input.isActive,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/events/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string, opts?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.from) qs.set("from", opts.from);
    if (opts?.to) qs.set("to", opts.to);
    const query = qs.toString();
    const path = `/onchurch/sites/${encodeURIComponent(slug)}/events${query ? `?${query}` : ""}`;
    return request<{ events: EventItem[] }>(path, { method: "GET" });
  },
};

export type Pastor = {
  id: number;
  name: string;
  role: string | null;
  eng: string | null;
  message: string | null;
  longMessage: string | null;
  photoUrl: string | null;
};

export type PastorWriteInput = {
  name: string;
  role?: string | null;
  eng?: string | null;
  message?: string | null;
  longMessage?: string | null;
  photoUrl?: string | null;
};

export type VisionItem = {
  id: number;
  ko: string;
  en: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type VisionWriteInput = {
  ko: string;
  en?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type HistoryItem = {
  id: number;
  year: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type HistoryWriteInput = {
  year: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type StaffMember = {
  id: number;
  name: string;
  role: string | null;
  area: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type StaffWriteInput = {
  name: string;
  role?: string | null;
  area?: string | null;
  photoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type PublicAbout = {
  pastor: Pastor | null;
  visions: VisionItem[];
  histories: HistoryItem[];
  staffs: StaffMember[];
};

export const onchurchPastor = {
  getMine: () =>
    request<{ pastor: Pastor | null }>("/onchurch/pastors/me", { method: "GET", auth: true }),
  upsertMine: (input: PastorWriteInput) =>
    request<Pastor>("/onchurch/pastors/me", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        name: input.name,
        role: input.role ?? null,
        eng: input.eng ?? null,
        message: input.message ?? null,
        longMessage: input.longMessage ?? null,
        photoUrl: input.photoUrl ?? null,
      }),
    }),
};

export const onchurchVision = {
  listMine: () =>
    request<{ visions: VisionItem[] }>("/onchurch/visions/me", { method: "GET", auth: true }).then((r) => r.visions ?? []),
  create: (input: VisionWriteInput) =>
    request<VisionItem>("/onchurch/visions/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: VisionWriteInput) =>
    request<VisionItem>(`/onchurch/visions/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/visions/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchHistory = {
  listMine: () =>
    request<{ histories: HistoryItem[] }>("/onchurch/histories/me", { method: "GET", auth: true }).then((r) => r.histories ?? []),
  create: (input: HistoryWriteInput) =>
    request<HistoryItem>("/onchurch/histories/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: HistoryWriteInput) =>
    request<HistoryItem>(`/onchurch/histories/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/histories/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchStaff = {
  listMine: () =>
    request<{ staffs: StaffMember[] }>("/onchurch/staffs/me", { method: "GET", auth: true }).then((r) => r.staffs ?? []),
  create: (input: StaffWriteInput) =>
    request<StaffMember>("/onchurch/staffs/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: StaffWriteInput) =>
    request<StaffMember>(`/onchurch/staffs/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/staffs/me/${id}`, { method: "DELETE", auth: true }),
};

export type TransportationItem = {
  id: number;
  icon: string | null;
  tag: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type TransportationWriteInput = {
  icon?: string | null;
  tag: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchTransportation = {
  listMine: () =>
    request<{ transportations: TransportationItem[] }>("/onchurch/transportations/me", { method: "GET", auth: true }).then(
      (r) => r.transportations ?? [],
    ),
  create: (input: TransportationWriteInput) =>
    request<TransportationItem>("/onchurch/transportations/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: TransportationWriteInput) =>
    request<TransportationItem>(`/onchurch/transportations/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/transportations/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchAbout = {
  listPublic: (slug: string) =>
    request<PublicAbout>(`/onchurch/sites/${encodeURIComponent(slug)}/about`, { method: "GET" }),
};

export type WorshipServiceTag = "WEEK" | "DAILY";

export type WorshipServiceItem = {
  id: number;
  tag: WorshipServiceTag;
  name: string;
  time: string;
  meta: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type WorshipServiceWriteInput = {
  tag: WorshipServiceTag;
  name: string;
  time: string;
  meta?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchWorshipService = {
  listMine: () =>
    request<{ services: WorshipServiceItem[] }>("/onchurch/worship-services/me", { method: "GET", auth: true }).then(
      (r) => r.services ?? [],
    ),
  create: (input: WorshipServiceWriteInput) =>
    request<WorshipServiceItem>("/onchurch/worship-services/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: WorshipServiceWriteInput) =>
    request<WorshipServiceItem>(`/onchurch/worship-services/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/worship-services/me/${id}`, { method: "DELETE", auth: true }),
};

// ── 주보 (Bulletin) ─────────────────────────────────────────────
export type BulletinWorshipOrderItem = { item: string; detail: string | null; leader: string | null };
export type BulletinWorshipServiceItem = { name: string; time: string; meta: string | null };
export type BulletinStaffItem = { name: string; role: string | null; area: string | null };
export type BulletinNewsItem = { title: string; content: string | null };
export type BulletinVolunteerItem = { key: string; value: string };

export type Bulletin = {
  id: number;
  templateId: string;
  serviceDate: string | null;
  locationImageUrl: string | null;
  issueNo: string | null;
  coverVerse: string | null;
  coverVerseRef: string | null;
  worshipOrder: BulletinWorshipOrderItem[];
  worshipServices: BulletinWorshipServiceItem[];
  staff: BulletinStaffItem[];
  news: BulletinNewsItem[];
  volunteers: BulletinVolunteerItem[];
};

export type BulletinWriteInput = {
  templateId?: string;
  serviceDate: string | null;
  locationImageUrl: string | null;
  issueNo: string | null;
  coverVerse: string | null;
  coverVerseRef: string | null;
  worshipOrder: BulletinWorshipOrderItem[];
  worshipServices: BulletinWorshipServiceItem[];
  staff: BulletinStaffItem[];
  news: BulletinNewsItem[];
  volunteers: BulletinVolunteerItem[];
};

export const onchurchBulletin = {
  getMine: () =>
    request<{ bulletin: Bulletin | null }>("/onchurch/bulletins/me", { method: "GET", auth: true }).then(
      (r) => r.bulletin,
    ),
  upsertMine: (input: BulletinWriteInput) =>
    request<Bulletin>("/onchurch/bulletins/me", { method: "PUT", auth: true, body: JSON.stringify(input) }),
};

export type SermonSeriesItem = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isAll: boolean;
};

export type SermonSeriesWriteInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type SermonItem = {
  id: number;
  seriesId: number | null;
  title: string;
  pastor: string | null;
  date: string | null;
  duration: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  bulletinUrl: string | null;
  summary: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type SermonWriteInput = {
  seriesId: number | null;
  title: string;
  pastor?: string | null;
  date?: string | null;
  duration?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  bulletinUrl?: string | null;
  summary?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchSermonSeries = {
  listMine: () =>
    request<{ series: SermonSeriesItem[] }>("/onchurch/sermon-series/me", { method: "GET", auth: true }).then(
      (r) => r.series ?? [],
    ),
  create: (input: SermonSeriesWriteInput) =>
    request<SermonSeriesItem>("/onchurch/sermon-series/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  restoreAll: () =>
    request<{ series: SermonSeriesItem[] }>("/onchurch/sermon-series/me/all", { method: "POST", auth: true }).then(
      (r) => r.series ?? [],
    ),
  update: (id: number, input: SermonSeriesWriteInput) =>
    request<SermonSeriesItem>(`/onchurch/sermon-series/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/sermon-series/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchSermon = {
  listMine: () =>
    request<{ sermons: SermonItem[] }>("/onchurch/sermons/me", { method: "GET", auth: true }).then(
      (r) => r.sermons ?? [],
    ),
  create: (input: SermonWriteInput) =>
    request<SermonItem>("/onchurch/sermons/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: SermonWriteInput) =>
    request<SermonItem>(`/onchurch/sermons/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/sermons/me/${id}`, { method: "DELETE", auth: true }),
};

export type GalleryCategoryItem = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isAll: boolean;
};

export type GalleryCategoryWriteInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type GalleryItemRow = {
  id: number;
  categoryId: number | null;
  batchId: string | null;
  title: string;
  date: string | null;
  photoUrl: string | null;
  grad: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type GalleryWriteInput = {
  categoryId: number | null;
  batchId?: string | null;
  title: string;
  date?: string | null;
  photoUrl?: string | null;
  grad?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchGalleryCategory = {
  listMine: () =>
    request<{ categories: GalleryCategoryItem[] }>("/onchurch/gallery-categories/me", { method: "GET", auth: true }).then(
      (r) => r.categories ?? [],
    ),
  create: (input: GalleryCategoryWriteInput) =>
    request<GalleryCategoryItem>("/onchurch/gallery-categories/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  restoreAll: () =>
    request<{ categories: GalleryCategoryItem[] }>("/onchurch/gallery-categories/me/all", { method: "POST", auth: true }).then(
      (r) => r.categories ?? [],
    ),
  update: (id: number, input: GalleryCategoryWriteInput) =>
    request<GalleryCategoryItem>(`/onchurch/gallery-categories/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/gallery-categories/me/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchGallery = {
  listMine: () =>
    request<{ galleries: GalleryItemRow[] }>("/onchurch/galleries/me", { method: "GET", auth: true }).then(
      (r) => r.galleries ?? [],
    ),
  create: (input: GalleryWriteInput) =>
    request<GalleryItemRow>("/onchurch/galleries/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: GalleryWriteInput) =>
    request<GalleryItemRow>(`/onchurch/galleries/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/galleries/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string, opts?: { categoryId?: number | null; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.categoryId != null) qs.set("categoryId", String(opts.categoryId));
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.size) qs.set("size", String(opts.size));
    const query = qs.toString();
    const path = `/onchurch/sites/${encodeURIComponent(slug)}/galleries${query ? `?${query}` : ""}`;
    return request<{ categories: GalleryCategoryItem[]; galleries: GalleryItemRow[]; totalCount: number }>(path, {
      method: "GET",
    });
  },
};

export type PrayerStatus = "pending" | "praying" | "answered";

export type PrayerSubmitInput = {
  name: string | null;
  contact: string | null;
  category: string;
  scope: string;
  content: string;
  isAnonymous: boolean;
};

export type PrayerItem = {
  id: number;
  name: string | null;
  contact: string | null;
  category: string;
  scope: string;
  content: string;
  isAnonymous: boolean;
  status: PrayerStatus;
  createdAt: string;
};

export type InquiryItem = {
  id: number;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  status: "pending" | "answered";
  createdAt: string;
};

export const onchurchInquiry = {
  listMine: () =>
    request<{ inquiries: InquiryItem[] }>("/onchurch/inquiries/me", { method: "GET", auth: true }).then(
      (r) => r.inquiries ?? [],
    ),
  create: (question: string) =>
    request<InquiryItem>("/onchurch/inquiries/me", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ question }),
    }),
};

export const onchurchPrayer = {
  submitPublic: (slug: string, input: PrayerSubmitInput) =>
    request<PrayerItem>(`/onchurch/sites/${encodeURIComponent(slug)}/prayers`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listMine: () =>
    request<{ prayers: PrayerItem[] }>("/onchurch/prayers/me", { method: "GET", auth: true }).then(
      (r) => r.prayers ?? [],
    ),
  updateStatus: (id: number, status: PrayerStatus) =>
    request<PrayerItem>(`/onchurch/prayers/me/${id}/status`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ status }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/prayers/me/${id}`, { method: "DELETE", auth: true }),
};

// ── 교제 게시판 (Community) ─────────────────────────────
export type CommunityPost = {
  id: number;
  category: string | null;
  authorName: string;
  authorId: number;
  title: string;
  content: string | null;
  photoUrls: string[];
  videoUrl: string | null;
  createdAt: string;
};

export type CommunityManagePost = CommunityPost & {
  isHidden: boolean;
  reportCount: number;
};

export type CommunityPostWriteInput = {
  category?: string | null;
  title: string;
  content?: string | null;
  photoUrls?: string[];
  videoUrl?: string | null;
};

export type CommunityCategoryItem = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type CommunityCategoryWriteInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export const onchurchCommunity = {
  listPublic: (slug: string, opts?: { category?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.category && opts.category !== "전체") qs.set("category", opts.category);
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.size) qs.set("size", String(opts.size));
    const query = qs.toString();
    const path = `/onchurch/sites/${encodeURIComponent(slug)}/community-posts${query ? `?${query}` : ""}`;
    return request<{ posts: CommunityPost[]; totalCount: number }>(path, { method: "GET" });
  },
  getPublic: (slug: string, id: number) =>
    request<CommunityPost>(`/onchurch/sites/${encodeURIComponent(slug)}/community-posts/${id}`, { method: "GET" }),
  report: (slug: string, id: number) =>
    request<unknown>(`/onchurch/sites/${encodeURIComponent(slug)}/community-posts/${id}/report`, { method: "POST" }),
  create: (input: CommunityPostWriteInput) =>
    request<CommunityPost>("/onchurch/community-posts/me", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        category: input.category ?? null,
        title: input.title,
        content: input.content ?? null,
        photoUrls: input.photoUrls ?? [],
        videoUrl: input.videoUrl ?? null,
      }),
    }),
  update: (id: number, input: CommunityPostWriteInput) =>
    request<CommunityPost>(`/onchurch/community-posts/me/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        category: input.category ?? null,
        title: input.title,
        content: input.content ?? null,
        photoUrls: input.photoUrls ?? [],
        videoUrl: input.videoUrl ?? null,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/community-posts/me/${id}`, { method: "DELETE", auth: true }),
  // 관리자 사후 관리
  listManage: () =>
    request<{ posts: CommunityManagePost[] }>("/onchurch/community-posts/manage", { method: "GET", auth: true }).then(
      (r) => r.posts ?? [],
    ),
  setHidden: (id: number, isHidden: boolean) =>
    request<CommunityManagePost>(`/onchurch/community-posts/manage/${id}/hide`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ isHidden }),
    }),
  removeManage: (id: number) =>
    request<unknown>(`/onchurch/community-posts/manage/${id}`, { method: "DELETE", auth: true }),
};

export const onchurchCommunityCategory = {
  listMine: () =>
    request<{ categories: CommunityCategoryItem[] }>("/onchurch/community-categories/me", { method: "GET", auth: true }).then(
      (r) => r.categories ?? [],
    ),
  listPublic: (slug: string) =>
    request<{ categories: CommunityCategoryItem[] }>(`/onchurch/sites/${encodeURIComponent(slug)}/community-categories`, {
      method: "GET",
    }).then((r) => r.categories ?? []),
  create: (input: CommunityCategoryWriteInput) =>
    request<CommunityCategoryItem>("/onchurch/community-categories/me", { method: "POST", auth: true, body: JSON.stringify(input) }),
  update: (id: number, input: CommunityCategoryWriteInput) =>
    request<CommunityCategoryItem>(`/onchurch/community-categories/me/${id}`, { method: "PUT", auth: true, body: JSON.stringify(input) }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/community-categories/me/${id}`, { method: "DELETE", auth: true }),
};
