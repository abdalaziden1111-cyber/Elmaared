import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// next-intl's client navigation module can't load in jsdom (ESM subpath
// resolution issue). The PDPL banner uses Link only as a styled <a>, so
// stub it with a plain anchor for the unit suite.
vi.mock('@/lib/i18n/routing', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock localStorage so tests can simulate first-visit / returning user.
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  // jsdom provides localStorage; override its backing store.
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
      clear: () => storage.clear(),
      key: () => null,
      get length() {
        return storage.size;
      },
    },
  });
  vi.resetModules();
});

describe('PDPLConsentBanner', () => {
  it('renders the banner on first visit when FF_PDPL_CONSENT is ON', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { PDPL_CONSENT: true },
    }));
    const { PDPLConsentBanner } = await import('@/components/legal/pdpl-consent');
    render(<PDPLConsentBanner />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('موافقة استخدام البيانات')).toBeInTheDocument();
  });

  it('does NOT render when FF_PDPL_CONSENT is OFF', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { PDPL_CONSENT: false },
    }));
    const { PDPLConsentBanner } = await import('@/components/legal/pdpl-consent');
    const { container } = render(<PDPLConsentBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('hides after the user clicks "أوافق" and stores the decision', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { PDPL_CONSENT: true },
    }));
    const { PDPLConsentBanner } = await import('@/components/legal/pdpl-consent');
    render(<PDPLConsentBanner />);
    const accept = await screen.findByTestId('pdpl-accept');
    fireEvent.click(accept);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(storage.get('elmaared:pdpl-consent-v1')).toBe('accepted');
  });

  it('hides after the user clicks "رفض غير الأساسي" and stores the decision', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { PDPL_CONSENT: true },
    }));
    const { PDPLConsentBanner } = await import('@/components/legal/pdpl-consent');
    render(<PDPLConsentBanner />);
    const decline = await screen.findByTestId('pdpl-decline');
    fireEvent.click(decline);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(storage.get('elmaared:pdpl-consent-v1')).toBe('declined');
  });

  it('does not re-render the banner for a returning user (localStorage has a value)', async () => {
    storage.set('elmaared:pdpl-consent-v1', 'accepted');
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { PDPL_CONSENT: true },
    }));
    const { PDPLConsentBanner } = await import('@/components/legal/pdpl-consent');
    const { container } = render(<PDPLConsentBanner />);
    // Yield a tick so useEffect runs.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('ZatcaQrCode', () => {
  it('renders the QR SVG when tlvBase64 is provided', async () => {
    const { ZatcaQrCode } = await import('@/components/legal/zatca-qr-code');
    const { container } = render(<ZatcaQrCode tlvBase64="AQEBAQEBAQE=" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(
      container.querySelector('[data-component="zatca-qr-code"]')?.getAttribute(
        'data-state',
      ),
    ).toBe('ready');
  });

  it('renders the empty placeholder when tlvBase64 is missing', async () => {
    const { ZatcaQrCode } = await import('@/components/legal/zatca-qr-code');
    const { container } = render(<ZatcaQrCode tlvBase64="" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('رمز ZATCA QR قيد الإصدار')).toBeInTheDocument();
    expect(
      container.querySelector('[data-component="zatca-qr-code"]')?.getAttribute(
        'data-state',
      ),
    ).toBe('empty');
  });

  it('honors a custom size prop', async () => {
    const { ZatcaQrCode } = await import('@/components/legal/zatca-qr-code');
    const { container } = render(
      <ZatcaQrCode tlvBase64="AQEBAQEBAQE=" size={300} />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('300');
  });
});
