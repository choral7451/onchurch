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
  enabledPages: string[];
  isPublished: boolean;
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
  enabledPages: string[];
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

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(TOKEN_KEYS.accessTokenExpiresIn, tokens.accessTokenExpiresIn);
  localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refreshToken);
  localStorage.setItem(TOKEN_KEYS.refreshTokenExpiresIn, tokens.refreshTokenExpiresIn);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.accessToken);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.refreshToken);
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
  }) =>
    request<AuthTokens>("/onchurch/auths/sign-up", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  login: (userId: string, password: string) =>
    request<AuthTokens>("/onchurch/auths/login", {
      method: "POST",
      body: JSON.stringify({ userId, password }),
    }),
  refresh: (accessToken: string, refreshToken: string) =>
    request<AuthTokens>("/onchurch/auths/refresh", {
      method: "POST",
      body: JSON.stringify({ accessToken, refreshToken }),
    }),
};

export const onchurchChurch = {
  getMine: () =>
    request<{ church: Church | null; subscription: Subscription }>("/onchurch/churches/me", {
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
        enabledPages: input.enabledPages,
      }),
    }),
  publish: (isPublished: boolean) =>
    request<Church>("/onchurch/churches/me/publish", {
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
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
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
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      }),
    }),
  update: (id: number, input: BannerWriteInput) =>
    request<Banner>(`/onchurch/banners/me/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/banners/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string) =>
    request<{ banners: PublicBanner[] }>(`/onchurch/sites/${encodeURIComponent(slug)}/banners`, {
      method: "GET",
    }),
};

export type Notice = {
  id: number;
  category: string | null;
  title: string;
  content: string | null;
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
  author?: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt?: string | null;
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
        author: input.author ?? null,
        isPinned: input.isPinned,
        isActive: input.isActive,
        publishedAt: input.publishedAt ?? null,
      }),
    }),
  remove: (id: number) =>
    request<unknown>(`/onchurch/notices/me/${id}`, { method: "DELETE", auth: true }),
  listPublic: (slug: string, opts?: { category?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.category && opts.category !== "전체") qs.set("category", opts.category);
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.size) qs.set("size", String(opts.size));
    const query = qs.toString();
    const path = `/onchurch/sites/${encodeURIComponent(slug)}/notices${query ? `?${query}` : ""}`;
    return request<{ notices: Notice[]; totalCount: number }>(path, { method: "GET" });
  },
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

export const onchurchAbout = {
  listPublic: (slug: string) =>
    request<PublicAbout>(`/onchurch/sites/${encodeURIComponent(slug)}/about`, { method: "GET" }),
};
