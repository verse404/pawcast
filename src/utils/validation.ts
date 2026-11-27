/**
 * Strict input validation, sanitization, and URL allow-listing utilities.
 *
 * Security notes:
 * - All external API fields and user text inputs are treated as untrusted.
 * - TODO(security): When adding user authentication or proprietary API keys in a
 *   production release, route external requests through an authenticated BFF with
 *   rate limiting, CSRF protection, and HttpOnly session cookies rather than
 *   calling third-party endpoints directly from the client.
 */

import { wgs84ToGcj02 } from './chinaCoords';

const ALLOWED_MAP_HOSTS = new Set(['maps.apple.com', 'www.google.com']);

/** Maximum allowed size for raw uploaded dog portrait files (5 MB). */
export const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Maximum allowed character length for persisted base64 avatar Data URIs (~260 KB). */
const MAX_AVATAR_DATA_URI_LENGTH = 360_000;

const SAFE_RASTER_DATA_URI_RE =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * Inspects file magic bytes to verify the payload is a genuine JPEG, PNG, or WebP
 * raster image (explicitly rejecting SVG/XML, HTML, or polyglot non-image headers).
 */
export function detectSafeImageMimeFromBytes(
  bytes: Uint8Array
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length < 12) {
    return null;
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: "RIFF" (52 49 46 46) .... "WEBP" (57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Validates that a custom dog profile image URI is a bounded, allow-listed
 * raster Data URI (`image/jpeg`, `image/png`, or `image/webp`).
 */
export function sanitizeAvatarDataUri(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_AVATAR_DATA_URI_LENGTH) {
    return null;
  }
  if (!SAFE_RASTER_DATA_URI_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Sanitizes untrusted string input by enforcing string type, stripping control
 * characters and angle brackets, collapsing whitespace, and capping length.
 */
export function sanitizeText(raw: unknown, maxLength = 120): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes a city/place search query against a strict character allow-list.
 */
export function sanitizeSearchQuery(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw
    .replace(/[^\p{L}\p{M}\p{N}\s,.'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Sanitizes a user-entered dog name.
 */
export function sanitizeDogName(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

/**
 * Verifies that latitude and longitude are finite numbers within geographic bounds.
 */
export function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Safely extracts and clamps a numeric value from untrusted JSON data.
 */
export function clampNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  if (raw < min) return min;
  if (raw > max) return max;
  return raw;
}

export type AuthErrorKey =
  | 'not_configured'
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_credentials'
  | 'too_many_requests'
  | 'requires_recent_login'
  | 'network_error'
  | 'generic_error';

const BASIC_EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[^\s@<>]{2,63}$/;

const COMMON_WEAK_PASSWORDS = new Set([
  '123456789012',
  '1234567890123',
  'password1234',
  'password12345',
  'qwertyuiop12',
  'iloveyou1234',
  'letmein12345',
  'admin1234567',
  'welcome12345',
  'pawcast12345',
]);

/**
 * Validates and normalizes an email address without logging or reflecting angle brackets.
 */
export function validateEmail(raw: unknown): {
  valid: boolean;
  normalized: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, normalized: '' };
  }
  const normalized = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().toLowerCase();
  if (!normalized || normalized.length > 254 || !BASIC_EMAIL_RE.test(normalized)) {
    return { valid: false, normalized };
  }
  return { valid: true, normalized };
}

/**
 * Enforces strong password rules (min 12 chars, max 128 chars, all characters allowed
 * including spaces & Unicode symbols, rejecting common breached patterns).
 *
 * TODO(security): Add server-side leaked password screening (HIBP k-anonymity API)
 * when introducing a dedicated backend/BFF.
 */
export function validateStrongPassword(raw: unknown): {
  valid: boolean;
  strength: 'weak' | 'good' | 'strong';
  reason?: 'too_short' | 'too_long' | 'common_password';
} {
  if (typeof raw !== 'string') {
    return { valid: false, strength: 'weak', reason: 'too_short' };
  }
  if (raw.length < 12) {
    return { valid: false, strength: 'weak', reason: 'too_short' };
  }
  if (raw.length > 128) {
    return { valid: false, strength: 'weak', reason: 'too_long' };
  }
  const lower = raw.trim().toLowerCase();
  if (
    COMMON_WEAK_PASSWORDS.has(lower) ||
    /^(.)\1{11,}$/.test(raw)
  ) {
    return { valid: false, strength: 'weak', reason: 'common_password' };
  }
  const uniqueChars = new Set(raw).size;
  const strength =
    raw.length >= 16 && uniqueChars >= 8
      ? 'strong'
      : raw.length >= 12 && uniqueChars >= 6
        ? 'good'
        : 'weak';
  if (strength === 'weak') {
    return { valid: false, strength: 'weak', reason: 'common_password' };
  }
  return { valid: true, strength };
}

/**
 * Masks an email address before displaying it in UI badges or headers
 * (e.g. `alice.smith@gmail.com` -> `a***@gmail.com`) to prevent PII exposure.
 */
export function maskEmail(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') {
    return '***';
  }
  const clean = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0 || atIdx >= clean.length - 1) {
    return '***';
  }
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  const visiblePrefix = local.length >= 2 ? local.slice(0, 1) : local.slice(0, 1);
  return `${visiblePrefix}***@${domain}`;
}

/**
 * Maps raw Firebase Auth error codes to generic, anti-enumeration error keys
 * so attackers cannot probe whether a given email is registered.
 */
export function mapFirebaseAuthErrorCode(rawCode: unknown): AuthErrorKey {
  const code = typeof rawCode === 'string' ? rawCode.toLowerCase() : '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-login-credentials'
  ) {
    return 'invalid_credentials';
  }
  if (code === 'auth/invalid-email') {
    return 'invalid_email';
  }
  if (code === 'auth/weak-password') {
    return 'weak_password';
  }
  if (code === 'auth/too-many-requests') {
    return 'too_many_requests';
  }
  if (code === 'auth/requires-recent-login') {
    return 'requires_recent_login';
  }
  if (code === 'auth/network-request-failed') {
    return 'network_error';
  }
  // Map `auth/email-already-in-use` and unknown codes to a generic message to avoid account enumeration
  return 'generic_error';
}

/**
 * Builds an allow-listed HTTPS map directions URL for Apple Maps or Google Maps.
 * Returns null if coordinates are invalid or host verification fails.
 */
export function buildSafeDirectionsUrl(
  latitude: number,
  longitude: number,
  placeName: string,
  preferAppleMaps: boolean,
  travelMode: 'walking' | 'driving' = 'walking'
): string | null {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }
  const safeName = sanitizeText(placeName, 80) || 'Dog Walk Spot';
  // Convert WGS-84 to GCJ-02 for Mainland China street map alignment in Apple/Google CN maps
  const mapped = wgs84ToGcj02(latitude, longitude);
  const coords = `${mapped.latitude.toFixed(6)},${mapped.longitude.toFixed(6)}`;
  const appleFlag = travelMode === 'driving' ? 'd' : 'w';

  const rawUrl = preferAppleMaps
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(coords)}&dirflg=${appleFlag}&q=${encodeURIComponent(safeName)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}&travelmode=${travelMode}`;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || !ALLOWED_MAP_HOSTS.has(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Builds an allow-listed HTTPS circular walking loop URL with multi-stop waypoints
 * starting and ending at `coordinates[0]`.
 */
export function buildSafeLoopUrl(
  coordinates: Array<[number, number]>,
  preferAppleMaps: boolean
): string | null {
  if (coordinates.length < 3) {
    return null;
  }
  for (const [lat, lon] of coordinates) {
    if (!isValidCoordinate(lat, lon)) {
      return null;
    }
  }

  const mappedPts = coordinates.map(([lat, lon]) => wgs84ToGcj02(lat, lon));
  const origin = `${mappedPts[0].latitude.toFixed(6)},${mappedPts[0].longitude.toFixed(6)}`;
  const midA = mappedPts[Math.floor(mappedPts.length * 0.33)];
  const midB = mappedPts[Math.floor(mappedPts.length * 0.66)];

  // Google Maps supports explicit walking waypoints `origin` -> `waypoints` -> `destination=origin`
  const waypoints = `${midA.latitude.toFixed(6)},${midA.longitude.toFixed(6)}|${midB.latitude.toFixed(6)},${midB.longitude.toFixed(6)}`;
  const rawUrl = preferAppleMaps
    ? `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(`${midA.latitude.toFixed(6)},${midA.longitude.toFixed(6)}`)}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=walking`;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || !ALLOWED_MAP_HOSTS.has(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
