// Translates Postgres error codes raised by Supabase into user-facing
// Arabic messages. Centralized so every Server Action handles them
// consistently — currently each action ad-hoc checks `error.code === '23505'`,
// which means typos drift and messages are uneven.
//
// Codes reference: https://www.postgresql.org/docs/current/errcodes-appendix.html

export interface PostgresLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

export type FriendlyErrorKind =
  | 'duplicate'
  | 'fk_violation'
  | 'check_violation'
  | 'not_null_violation'
  | 'permission_denied'
  | 'serialization'
  | 'connection'
  | 'unknown';

export interface FriendlyError {
  kind: FriendlyErrorKind;
  /** Arabic, user-facing — safe to show in toasts and form errors. */
  messageAr: string;
  /** Technical reason — for logs and Sentry, never shown to users. */
  technical: string;
}

/**
 * Detect whether a thrown value is a Postgres/Supabase error and return a
 * friendly message. Falls back to the 'unknown' kind for non-PG errors so
 * callers can still log and show a generic apology without crashing.
 */
export function mapPostgresError(err: unknown, context?: string): FriendlyError {
  if (!err || typeof err !== 'object') {
    return {
      kind: 'unknown',
      messageAr: defaultMessage(context),
      technical: typeof err === 'string' ? err : 'unknown error',
    };
  }

  const e = err as PostgresLike;
  const code = e.code ?? '';
  const technical = e.message ?? e.details ?? `pg ${code}`;

  switch (code) {
    case '23505':
      return {
        kind: 'duplicate',
        messageAr: duplicateMessage(context, technical),
        technical,
      };
    case '23503':
      return {
        kind: 'fk_violation',
        messageAr: 'العنصر المرتبط غير موجود. حدّث الصفحة وحاول مرة أخرى.',
        technical,
      };
    case '23502':
      return {
        kind: 'not_null_violation',
        messageAr: 'بيانات إلزامية ناقصة. تأكد من تعبئة كل الحقول.',
        technical,
      };
    case '23514':
      return {
        kind: 'check_violation',
        messageAr: 'القيمة المُدخلة خارج النطاق المسموح.',
        technical,
      };
    case '42501':
      return {
        kind: 'permission_denied',
        messageAr: 'ليس لديك صلاحية على هذا الإجراء.',
        technical,
      };
    case '40001':
    case '40P01':
      return {
        kind: 'serialization',
        messageAr: 'تعارض مع طلب آخر. حاول مرة أخرى خلال لحظة.',
        technical,
      };
    case '08000':
    case '08003':
    case '08006':
      return {
        kind: 'connection',
        messageAr: 'انقطاع مؤقت في الاتصال. حاول مرة أخرى.',
        technical,
      };
    default:
      return {
        kind: 'unknown',
        messageAr: defaultMessage(context),
        technical,
      };
  }
}

function defaultMessage(context?: string): string {
  if (!context) return 'حدث خطأ. حاول مرة أخرى.';
  return `حدث خطأ في ${context}. حاول مرة أخرى.`;
}

function duplicateMessage(context: string | undefined, technical: string): string {
  // Look for table or column hints in the technical message to refine wording.
  // Resilient to message format changes — the default still reads cleanly.
  if (/cr_number/i.test(technical)) {
    return 'رقم السجل التجاري مسجّل بالفعل لجهة أخرى.';
  }
  if (/email/i.test(technical)) {
    return 'هذا البريد مسجّل بالفعل.';
  }
  // Check chats / reviews / proposals in specificity order — the "chats_*"
  // and "reviews_*" constraint names also contain supplier_id and rfq_id
  // fragments, so they have to be matched before the proposals catch-all.
  // We anchor on table-name patterns: optional whitespace/dot/underscore
  // boundary + table name, since constraint names look like `chats_pkey`
  // or `reviews_rfq_id_key`.
  if (/(?:^|[^a-z])chats(?:[_.]|$|\s)/i.test(technical)) {
    return 'محادثة مع هذا المورد موجودة بالفعل لهذا الطلب.';
  }
  if (/(?:^|[^a-z])reviews(?:[_.]|$|\s)/i.test(technical)) {
    return 'لقد قيّمت هذا المشروع من قبل.';
  }
  if (/proposals.*supplier/i.test(technical) || /rfq_id.*supplier_id/i.test(technical)) {
    return 'لقد قدّمت عرضاً لهذا الطلب من قبل.';
  }
  if (context) {
    return `هذا العنصر موجود بالفعل ضمن ${context}.`;
  }
  return 'هذا العنصر موجود بالفعل.';
}

/**
 * Quick predicate for "should I show a 'duplicate' message?" — useful when
 * the action only cares about that one case and wants to short-circuit.
 */
export function isDuplicateError(err: unknown): boolean {
  return mapPostgresError(err).kind === 'duplicate';
}
