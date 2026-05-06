import { describe, it, expect, beforeEach, vi } from 'vitest';

// Resend SDK is mocked so we can drive its behavior per-test. Each `mockSend`
// implementation simulates a different response from the real API.
const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

beforeEach(() => {
  mockSend.mockReset();
  // Default: pretend an API key is present so the lib instantiates a client.
  process.env.RESEND_API_KEY = 'test-key';
  // Reset module cache so resend.ts re-reads the env each test.
  vi.resetModules();
});

describe('sendEmail — dev mode (no API key)', () => {
  it('returns skipped: true when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 'hi',
      html: '<p>hi</p>',
    });
    expect(result.skipped).toBe(true);
    expect(result.id).toBe('dev-mode');
    // Real SDK should never be called in dev mode
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendEmail — empty recipients guard', () => {
  it('returns error when to is an empty array', async () => {
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: [],
      subject: 'hi',
      html: '<p>hi</p>',
    });
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.error).toMatch(/no recipients/i);
    }
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendEmail — happy path', () => {
  it('returns the message id on success', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_abc' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 'hi',
      html: '<p>hi</p>',
    });
    expect(result).toEqual({ id: 'msg_abc', skipped: false });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('coerces single recipient to array internally', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_x' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    await sendEmail({ to: 'one@b.co', subject: 's', html: '<p/>' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['one@b.co'] })
    );
  });

  it('passes optional replyTo through', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_x' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
      replyTo: 'reply@b.co',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'reply@b.co' })
    );
  });
});

describe('sendEmail — non-transient errors (no retry)', () => {
  it('returns error without retry on validation failure', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid `from` field' },
    });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    expect(result.skipped).toBe(false);
    if (!result.skipped) expect(result.error).toMatch(/invalid/i);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('returns error when Resend returns no id', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    expect(result.skipped).toBe(false);
    if (!result.skipped) expect(result.error).toMatch(/no id/i);
  });
});

describe('sendEmail — transient errors (retry-once)', () => {
  it('retries once on rate-limit and returns success on 2nd attempt', async () => {
    mockSend
      .mockResolvedValueOnce({ data: null, error: { message: 'Rate limit exceeded' } })
      .mockResolvedValueOnce({ data: { id: 'msg_2nd' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    expect(result).toEqual({ id: 'msg_2nd', skipped: false });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('retries on timeout', async () => {
    mockSend
      .mockResolvedValueOnce({ data: null, error: { message: 'request timeout' } })
      .mockResolvedValueOnce({ data: { id: 'msg_2nd' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    if (!result.skipped) expect(result.id).toBe('msg_2nd');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('retries on thrown network error', async () => {
    mockSend
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ data: { id: 'msg_recovery' }, error: null });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    if (!result.skipped) expect(result.id).toBe('msg_recovery');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('returns error after second failure', async () => {
    mockSend
      .mockResolvedValueOnce({ data: null, error: { message: 'Rate limit' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'Rate limit' } });
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    expect(result.skipped).toBe(false);
    if (!result.skipped) expect(result.error).toMatch(/rate limit/i);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('does not throw — even when SDK throws, returns structured error', async () => {
    mockSend.mockRejectedValue(new Error('totally broken'));
    const { sendEmail } = await import('@/lib/email/resend');
    const result = await sendEmail({
      to: 'a@b.co',
      subject: 's',
      html: '<p/>',
    });
    expect(result.skipped).toBe(false);
    if (!result.skipped) expect(result.error).toMatch(/totally broken/);
  });
});
