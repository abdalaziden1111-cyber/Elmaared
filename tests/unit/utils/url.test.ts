import { describe, it, expect } from 'vitest';
import { isSafeUrl, isSafeHttpsUrl, canonicalizeUrl } from '@/lib/utils/url';

describe('isSafeUrl — accepts', () => {
  it('https url with hostname', () => {
    expect(isSafeUrl('https://drive.google.com/file/abc')).toBe(true);
  });

  it('http url with hostname (allowed by default)', () => {
    expect(isSafeUrl('http://example.sa/path')).toBe(true);
  });

  it('https url with port', () => {
    expect(isSafeUrl('https://example.sa:8443/x')).toBe(true);
  });

  it('https url with query and fragment', () => {
    expect(isSafeUrl('https://example.sa/x?a=1#frag')).toBe(true);
  });

  it('https url with international domain', () => {
    expect(isSafeUrl('https://أجنحة.sa/x')).toBe(true);
  });
});

describe('isSafeUrl — rejects dangerous schemes', () => {
  it('rejects javascript: scheme', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: scheme', () => {
    expect(isSafeUrl('data:text/html,<script>x</script>')).toBe(false);
  });

  it('rejects file: scheme', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects ftp:', () => {
    expect(isSafeUrl('ftp://example.com/file')).toBe(false);
  });

  it('rejects vbscript:', () => {
    expect(isSafeUrl('vbscript:msgbox')).toBe(false);
  });
});

describe('isSafeUrl — rejects SSRF targets', () => {
  it('rejects localhost', () => {
    expect(isSafeUrl('http://localhost:3000/x')).toBe(false);
    expect(isSafeUrl('https://LOCALHOST/x')).toBe(false);
  });

  it('rejects 127.0.0.1', () => {
    expect(isSafeUrl('http://127.0.0.1/x')).toBe(false);
  });

  it('rejects 127.x.x.x range', () => {
    expect(isSafeUrl('http://127.255.255.254/x')).toBe(false);
  });

  it('rejects 0.0.0.0', () => {
    expect(isSafeUrl('http://0.0.0.0/x')).toBe(false);
  });

  it('rejects RFC1918 10.x.x.x', () => {
    expect(isSafeUrl('http://10.0.0.5/x')).toBe(false);
  });

  it('rejects RFC1918 192.168.x.x', () => {
    expect(isSafeUrl('http://192.168.1.1/x')).toBe(false);
  });

  it('rejects RFC1918 172.16-31', () => {
    expect(isSafeUrl('http://172.16.0.1/x')).toBe(false);
    expect(isSafeUrl('http://172.20.0.1/x')).toBe(false);
    expect(isSafeUrl('http://172.31.255.255/x')).toBe(false);
  });

  it('accepts 172.15 and 172.32 (outside RFC1918)', () => {
    expect(isSafeUrl('http://172.15.0.1/x')).toBe(true);
    expect(isSafeUrl('http://172.32.0.1/x')).toBe(true);
  });

  it('rejects link-local 169.254.x.x (cloud metadata range)', () => {
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });
});

describe('isSafeUrl — invalid input', () => {
  it('returns false for non-URL strings', () => {
    expect(isSafeUrl('not a url')).toBe(false);
    expect(isSafeUrl('://broken')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('   ')).toBe(false);
  });

  it('returns false for non-string', () => {
    // @ts-expect-error — runtime check
    expect(isSafeUrl(42)).toBe(false);
    // @ts-expect-error — runtime check
    expect(isSafeUrl({})).toBe(false);
  });
});

describe('isSafeHttpsUrl', () => {
  it('accepts https URLs', () => {
    expect(isSafeHttpsUrl('https://example.sa')).toBe(true);
  });

  it('rejects plain http', () => {
    expect(isSafeHttpsUrl('http://example.sa')).toBe(false);
  });

  it('rejects javascript:', () => {
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('canonicalizeUrl', () => {
  it('strips query and fragment', () => {
    expect(canonicalizeUrl('https://example.sa/x?a=1#frag')).toBe(
      'https://example.sa/x'
    );
  });

  it('preserves the host casing as URL parses it', () => {
    expect(canonicalizeUrl('https://EXAMPLE.SA/x')).toBe('https://example.sa/x');
  });

  it('preserves port', () => {
    expect(canonicalizeUrl('https://example.sa:8443/x?y=1')).toBe(
      'https://example.sa:8443/x'
    );
  });

  it('returns null for non-URL', () => {
    expect(canonicalizeUrl('not a url')).toBeNull();
    expect(canonicalizeUrl(null)).toBeNull();
  });
});
