import { describe, expect, it } from 'vitest';
import { Item, Tag } from '../types';
import {
  DEFAULT_ITEM_SORT_SETTINGS,
  ITEM_SORT_STORAGE_KEY,
  ItemSortSettings,
  changePrimarySortField,
  loadItemSortSettings,
  normalizeItemSortSettings,
  saveItemSortSettings,
  sortItems
} from './itemSorting';

function item(
  id: string,
  createdAt: string,
  options: Partial<Pick<Item, 'name' | 'itemId' | 'tags' | 'manualPrice' | 'autoPrice'>> = {}
): Item {
  return {
    id,
    name: options.name ?? id,
    itemId: options.itemId ?? `minecraft:${id}`,
    tags: options.tags ?? [],
    createdAt,
    manualPrice: options.manualPrice,
    autoPrice: options.autoPrice
  };
}

const tags: Record<string, Tag> = {
  fruit: { id: 'fruit', name: '水果', items: [], childTags: [], parentTags: [] },
  staple: { id: 'staple', name: '主食', items: [], childTags: [], parentTags: [] },
  vegetable: { id: 'vegetable', name: '蔬菜', items: [], childTags: [], parentTags: [] }
};

function settings(overrides: Partial<ItemSortSettings>): ItemSortSettings {
  return { ...DEFAULT_ITEM_SORT_SETTINGS, ...overrides };
}

describe('itemSorting', () => {
  it('sorts positive, zero and negative profits and always places unknown profits last', () => {
    const values = ['positive', 'zero', 'negative', 'unknown', 'noactual'].map(id => item(id, 'invalid',
      id === 'noactual' ? {} : { manualPrice: 10 }));
    const plain = { positive: 8, zero: 10, negative: 12, noactual: 1 };
    expect(sortItems(values, tags, settings({ primaryField: 'profit', primaryDirection: 'asc' }), plain).map(value => value.id))
      .toEqual(['negative', 'zero', 'positive', 'noactual', 'unknown']);
    expect(sortItems(values, tags, settings({ primaryField: 'profit', primaryDirection: 'desc' }), plain).map(value => value.id))
      .toEqual(['positive', 'zero', 'negative', 'noactual', 'unknown']);
  });

  it('combines profit with secondary sorting and keeps deterministic ties', () => {
    const values = [item('b', 'invalid', { manualPrice: 10 }), item('a', 'invalid', { manualPrice: 8 }), item('c', 'invalid', { manualPrice: 10 })];
    const plain = { b: 8, a: 6, c: 9 };
    expect(sortItems(values, tags, settings({ primaryField: 'profit', primaryDirection: 'desc', secondaryField: 'price', secondaryDirection: 'asc' }), plain).map(value => value.id))
      .toEqual(['a', 'b', 'c']);
    expect(sortItems(values, tags, settings({ primaryField: 'price', secondaryField: 'profit', secondaryDirection: 'desc' }), plain).map(value => value.id))
      .toEqual(['b', 'c', 'a']);
    expect(sortItems(values, tags, settings({ primaryField: 'profit', primaryDirection: 'desc' }), plain).map(value => value.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('restores profit preferences and continues accepting old preferences', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const value = settings({ primaryField: 'profit', secondaryField: 'price', primaryDirection: 'asc' });
    saveItemSortSettings(value, storage);
    expect(loadItemSortSettings(storage)).toEqual(value);
    expect(normalizeItemSortSettings(DEFAULT_ITEM_SORT_SETTINGS)).toEqual(DEFAULT_ITEM_SORT_SETTINGS);
  });

  it('sorts creation time in both directions', () => {
    const values = [
      item('missing', 'invalid'),
      item('old', '2026-01-01T00:00:00.000Z'),
      item('new', '2026-01-02T00:00:00.000Z')
    ];

    expect(sortItems(values, tags, settings({ primaryDirection: 'desc' })).map(value => value.id))
      .toEqual(['new', 'old', 'missing']);
    expect(sortItems(values, tags, settings({ primaryDirection: 'asc' })).map(value => value.id))
      .toEqual(['old', 'new', 'missing']);
  });

  it('uses effective prices including zero and always places missing values last', () => {
    const values = [
      item('missing', 'invalid'),
      item('manual', 'invalid', { manualPrice: 3, autoPrice: 1 }),
      item('zero', 'invalid', { autoPrice: 0 })
    ];

    expect(sortItems(values, tags, settings({ primaryField: 'price', primaryDirection: 'asc' }))
      .map(value => value.id)).toEqual(['zero', 'manual', 'missing']);
    expect(sortItems(values, tags, settings({ primaryField: 'price', primaryDirection: 'desc' }))
      .map(value => value.id)).toEqual(['manual', 'zero', 'missing']);
  });

  it('sorts normalized tag names and ignores the stored tag order', () => {
    const values = [
      item('vegetable', 'invalid', { tags: ['vegetable'] }),
      item('mixed-b', 'invalid', { tags: ['staple', 'fruit'] }),
      item('untagged', 'invalid'),
      item('mixed-a', 'invalid', { tags: ['fruit', 'staple'] })
    ];

    expect(sortItems(values, tags, settings({ primaryField: 'tags', primaryDirection: 'asc' }))
      .map(value => value.id)).toEqual(['vegetable', 'mixed-a', 'mixed-b', 'untagged']);
  });

  it('applies independent secondary sorting and stable fallbacks', () => {
    const values = [
      item('b', '2026-01-01T00:00:00.000Z', { name: '乙', manualPrice: 2 }),
      item('a', '2026-01-01T00:00:00.000Z', { name: '甲', manualPrice: 2 }),
      item('c', '2026-01-01T00:00:00.000Z', { name: '丙', manualPrice: 1 })
    ];

    expect(sortItems(values, tags, settings({
      secondaryField: 'price',
      secondaryDirection: 'desc'
    })).map(value => value.id)).toEqual(['a', 'b', 'c']);
  });

  it('removes a duplicated secondary field and restores invalid settings', () => {
    expect(normalizeItemSortSettings({
      primaryField: 'price',
      primaryDirection: 'sideways',
      secondaryField: 'price',
      secondaryDirection: 'desc'
    })).toEqual({
      primaryField: 'price',
      primaryDirection: 'desc',
      secondaryField: null,
      secondaryDirection: 'desc'
    });
  });

  it('clears the secondary field when it becomes the primary field', () => {
    expect(changePrimarySortField(settings({ secondaryField: 'price' }), 'price'))
      .toEqual(settings({ primaryField: 'price', secondaryField: null }));
  });

  it('persists settings and falls back when browser storage is invalid', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };
    const value = settings({ primaryField: 'tags', secondaryField: 'price' });

    saveItemSortSettings(value, storage);
    expect(loadItemSortSettings(storage)).toEqual(value);
    values.set(ITEM_SORT_STORAGE_KEY, '{invalid');
    expect(loadItemSortSettings(storage)).toEqual(DEFAULT_ITEM_SORT_SETTINGS);
  });
});
