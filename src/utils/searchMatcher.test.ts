import { describe, expect, it } from 'vitest';
import { matchesSearch } from './searchMatcher';

describe('matchesSearch', () => {
  it.each(['麻婆豆腐', '麻婆', 'mapodoufu', 'mpdf', 'doufu'])(
    'matches Chinese names with text, full pinyin and initials: %s',
    query => expect(matchesSearch(query, '麻婆豆腐')).toBe(true)
  );

  it('matches IDs case-insensitively and searches across multiple fields', () => {
    expect(matchesSearch('FARMERSDELIGHT', '麻婆豆腐', 'farmersdelight:mapo_tofu')).toBe(true);
    expect(matchesSearch('hongshao', '麻婆豆腐', 'test:mapo_tofu')).toBe(false);
  });

  it('treats an empty query as no filter', () => {
    expect(matchesSearch('   ', '任意物品')).toBe(true);
  });
});
