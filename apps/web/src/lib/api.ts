import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 60_000, // اولین درخواست بعد از خواب سرور رایگان ممکن است تا ~۵۰ ثانیه طول بکشد
  headers: { 'Content-Type': 'application/json' },
});

/* ───────────── توکن‌ها ───────────── */
let accessToken: string | null = null;
let refreshToken: string | null = null;

const store = (k: string, v: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* مرورگر ذخیره‌سازی را نمی‌دهد */
  }
};
const read = (k: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  store('accessToken', token);
  if (!token) {
    refreshToken = null;
    store('refreshToken', null);
  }
};
export const getAccessToken = (): string | null => accessToken ?? (accessToken = read('accessToken'));
export const setRefreshToken = (token: string | null): void => {
  refreshToken = token;
  store('refreshToken', token);
};
export const getRefreshToken = (): string | null => refreshToken ?? (refreshToken = read('refreshToken'));

/** ذخیره‌ی هر دو توکن بعد از ورود/ثبت‌نام/تمدید */
export const setSession = (access: string, refresh?: string | null): void => {
  setAccessToken(access);
  if (refresh) setRefreshToken(refresh);
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};

/* ───────────── تمدید خودکار نشست (access token ۱۵ دقیقه‌ای) ───────────── */
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    // بدون interceptor تا حلقه نشود
    const r = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: rt }, { timeout: 60_000 });
    const d = r.data as { accessToken: string; refreshToken?: string };
    setSession(d.accessToken, d.refreshToken);
    return d.accessToken;
  } catch {
    return null;
  }
}

const isAuthCall = (url?: string): boolean => /\/api\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(url ?? '');

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && cfg && !cfg._retried && !isAuthCall(cfg.url)) {
      cfg._retried = true;
      refreshing = refreshing ?? doRefresh().finally(() => (refreshing = null));
      const fresh = await refreshing;
      if (fresh) {
        cfg.headers.Authorization = `Bearer ${fresh}`;
        return api(cfg);
      }
    }
    if (error.response?.status === 401 && !isAuthCall(cfg?.url)) {
      setAccessToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/* ───────────── پیام خطا (فارسی و قابل‌فهم) ───────────── */
export type ApiError = { error: string; issues?: Record<string, string[]> };

const KNOWN: Array<[RegExp, string]> = [
  [/invalid credentials/i, 'ایمیل یا رمز عبور درست نیست'],
  [/email already registered/i, 'این ایمیل قبلاً ثبت شده است؛ وارد شوید'],
  [/^unauthorized$/i, 'نشست شما تمام شده؛ دوباره وارد شوید'],
  [/route not found/i, 'این بخش در سرور پیدا نشد (نسخه‌ی سرور قدیمی است؟)'],
  [/too many requests|rate limit/i, 'درخواست‌های زیادی فرستادید؛ کمی بعد دوباره تلاش کنید'],
  [/internal server error/i, 'خطای داخلی سرور؛ کمی بعد دوباره تلاش کنید'],
];

export const extractError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ApiError> | undefined;
    if (!err.response) {
      if (err.code === 'ECONNABORTED') return 'سرور دیر جواب داد. اگر تازه بیدار شده، ۱ دقیقه صبر کنید و دوباره تلاش کنید.';
      return 'به سرور وصل نشد. اینترنت/فیلترشکن را بررسی کنید؛ اگر سرور رایگان خواب بوده، تا ۱ دقیقه بعد دوباره امتحان کنید. (آدرس API درست تنظیم شده؟)';
    }
    if (data?.issues) {
      const first = Object.entries(data.issues).find(([, v]) => v?.length);
      if (first) {
        const [field, msgs] = first;
        const label: Record<string, string> = { email: 'ایمیل', password: 'رمز عبور', name: 'نام', newPassword: 'رمز تازه' };
        return `${label[field] ?? field}: ${/at least|too_small|min/i.test(msgs[0]) ? 'خیلی کوتاه است (رمز حداقل ۸ و نام حداقل ۲ نویسه)' : /email/i.test(msgs[0]) ? 'معتبر نیست' : msgs[0]}`;
      }
    }
    const msg = data?.error;
    if (msg) {
      const hit = KNOWN.find(([re]) => re.test(msg));
      return hit ? hit[1] : msg;
    }
    if (err.response.status === 402) return 'برای استفاده از این بخش باید آن را از «فروشگاه» تهیه کنید.';
    if (err.response.status >= 500) return 'خطای سرور؛ کمی بعد دوباره تلاش کنید.';
    return err.message;
  }
  return err instanceof Error ? err.message : 'خطای نامشخص';
};
