import { describe, it, expect } from 'vitest';
import { limitToLR } from './limitToLR';

describe('limitToLR', () => {
  it('keeps only L and R characters', () => {
    expect(limitToLR('LRLR')).toBe('LRLR');
  });

  it('converts to uppercase', () => {
    expect(limitToLR('lrLR')).toBe('LRLR');
  });

  it('filters out non-LR characters', () => {
    expect(limitToLR('L1R2X')).toBe('LR');
  });

  it('returns empty string for no LR chars', () => {
    expect(limitToLR('12345')).toBe('');
  });

  it('handles empty string', () => {
    expect(limitToLR('')).toBe('');
  });
});
