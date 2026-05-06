import { describe, it, expect } from 'vitest';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';

describe('boothDetailsSchema', () => {
  const valid = {
    area: '6x6',
    exhibitionName: 'LEAP 2026',
    exhibitionDate: '2026-09-15',
    floors: '1' as const,
  };

  it('accepts valid booth details', () => {
    expect(boothDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing area', () => {
    const { area: _omit, ...rest } = valid;
    expect(boothDetailsSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty area string', () => {
    expect(boothDetailsSchema.safeParse({ ...valid, area: '' }).success).toBe(false);
  });

  it('rejects invalid floor value', () => {
    expect(boothDetailsSchema.safeParse({ ...valid, floors: '3' }).success).toBe(false);
  });

  it('accepts both floor values', () => {
    expect(boothDetailsSchema.safeParse({ ...valid, floors: '1' }).success).toBe(true);
    expect(boothDetailsSchema.safeParse({ ...valid, floors: '2' }).success).toBe(true);
  });

  it('rejects exhibition name shorter than 2 chars', () => {
    expect(
      boothDetailsSchema.safeParse({ ...valid, exhibitionName: 'A' }).success
    ).toBe(false);
  });

  it('accepts ISO date string', () => {
    expect(
      boothDetailsSchema.safeParse({ ...valid, exhibitionDate: '2026-09-15' }).success
    ).toBe(true);
  });

  it('accepts ISO datetime string', () => {
    expect(
      boothDetailsSchema.safeParse({
        ...valid,
        exhibitionDate: '2026-09-15T10:00:00Z',
      }).success
    ).toBe(true);
  });

  it('rejects invalid date string', () => {
    expect(
      boothDetailsSchema.safeParse({ ...valid, exhibitionDate: 'not-a-date' }).success
    ).toBe(false);
  });

  it('accepts each open-side value', () => {
    for (const sides of ['1', '2', '3', '4'] as const) {
      expect(
        boothDetailsSchema.safeParse({ ...valid, openSides: sides }).success
      ).toBe(true);
    }
  });

  it('rejects open-side 0 or 5', () => {
    expect(boothDetailsSchema.safeParse({ ...valid, openSides: '0' }).success).toBe(false);
    expect(boothDetailsSchema.safeParse({ ...valid, openSides: '5' }).success).toBe(false);
  });

  it('defaults boolean amenities to false when omitted', () => {
    const r = boothDetailsSchema.safeParse(valid);
    if (r.success) {
      expect(r.data.hasStorage).toBe(false);
      expect(r.data.hasMeetingRoom).toBe(false);
      expect(r.data.hasKitchen).toBe(false);
      expect(r.data.screenCount).toBe(0);
    }
  });

  it('rejects negative screen count', () => {
    expect(
      boothDetailsSchema.safeParse({ ...valid, screenCount: -1 }).success
    ).toBe(false);
  });
});

describe('giftsDetailsSchema', () => {
  const valid = {
    recipientType: 'VIP' as const,
    quantity: 500,
    category: 'tech' as const,
    deliveryDate: '2026-08-01',
  };

  it('accepts valid gifts details', () => {
    expect(giftsDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero quantity', () => {
    expect(giftsDetailsSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('rejects negative quantity', () => {
    expect(giftsDetailsSchema.safeParse({ ...valid, quantity: -10 }).success).toBe(false);
  });

  it('rejects fractional quantity', () => {
    expect(giftsDetailsSchema.safeParse({ ...valid, quantity: 5.5 }).success).toBe(false);
  });

  it('accepts very large quantity', () => {
    expect(
      giftsDetailsSchema.safeParse({ ...valid, quantity: 1_000_000 }).success
    ).toBe(true);
  });

  it('accepts each recipient type', () => {
    for (const t of ['VIP', 'general', 'staff', 'speakers'] as const) {
      expect(
        giftsDetailsSchema.safeParse({ ...valid, recipientType: t }).success
      ).toBe(true);
    }
  });

  it('rejects invalid recipient type', () => {
    expect(
      giftsDetailsSchema.safeParse({ ...valid, recipientType: 'random' as 'VIP' }).success
    ).toBe(false);
  });

  it('accepts each category', () => {
    for (const c of ['tech', 'traditional', 'luxury', 'eco', 'custom'] as const) {
      expect(
        giftsDetailsSchema.safeParse({ ...valid, category: c }).success
      ).toBe(true);
    }
  });

  it('accepts optional branding type when hasBranding=true', () => {
    expect(
      giftsDetailsSchema.safeParse({
        ...valid,
        hasBranding: true,
        brandingType: 'logo',
      }).success
    ).toBe(true);
  });

  it('rejects invalid branding type', () => {
    expect(
      giftsDetailsSchema.safeParse({
        ...valid,
        brandingType: 'silkscreen' as 'logo',
      }).success
    ).toBe(false);
  });

  it('defaults hasBranding to true and sampleRequired to false', () => {
    const r = giftsDetailsSchema.safeParse(valid);
    if (r.success) {
      expect(r.data.hasBranding).toBe(true);
      expect(r.data.sampleRequired).toBe(false);
    }
  });
});

describe('eventDetailsSchema', () => {
  const valid = {
    eventType: 'conference' as const,
    expectedAttendees: 200,
    eventDate: '2026-10-01',
    duration: 'full_day' as const,
  };

  it('accepts valid event details', () => {
    expect(eventDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero attendees', () => {
    expect(
      eventDetailsSchema.safeParse({ ...valid, expectedAttendees: 0 }).success
    ).toBe(false);
  });

  it('rejects negative attendees', () => {
    expect(
      eventDetailsSchema.safeParse({ ...valid, expectedAttendees: -1 }).success
    ).toBe(false);
  });

  it('accepts each event type', () => {
    for (const t of ['conference', 'seminar', 'gala', 'launch', 'workshop'] as const) {
      expect(
        eventDetailsSchema.safeParse({ ...valid, eventType: t }).success
      ).toBe(true);
    }
  });

  it('accepts each duration', () => {
    for (const d of ['half_day', 'full_day', 'multi_day'] as const) {
      expect(
        eventDetailsSchema.safeParse({ ...valid, duration: d }).success
      ).toBe(true);
    }
  });

  it('defaults needsAV to true and others to false', () => {
    const r = eventDetailsSchema.safeParse(valid);
    if (r.success) {
      expect(r.data.needsAV).toBe(true);
      expect(r.data.needsCatering).toBe(false);
      expect(r.data.needsPhotography).toBe(false);
      expect(r.data.venueProvided).toBe(false);
    }
  });
});

describe('printingDetailsSchema', () => {
  const valid = {
    printType: 'brochure' as const,
    quantity: 1000,
    size: 'A4',
    deliveryDate: '2026-07-15',
  };

  it('accepts valid printing details', () => {
    expect(printingDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty size', () => {
    expect(
      printingDetailsSchema.safeParse({ ...valid, size: '' }).success
    ).toBe(false);
  });

  it('accepts each print type', () => {
    const all = [
      'brochure', 'banner', 'business_card', 'catalog',
      'poster', 'flyer', 'sticker', 'other',
    ] as const;
    for (const t of all) {
      expect(
        printingDetailsSchema.safeParse({ ...valid, printType: t }).success
      ).toBe(true);
    }
  });

  it('accepts each color type', () => {
    for (const c of ['full_color', 'single_color', 'two_color'] as const) {
      expect(
        printingDetailsSchema.safeParse({ ...valid, colorType: c }).success
      ).toBe(true);
    }
  });

  it('defaults colorType to full_color and doubleSided to false', () => {
    const r = printingDetailsSchema.safeParse(valid);
    if (r.success) {
      expect(r.data.colorType).toBe('full_color');
      expect(r.data.doubleSided).toBe(false);
      expect(r.data.hasDesign).toBe(false);
    }
  });

  it('rejects invalid paper type', () => {
    expect(
      printingDetailsSchema.safeParse({
        ...valid,
        paperType: 'kraft' as 'glossy',
      }).success
    ).toBe(false);
  });
});
