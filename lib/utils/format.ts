// All formatters are designed to be safe in render paths: they never throw
// and they degrade to a placeholder string for nonsense inputs (NaN, Infinity,
// invalid date strings, null/undefined, etc.). The UI gets something readable
// instead of a server error.

const PLACEHOLDER = '—';
const RIYAL = '﷼';

export function formatCurrency(
  amount: number | null | undefined,
  _locale: string = 'ar'
): string {
  if (amount == null) return `${PLACEHOLDER} ${RIYAL}`;
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
    return `${PLACEHOLDER} ${RIYAL}`;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${RIYAL}`;
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: string = 'ar'
): string {
  const d = toValidDate(date);
  if (!d) return PLACEHOLDER;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return PLACEHOLDER;
  return new Intl.DateTimeFormat('en-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return PLACEHOLDER;
  if (!phone.startsWith('+966')) return phone;

  const digits = phone.slice(4).replace(/\D/g, '');
  // Need at least 9 digits for a valid Saudi mobile; otherwise return raw.
  if (digits.length < 9) return phone;

  return `+966 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

export function formatRfqNumber(num: string | null | undefined): string {
  if (!num || typeof num !== 'string') return PLACEHOLDER;
  return num;
}

export function timeAgo(
  date: Date | string | null | undefined,
  locale: string = 'ar'
): string {
  const d = toValidDate(date);
  if (!d) return PLACEHOLDER;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // Future dates: render as "today" rather than "negative days ago".
  if (diffMs < 0) {
    return locale === 'ar' ? 'اليوم' : 'today';
  }

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === 'ar') {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return formatDate(d, locale);
  }

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(d, locale);
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
