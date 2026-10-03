import { describe, expect, it } from 'vitest';
import { AppData } from '../types';
import { applyDataUpdate } from './AppContext';

function data(): AppData {
  return {
    items: {
      raw: { id: 'raw', name: '原料', itemId: 'test:raw', tags: [], manualPrice: 2 },
      output: { id: 'output', name: '产物', itemId: 'test:output', tags: [] }
    },
    tags: {},
    recipes: {
      result: {
        id: 'result', name: '产物', workstation: '',
        inputs: [{ type: 'item', ref: 'raw', count: 2 }], attachments: [],
        outputs: [{ type: 'item', ref: 'output', count: 1 }]
      }
    },
    unlockPlan: { stages: [{ id: 's1', name: '阶段1' }], itemStages: {} }
  };
}

describe('applyDataUpdate', () => {
  it('does not recalculate or clone prices when only the unlock plan changes', () => {
    const previous = data();
    const next = { ...previous, unlockPlan: { ...previous.unlockPlan, itemStages: { raw: 's1' } } };

    expect(applyDataUpdate(previous, next)).toBe(next);
    expect(applyDataUpdate(previous, next).items).toBe(previous.items);
  });

  it('recalculates prices when price-affecting item data changes', () => {
    const previous = data();
    const next = { ...previous, items: { ...previous.items, raw: { ...previous.items.raw, manualPrice: 3 } } };
    const result = applyDataUpdate(previous, next);

    expect(result).not.toBe(next);
    expect(result.items.output.autoPrice).toBe(6);
  });
});
