import { describe, expect, it } from 'vitest';
import persistedJson from '../../public/data/recipe-manager.json';
import { PersistedData } from '../types';
import { BASE_INGREDIENT_PRICES, WORKSTATION_PROCESSING_FEES } from './pricingBaseline';

const persisted = persistedJson as unknown as PersistedData;

function findTag(name: string) {
  const matches = Object.values(persisted.data.tags).filter(tag => tag.name.trim() === name);
  expect(matches).toHaveLength(1);
  return matches[0];
}

describe('正式数据定价基准', () => {
  it('覆盖全部基础食材，并保存非负整数手动价', () => {
    const tag = findTag('基础食材');
    expect(tag.items).toHaveLength(86);
    expect(Object.keys(BASE_INGREDIENT_PRICES)).toHaveLength(86);

    const actual = Object.fromEntries(tag.items.map(itemId => {
      const item = persisted.data.items[itemId];
      return [item.name, item.manualPrice];
    }));

    expect(actual).toEqual(BASE_INGREDIENT_PRICES);
    expect(Object.values(actual).every(price => price !== undefined && Number.isInteger(price) && price >= 0)).toBe(true);
    expect(actual.水桶).toBe(0);
  });

  it('覆盖全部工作方块，不设置物品手动价', () => {
    const tag = findTag('工作方块');
    expect(tag.items).toHaveLength(16);
    expect(Object.keys(WORKSTATION_PROCESSING_FEES)).toHaveLength(16);

    tag.items.forEach(itemId => {
      const item = persisted.data.items[itemId];
      const expected = WORKSTATION_PROCESSING_FEES[item.name];
      expect(item.manualPrice).toBeUndefined();
      expect(item.processingFee).toEqual(expected);
      expect(expected.cap).toBeGreaterThanOrEqual(expected.fixedFee);
    });
  });
});
