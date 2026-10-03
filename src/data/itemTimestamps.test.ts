import { describe, expect, it } from 'vitest';
import { Item } from '../types';
import { getImportedItemCreatedAt, normalizeItemTimestamps } from './itemTimestamps';
import { DATA_SCHEMA_VERSION, normalizePersisted } from './store';

function legacyItem(id: string): Item {
  return {
    id,
    name: id,
    itemId: `minecraft:${id}`,
    tags: []
  };
}

describe('item timestamps', () => {
  it('backfills stable ascending timestamps ending at the snapshot update time', () => {
    const result = normalizeItemTimestamps({
      first: legacyItem('first'),
      second: legacyItem('second'),
      third: legacyItem('third')
    }, '2026-09-28T06:35:31.113Z');

    expect(result.first.createdAt).toBe('2026-09-28T06:35:29.113Z');
    expect(result.second.createdAt).toBe('2026-09-28T06:35:30.113Z');
    expect(result.third.createdAt).toBe('2026-09-28T06:35:31.113Z');
  });

  it('preserves valid timestamps and replaces invalid timestamps', () => {
    const result = normalizeItemTimestamps({
      valid: { ...legacyItem('valid'), createdAt: '2020-01-01T00:00:00.000Z' },
      invalid: { ...legacyItem('invalid'), createdAt: 'not-a-date' }
    }, '2026-01-01T00:00:00.000Z');

    expect(result.valid.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(result.invalid.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('normalizes legacy persisted data to schema v3', () => {
    const result = normalizePersisted({
      schemaVersion: 2,
      updatedAt: '2026-01-01T00:00:00.000Z',
      data: { items: { legacy: legacyItem('legacy') }, tags: {}, recipes: {}, unlockPlan: { stages: [{ id: 's1', name: '阶段1' }], itemStages: {} } }
    });

    expect(result.schemaVersion).toBe(DATA_SCHEMA_VERSION);
    expect(result.data.items.legacy.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('preserves valid imported timestamps and uses a supplied fallback otherwise', () => {
    expect(getImportedItemCreatedAt('2020-01-01T00:00:00.000Z', 'fallback'))
      .toBe('2020-01-01T00:00:00.000Z');
    expect(getImportedItemCreatedAt('invalid', '2026-01-01T00:00:00.001Z'))
      .toBe('2026-01-01T00:00:00.001Z');
  });
});
