// HTML-escape user-provided values that get interpolated into HTML strings.
// This is our last line of defense against template-injection attacks where
// an attacker plants a payload in a profile field (company name, RFQ title)
// that fans out to every recipient via email or admin dashboards.
//
// Use `escapeHtml` for inline text. Use `escapeAttr` when interpolating into
// an attribute value. Both fall back to '' for null/undefined so the caller
// doesn't have to pre-check.

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

export function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  return str.replace(/[&<>"'`/]/g, (ch) => HTML_ENTITIES[ch] ?? ch);
}

// Stricter — also strips control characters that some clients render as ZW.
export function escapeAttr(value: string | number | null | undefined): string {
  if (value == null) return '';
  const escaped = escapeHtml(value);
  // Strip ASCII control characters except whitespace tab/newline (which Intl
  // formatters and some Arabic markers use). Stops null-byte truncation tricks.
  return escaped.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
