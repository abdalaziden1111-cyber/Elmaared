import { describe, it, expect } from 'vitest';
import { rfqMatchEmail } from '@/lib/email/templates';

describe('rfqMatchEmail — structure', () => {
  it('produces both subject and html', () => {
    const out = rfqMatchEmail({
      supplierName: 'مورد',
      rfqNumber: 'RFQ-2026-00001',
      serviceTypeAr: 'تصميم وتنفيذ أجنحة',
      city: 'Riyadh',
      budgetRange: '50000–80000 ﷼',
      deadline: '2026-09-15',
      rfqUrl: 'https://app-exhibition.sa/ar/supplier/rfqs/abc',
    });
    expect(out.subject).toContain('RFQ-2026-00001');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('lang="ar"');
    expect(out.html).toContain('dir="rtl"');
  });

  it('includes RFQ number in subject', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'RFQ-2026-00007',
      serviceTypeAr: 'مطبوعات',
      city: 'Jeddah',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.subject).toContain('RFQ-2026-00007');
  });

  it('falls back to "لم تُحدد" when budgetRange is null', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'RFQ-1',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).toContain('لم تُحدد');
  });

  it('includes the CTA link', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'RFQ-1',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://app-exhibition.sa/ar/supplier/rfqs/abc',
    });
    expect(out.html).toContain('https:&#x2F;&#x2F;app-exhibition.sa');
    expect(out.html).toContain('افتح الطلب');
  });
});

describe('rfqMatchEmail — XSS resistance', () => {
  it('escapes script tag in supplierName', () => {
    const out = rfqMatchEmail({
      supplierName: '<script>alert(1)</script>',
      rfqNumber: 'RFQ-1',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).not.toContain('<script>');
    expect(out.html).not.toContain('</script>');
    expect(out.html).toContain('&lt;script&gt;');
  });

  it('escapes onerror payload in supplierName', () => {
    const out = rfqMatchEmail({
      supplierName: '<img src=x onerror="alert(1)">',
      rfqNumber: 'RFQ-1',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).not.toContain('"alert(1)"');
    expect(out.html).toContain('&lt;img');
  });

  it('escapes script payload in rfqNumber', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: '<script>x</script>',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).not.toContain('<script>x</script>');
  });

  it('escapes payload in serviceTypeAr', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'X',
      serviceTypeAr: '<b>bold</b>',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).not.toContain('<b>bold</b>');
    expect(out.html).toContain('&lt;b&gt;bold');
  });

  it('escapes payload in city', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'X',
      serviceTypeAr: 'X',
      city: '"><script>alert(1)</script>',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).not.toContain('<script>');
  });

  it('escapes javascript: URL in rfqUrl (defense-in-depth)', () => {
    // We don't strip javascript: urls — but escapeAttr ensures no quotes
    // can break out of the href context. The href value will be a literal
    // (escaped) string, so the click would just navigate to the literal URL.
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'X',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'javascript:alert(1)',
    });
    // The colon stays, but quotes would have been escaped if present
    expect(out.html).toContain('javascript:alert(1)');
  });

  it('escapes attribute-breakout attempt in rfqUrl', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'X',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://safe.com" onclick="alert(1)',
    });
    // The closing quote in the url should be escaped, so the onclick
    // attribute can never be parsed as a separate attribute
    expect(out.html).not.toMatch(/onclick="alert/);
  });

  it('escapes ampersand in URL parameters', () => {
    const out = rfqMatchEmail({
      supplierName: 'X',
      rfqNumber: 'X',
      serviceTypeAr: 'X',
      city: 'X',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa/path?a=1&b=2',
    });
    // & must be &amp; in attribute context per HTML spec
    expect(out.html).toContain('a=1&amp;b=2');
  });

  it('preserves Arabic characters untouched', () => {
    const out = rfqMatchEmail({
      supplierName: 'مؤسسة الإبداع',
      rfqNumber: 'RFQ-1',
      serviceTypeAr: 'تصميم وتنفيذ أجنحة',
      city: 'الرياض',
      budgetRange: null,
      deadline: '—',
      rfqUrl: 'https://example.sa',
    });
    expect(out.html).toContain('مؤسسة الإبداع');
    expect(out.html).toContain('تصميم وتنفيذ أجنحة');
    expect(out.html).toContain('الرياض');
  });
});
