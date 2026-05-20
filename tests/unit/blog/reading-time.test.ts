// Phase V5.2 — Reading-time + slugify helpers.

import { describe, it, expect } from 'vitest';
import { readingTimeMinutes, slugify } from '@/lib/blog/reading-time';

describe('readingTimeMinutes', () => {
  it('returns 1 for empty input', () => {
    expect(readingTimeMinutes('')).toBe(1);
  });

  it('returns 1 for a single-word post', () => {
    expect(readingTimeMinutes('<p>hello</p>')).toBe(1);
  });

  it('200 words → 1 minute', () => {
    const html = '<p>' + Array(200).fill('word').join(' ') + '</p>';
    expect(readingTimeMinutes(html)).toBe(1);
  });

  it('201 words → 2 minutes (ceiling)', () => {
    const html = '<p>' + Array(201).fill('word').join(' ') + '</p>';
    expect(readingTimeMinutes(html)).toBe(2);
  });

  it('strips HTML tags and entities', () => {
    const html =
      '<h1>Title</h1><p>Some <strong>bold</strong> text &nbsp; here.</p>';
    expect(readingTimeMinutes(html)).toBe(1);
  });

  it('handles Arabic content', () => {
    const html = '<p>' + Array(220).fill('كلمة').join(' ') + '</p>';
    expect(readingTimeMinutes(html)).toBe(2);
  });
});

describe('slugify', () => {
  it('lowercases ASCII alphanum and hyphenates non-alphanumeric', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });

  it('collapses runs of separators', () => {
    expect(slugify('Hello   World   123')).toBe('hello-world-123');
  });

  it('caps at 80 characters', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it('produces empty string for pure Arabic', () => {
    expect(slugify('مرحبا')).toBe('');
  });

  it('preserves digits', () => {
    expect(slugify('Sprint V 7')).toBe('sprint-v-7');
  });
});
