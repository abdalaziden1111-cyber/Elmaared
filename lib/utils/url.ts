// URL safety validation. Currently the receipt-upload form takes any URL
// the user pastes — we accept Drive/Dropbox/bank-screenshot links — but
// we should at least reject obviously dangerous schemes (javascript:,
// data:, file:) and SSRF targets (localhost, link-local). This keeps a
// malicious supplier from planting a payload that an admin's browser
// would auto-fetch when they open the receipt link.

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const SSRF_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::',
  '::1',
]);

function tryParseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/**
 * True when `input` is a syntactically valid http(s) URL pointing to a
 * non-localhost, non-link-local host. Returns false for null/empty/garbage
 * so callers don't have to pre-check. Doesn't make any network calls.
 */
export function isSafeUrl(input: string | null | undefined): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;

  const u = tryParseUrl(trimmed);
  if (!u) return false;
  if (!ALLOWED_PROTOCOLS.has(u.protocol)) return false;

  const host = u.hostname.toLowerCase();
  if (host.length === 0) return false;
  if (SSRF_HOSTS.has(host)) return false;

  // Block link-local + loopback CIDRs by IPv4 prefix sniff. We're not
  // resolving DNS — this only catches users who paste raw IPs.
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  return true;
}

/** Strict variant: also requires HTTPS (no plain http). */
export function isSafeHttpsUrl(input: string | null | undefined): boolean {
  if (!isSafeUrl(input)) return false;
  const u = tryParseUrl((input as string).trim());
  return u?.protocol === 'https:';
}

/**
 * Removes search params and fragments — useful for canonicalizing a URL
 * before storing or comparing it. Returns null when the input isn't a
 * valid URL so callers can short-circuit.
 */
export function canonicalizeUrl(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const u = tryParseUrl(input.trim());
  if (!u) return null;
  return `${u.protocol}//${u.host}${u.pathname}`;
}
