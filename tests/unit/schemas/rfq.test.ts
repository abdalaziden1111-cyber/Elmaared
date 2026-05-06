import { describe, it, expect } from 'vitest';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';

describe('boothDetailsSchema', () => {
  it('accepts valid booth details', () => {
    const result = boothDetailsSchema.safeParse({
      area: '6x6',
      exhibitionName: 'LEAP 2026',
      exhibitionDate: '2026-09-15',
      floors: '1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing area', () => {
    const result = boothDetailsSchema.safeParse({
      exhibitionName: 'LEAP',
      exhibitionDate: '2026-09-15',
      floors: '1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid floor value', () => {
    const result = boothDetailsSchema.safeParse({
      area: '6x6',
      exhibitionName: 'LEAP',
      exhibitionDate: '2026-09-15',
      floors: '3',
    });
    expect(result.success).toBe(false);
  });
});

describe('giftsDetailsSchema', () => {
  it('accepts valid gifts details', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: 500,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: 0,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: -10,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('eventDetailsSchema', () => {
  it('accepts valid event details', () => {
    const result = eventDetailsSchema.safeParse({
      eventType: 'conference',
      expectedAttendees: 200,
      eventDate: '2026-10-01',
      duration: 'full_day',
    });
    expect(result.success).toBe(true);
  });
});

describe('printingDetailsSchema', () => {
  it('accepts valid printing details', () => {
    const result = printingDetailsSchema.safeParse({
      printType: 'brochure',
      quantity: 1000,
      size: 'A4',
      deliveryDate: '2026-07-15',
    });
    expect(result.success).toBe(true);
  });
});
