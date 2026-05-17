// Canonical Arabic labels for every enum value rendered in the UI.
// Import these instead of defining ad-hoc component-local maps so the labels
// stay consistent across personas (client / supplier / admin / marketing).
//
// New enum values must be added here AND to the underlying zod schema /
// database CHECK constraint. If a key is missing the call site should fall
// back to the raw key — never display "undefined" or English silently.

import { CITIES } from './cities';

// ───────────────────────────────────────────────────────────
// RFQ + project lifecycle
// ───────────────────────────────────────────────────────────

export const RFQ_STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوح',
  negotiating: 'قيد التفاوض',
  awarded: 'تم الاختيار',
  in_escrow: 'قيد الضمان',
  in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  disputed: 'نزاع',
  cancelled: 'ملغى',
};

// Status-pill colour tone (matching CSS variables defined in globals.css).
export const RFQ_STATUS_TONE: Record<string, string> = {
  draft: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  open: 'bg-[var(--color-info-100)] text-[var(--color-info)]',
  negotiating: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  awarded: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  in_escrow: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  in_progress: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  delivered: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  completed: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  cancelled: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  disputed: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
};

// ───────────────────────────────────────────────────────────
// Service categories
// ───────────────────────────────────────────────────────────

export const SERVICE_LABEL: Record<string, string> = {
  booth: 'بوث',
  gifts: 'هدايا',
  event: 'فعالية',
  printing: 'طباعة',
};

// Slightly more descriptive variant used in marketing / featured-suppliers.
export const SERVICE_LABEL_LONG: Record<string, string> = {
  booth: 'تصميم وتنفيذ أجنحة',
  gifts: 'هدايا ترويجية',
  event: 'تنظيم فعاليات',
  printing: 'مطبوعات',
};

// ───────────────────────────────────────────────────────────
// Geography
// ───────────────────────────────────────────────────────────

export const CITY_LABEL: Record<string, string> = Object.fromEntries(
  CITIES.map((c) => [c.value, c.labelAr])
);

export const CITY_LABEL_EN: Record<string, string> = Object.fromEntries(
  CITIES.map((c) => [c.value, c.labelEn])
);

// ───────────────────────────────────────────────────────────
// Proposals
// ───────────────────────────────────────────────────────────

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  submitted: 'تم تقديمه',
  under_review: 'قيد المراجعة',
  shortlisted: 'محدّد',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
};

export const PROPOSAL_STATUS_TONE: Record<string, string> = {
  submitted: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  under_review: 'bg-[var(--color-info-100)] text-[var(--color-info)]',
  shortlisted: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  accepted: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  rejected: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
  withdrawn: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
};

// ───────────────────────────────────────────────────────────
// RFQ JSON `details` fields + enum values
// ───────────────────────────────────────────────────────────

export const RFQ_FIELD_LABEL: Record<string, string> = {
  // booth
  area: 'المساحة',
  exhibitionName: 'اسم المعرض',
  exhibitionDate: 'تاريخ المعرض',
  floors: 'عدد الطوابق',
  openSides: 'عدد الجهات المفتوحة',
  hasStorage: 'مخزن',
  hasMeetingRoom: 'غرفة اجتماعات',
  hasKitchen: 'مطبخ',
  screenCount: 'عدد الشاشات',
  specialRequirements: 'متطلبات خاصة',
  // event
  eventType: 'نوع الفعالية',
  expectedAttendees: 'عدد الحضور المتوقع',
  eventDate: 'تاريخ الفعالية',
  duration: 'المدة',
  venueProvided: 'المكان متوفر',
  needsCatering: 'يحتاج ضيافة',
  needsAV: 'يحتاج صوتيات/مرئيات',
  needsPhotography: 'يحتاج تصوير',
  // gifts
  recipientType: 'نوع المتلقي',
  quantity: 'الكمية',
  category: 'الفئة',
  hasBranding: 'يتضمن علامة تجارية',
  brandingType: 'نوع العلامة',
  deliveryDate: 'تاريخ التسليم',
  sampleRequired: 'مطلوب عينة',
  // printing
  printType: 'نوع المطبوعة',
  size: 'المقاس',
  paperType: 'نوع الورق',
  colorType: 'نوع الألوان',
  doubleSided: 'وجهين',
  hasDesign: 'تصميم جاهز',
};

export const RFQ_ENUM_VALUE_LABEL: Record<string, string> = {
  // event types
  conference: 'مؤتمر',
  seminar: 'ندوة',
  gala: 'حفل',
  launch: 'إطلاق',
  workshop: 'ورشة',
  // duration
  half_day: 'نصف يوم',
  full_day: 'يوم كامل',
  multi_day: 'عدة أيام',
  // gifts recipientType
  VIP: 'كبار الشخصيات',
  general: 'عام',
  staff: 'الموظفون',
  speakers: 'المتحدثون',
  // gifts category
  tech: 'تقنية',
  traditional: 'تقليدية',
  luxury: 'فاخرة',
  eco: 'صديقة للبيئة',
  custom: 'مخصصة',
  // branding
  logo: 'شعار',
  full_print: 'طباعة كاملة',
  engraving: 'حفر',
  embroidery: 'تطريز',
  // printing types
  brochure: 'كتيب',
  banner: 'بنر',
  business_card: 'كرت أعمال',
  catalog: 'كتالوج',
  poster: 'بوستر',
  flyer: 'فلاير',
  sticker: 'ملصق',
  other: 'أخرى',
  // paperType
  glossy: 'لامع',
  matte: 'مطفي',
  recycled: 'معاد تدويره',
  premium: 'فاخر',
  // colorType
  full_color: 'ألوان كاملة',
  single_color: 'لون واحد',
  two_color: 'لونان',
};

// ───────────────────────────────────────────────────────────
// Supplier + company lifecycle
// ───────────────────────────────────────────────────────────

export const SUPPLIER_STATUS_LABEL: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  suspended: 'موقوف',
};

export const COMPANY_SIZE_LABEL: Record<string, string> = {
  startup: 'شركة ناشئة',
  mid: 'شركة متوسطة',
  enterprise: 'شركة كبيرة',
};

// ───────────────────────────────────────────────────────────
// Escrow / payments / disputes
// ───────────────────────────────────────────────────────────

// Escrow lifecycle keys match the `escrow_transactions.status` enum in the DB.
// Persona-specific wording variants exist in escrow/earnings pages — these
// are the canonical labels for shared widgets (admin + notifications).
export const ESCROW_STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع',
  deposit_received: 'تم استلام الإيداع',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  final_payment: 'الدفعة النهائية',
  released: 'مُحرّر',
  refunded: 'مُسترد',
  partial_refund: 'استرداد جزئي',
};

export const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: 'مفتوح',
  under_review: 'قيد المراجعة',
  resolved_client: 'لصالح العميل',
  resolved_supplier: 'لصالح المورد',
  resolved_split: 'تسوية مشتركة',
  dismissed: 'مرفوض',
  cancelled: 'ملغى',
};

// ───────────────────────────────────────────────────────────
// Generic value formatters used in detail renders
// ───────────────────────────────────────────────────────────

const PLACEHOLDER = '—';
const DATE_FIELDS = new Set(['exhibitionDate', 'eventDate', 'deliveryDate']);

/** Format a single value from the RFQ `details` JSON for display. */
export function formatRfqDetailValue(
  key: string,
  value: unknown,
  formatDate: (d: string | Date) => string
): string {
  if (value === null || value === undefined || value === '') return PLACEHOLDER;
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (DATE_FIELDS.has(key) && (typeof value === 'string' || value instanceof Date)) {
    return formatDate(value as string | Date);
  }
  if (typeof value === 'string' && RFQ_ENUM_VALUE_LABEL[value]) {
    return RFQ_ENUM_VALUE_LABEL[value];
  }
  return String(value);
}
