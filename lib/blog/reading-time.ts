// Phase V5.2 — Reading-time estimate used by the admin editor.
//
// Pure function: HTML → minutes. Strips tags, splits on whitespace,
// divides by 200 words/minute (the conventional rate). Minimum 1.

export function readingTimeMinutes(html: string): number {
  if (!html) return 1;
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  const wordCount = plain.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Convert a title into a URL-safe slug. Preserves ASCII letters/digits,
 * collapses everything else to a single hyphen, lowercases. Arabic
 * titles produce empty strings — caller must supply a slug for those.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
