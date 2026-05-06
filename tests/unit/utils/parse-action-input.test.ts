import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseActionInput } from '@/lib/utils/parse-action-input';

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().positive(),
});

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('parseActionInput — happy path', () => {
  it('parses and validates a clean input', () => {
    const result = parseActionInput(
      fd({ email: 'a@b.co', age: '21' }),
      schema,
      (f) => ({
        email: f.get('email'),
        age: Number(f.get('age')),
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ email: 'a@b.co', age: 21 });
    }
  });
});

describe('parseActionInput — validation failures', () => {
  it('returns fieldErrors on schema mismatch', () => {
    const result = parseActionInput(
      fd({ email: 'not-email', age: '-5' }),
      schema,
      (f) => ({ email: f.get('email'), age: Number(f.get('age')) })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.email).toBeDefined();
      expect(result.fieldErrors.age).toBeDefined();
    }
  });

  it('does not include empty error arrays in fieldErrors', () => {
    const result = parseActionInput(
      fd({ email: 'a@b.co', age: '-5' }),
      schema,
      (f) => ({ email: f.get('email'), age: Number(f.get('age')) })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.email).toBeUndefined();
      expect(result.fieldErrors.age).toBeDefined();
    }
  });
});

describe('parseActionInput — shape exceptions', () => {
  it('catches throws inside the shape extractor', () => {
    const result = parseActionInput(fd({}), schema, () => {
      throw new Error('bad shape');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/بيانات/);
      expect(result.fieldErrors).toEqual({});
    }
  });

  it('catches throws inside the shape extractor for JSON parse failures', () => {
    const result = parseActionInput(
      fd({ data: 'not json' }),
      z.object({ data: z.object({}) }),
      (f) => ({ data: JSON.parse(String(f.get('data'))) })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/بيانات/);
    }
  });
});

describe('parseActionInput — extra keys', () => {
  it('strips unknown keys via Zod default behavior', () => {
    const result = parseActionInput(
      fd({ email: 'a@b.co', age: '21', extra: 'ignored' }),
      schema,
      (f) => ({
        email: f.get('email'),
        age: Number(f.get('age')),
        extra: f.get('extra'),
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Zod strips unknown keys — `extra` is not on the result
      expect((result.data as Record<string, unknown>).extra).toBeUndefined();
    }
  });
});
