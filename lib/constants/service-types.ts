export const SERVICE_TYPES = [
  { value: 'booth', labelAr: 'تصميم وتنفيذ أجنحة', labelEn: 'Booth Design & Build', icon: 'SquareDashed' },
  { value: 'gifts', labelAr: 'هدايا ترويجية', labelEn: 'Promotional Gifts', icon: 'Gift' },
  { value: 'event', labelAr: 'تنظيم فعاليات', labelEn: 'Event Management', icon: 'CalendarDays' },
  { value: 'printing', labelAr: 'مطبوعات', labelEn: 'Print Materials', icon: 'Printer' },
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number]['value'];
