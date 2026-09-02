/** Pesan error terpusat — dipakai guard & dipakai frontend untuk deteksi 403 CSRF. */
export const CSRF_INVALID_MESSAGE = 'CSRF token invalid atau tidak cocok';

/** Umur cookie CSRF (7 hari, sama dengan cookie auth). */
export const CSRF_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Metode HTTP yang dianggap aman (tidak mengubah state) → skip validasi CSRF. */
export const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Metadata key untuk decorator @SkipCsrf(). */
export const SKIP_CSRF_KEY = 'skipCsrf';