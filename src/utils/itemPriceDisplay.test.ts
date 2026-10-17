import { describe, expect, it } from 'vitest';
import { ITEM_PRICE_DISPLAY_STORAGE_KEY, loadItemPriceDisplaySettings, saveItemPriceDisplaySettings } from './itemPriceDisplay';

describe('item price display preferences', () => {
  it('defaults to hidden and restores independent switches', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(loadItemPriceDisplaySettings(storage)).toEqual({ showPrices: false, showProfit: false });
    for (const settings of [{ showPrices: true, showProfit: false }, { showPrices: false, showProfit: true }, { showPrices: true, showProfit: true }]) {
      saveItemPriceDisplaySettings(settings, storage);
      expect(loadItemPriceDisplaySettings(storage)).toEqual(settings);
    }
    values.set(ITEM_PRICE_DISPLAY_STORAGE_KEY, '{invalid');
    expect(loadItemPriceDisplaySettings(storage)).toEqual({ showPrices: false, showProfit: false });
    values.set(ITEM_PRICE_DISPLAY_STORAGE_KEY, JSON.stringify({ showPrices: 'true', showProfit: 1 }));
    expect(loadItemPriceDisplaySettings(storage)).toEqual({ showPrices: false, showProfit: false });
  });

  it('tolerates disabled storage', () => {
    const storage = { getItem: () => { throw new Error('disabled'); }, setItem: () => { throw new Error('disabled'); } };
    expect(loadItemPriceDisplaySettings(storage)).toEqual({ showPrices: false, showProfit: false });
    expect(() => saveItemPriceDisplaySettings({ showPrices: true, showProfit: true }, storage)).not.toThrow();
  });
});
