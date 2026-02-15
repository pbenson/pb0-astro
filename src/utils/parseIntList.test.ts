import { describe, it, expect } from 'vitest';
import { parseIntList } from './parseIntList';

describe('parseIntList', () => {
  it('parses space-separated integers', () => {
    expect(parseIntList('1 2 3')).toEqual([1, 2, 3]);
  });

  it('parses comma-separated integers', () => {
    expect(parseIntList('4,5,6')).toEqual([4, 5, 6]);
  });

  it('handles mixed delimiters', () => {
    expect(parseIntList('1, 2\t3\n4')).toEqual([1, 2, 3, 4]);
  });
});
