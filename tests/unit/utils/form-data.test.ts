import { describe, it, expect } from 'vitest';
import {
  getFormString,
  getFormStringOrEmpty,
  getFormNumber,
  getFormJson,
  getFormStringArray,
  getFormFile,
} from '@/lib/utils/form-data';

function fd(entries: Record<string, string | File>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    f.set(k, v);
  }
  return f;
}

describe('getFormString', () => {
  it('returns trimmed value when present', () => {
    expect(getFormString(fd({ name: '  hello  ' }), 'name')).toBe('hello');
  });

  it('returns null for missing key', () => {
    expect(getFormString(fd({}), 'name')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getFormString(fd({ name: '' }), 'name')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(getFormString(fd({ name: '   ' }), 'name')).toBeNull();
  });

  it('returns null for File value', () => {
    const file = new File(['x'], 'x.txt');
    expect(getFormString(fd({ name: file }), 'name')).toBeNull();
  });
});

describe('getFormStringOrEmpty', () => {
  it('returns raw value untouched (not trimmed)', () => {
    expect(getFormStringOrEmpty(fd({ name: '  hello  ' }), 'name')).toBe('  hello  ');
  });

  it('returns empty string for missing key', () => {
    expect(getFormStringOrEmpty(fd({}), 'name')).toBe('');
  });

  it('returns empty string for File value', () => {
    const file = new File(['x'], 'x.txt');
    expect(getFormStringOrEmpty(fd({ name: file }), 'name')).toBe('');
  });
});

describe('getFormNumber', () => {
  it('parses integer', () => {
    expect(getFormNumber(fd({ n: '42' }), 'n')).toBe(42);
  });

  it('parses float', () => {
    expect(getFormNumber(fd({ n: '3.14' }), 'n')).toBe(3.14);
  });

  it('parses negative', () => {
    expect(getFormNumber(fd({ n: '-7' }), 'n')).toBe(-7);
  });

  it('parses zero', () => {
    expect(getFormNumber(fd({ n: '0' }), 'n')).toBe(0);
  });

  it('handles whitespace around digits', () => {
    expect(getFormNumber(fd({ n: '  42  ' }), 'n')).toBe(42);
  });

  it('returns null for empty string', () => {
    expect(getFormNumber(fd({ n: '' }), 'n')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(getFormNumber(fd({ n: 'abc' }), 'n')).toBeNull();
  });

  it('returns null for missing key', () => {
    expect(getFormNumber(fd({}), 'n')).toBeNull();
  });

  it('returns null for "Infinity" string', () => {
    expect(getFormNumber(fd({ n: 'Infinity' }), 'n')).toBeNull();
  });

  it('returns null for "NaN" string', () => {
    expect(getFormNumber(fd({ n: 'NaN' }), 'n')).toBeNull();
  });
});

describe('getFormJson', () => {
  it('parses valid JSON object', () => {
    expect(getFormJson(fd({ d: '{"a":1}' }), 'd')).toEqual({ a: 1 });
  });

  it('parses valid JSON array', () => {
    expect(getFormJson(fd({ d: '[1,2,3]' }), 'd')).toEqual([1, 2, 3]);
  });

  it('returns null for invalid JSON', () => {
    expect(getFormJson(fd({ d: '{invalid}' }), 'd')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getFormJson(fd({ d: '' }), 'd')).toBeNull();
  });

  it('returns null for missing key', () => {
    expect(getFormJson(fd({}), 'd')).toBeNull();
  });
});

describe('getFormStringArray', () => {
  it('returns the parsed array', () => {
    expect(getFormStringArray(fd({ d: '["a","b"]' }), 'd')).toEqual(['a', 'b']);
  });

  it('returns empty array for missing key', () => {
    expect(getFormStringArray(fd({}), 'd')).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(getFormStringArray(fd({ d: 'not json' }), 'd')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(getFormStringArray(fd({ d: '{"a":1}' }), 'd')).toEqual([]);
  });

  it('filters out non-string items', () => {
    expect(getFormStringArray(fd({ d: '["a", 1, null, "b"]' }), 'd')).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('getFormFile', () => {
  it('returns the File when present', () => {
    const file = new File(['hello'], 'h.txt');
    expect(getFormFile(fd({ f: file }), 'f')).toBe(file);
  });

  it('returns null for string value', () => {
    expect(getFormFile(fd({ f: 'hello' }), 'f')).toBeNull();
  });

  it('returns null for empty file (size 0)', () => {
    const file = new File([], 'empty.txt');
    expect(getFormFile(fd({ f: file }), 'f')).toBeNull();
  });

  it('returns null for missing key', () => {
    expect(getFormFile(fd({}), 'f')).toBeNull();
  });
});
