import { describe, expect, it } from 'vitest';
import { AppData, Item, Recipe, RecipeSlot } from '../types';
import { calculatePlainPrices, getEffectivePrice, getItemProfit, recalculatePrices } from './priceCalculator';

function item(id: string, manualPrice?: number, tags: string[] = []): Item {
  return {
    id,
    name: id,
    itemId: `minecraft:${id}`,
    tags,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...(manualPrice === undefined ? {} : { manualPrice })
  };
}

function slot(ref: string, count = 1, type: 'item' | 'tag' = 'item'): RecipeSlot {
  return { type, ref, count };
}

function recipe(id: string, inputs: RecipeSlot[], outputs: RecipeSlot[], attachments: RecipeSlot[] = []): Recipe {
  return { id, name: id, workstation: '', inputs, attachments, outputs };
}

function data(items: Item[], recipes: Recipe[], tags: AppData['tags'] = {}): AppData {
  return {
    items: Object.fromEntries(items.map(value => [value.id, value])),
    tags,
    recipes: Object.fromEntries(recipes.map(value => [value.id, value])),
    unlockPlan: { stages: [{ id: 's1', name: '阶段1' }], itemStages: {} }
  };
}

describe('priceCalculator', () => {
  it('excludes fees throughout the chain and never propagates manual selling prices', () => {
    const values = [item('raw', 10), item('middle', 30), item('final'), item('machine', undefined, ['workstation'])];
    values[3].processingFee = { fixedFee: 2, rate: 0.1, cap: 3 };
    const first = recipe('first', [slot('raw')], [slot('middle')]);
    first.workstation = 'machine';
    const last = recipe('last', [slot('middle', 2)], [slot('final', 2)]);
    last.workstation = 'machine';
    last.processingFeeOverride = { fixedFee: 50, rate: 1, capMode: 'value', cap: 4 };
    const source = data(values, [first, last], {
      workstation: { id: 'workstation', name: '工作方块', items: ['machine'], childTags: [], parentTags: [] }
    });
    const actual = recalculatePrices(source);
    const plain = calculatePlainPrices(actual);
    expect(actual.items.middle.autoPrice).toBe(13);
    expect(actual.items.final.autoPrice).toBe(32);
    expect(plain.middle).toBe(10);
    expect(plain.final).toBe(10);
    expect(getItemProfit(actual.items.middle, plain)).toBe(20);
    expect(getItemProfit(actual.items.final, plain)).toBe(22);
    expect(source.items.final.autoPrice).toBeUndefined();
    expect(actual.items.middle.manualPrice).toBe(30);
    const changed = recalculatePrices({ ...actual, items: { ...actual.items, raw: { ...actual.items.raw, manualPrice: 20 } } });
    expect(calculatePlainPrices(changed).final).toBe(20);
  });

  it('uses plain tag prices and attachments and splits outputs without deducting manual prices', () => {
    const source = data([item('raw', 8), item('high', 20), item('middle', 100), item('attachment', 2), item('a', 40), item('b')], [
      recipe('middle', [slot('raw')], [slot('middle')]),
      recipe('split', [slot('choice', 2, 'tag')], [slot('a', 2), slot('b')], [slot('attachment', 2)])
    ], { choice: { id: 'choice', name: 'choice', items: ['middle', 'high'], childTags: [], parentTags: [] } });
    const plain = calculatePlainPrices(source);
    expect(plain.a).toBe(5);
    expect(plain.b).toBe(10);
  });

  it('keeps unknown produced prices unknown while supporting zero anchors and negative profits', () => {
    const source = data([item('unknown'), item('unpriced'), item('produced', 10), item('zero', 0), item('raw', 5), item('loss', 2)], [
      recipe('unknown', [slot('unknown')], [slot('produced')]),
      recipe('loss', [slot('raw')], [slot('loss')])
    ]);
    const actual = recalculatePrices(source);
    const plain = calculatePlainPrices(actual);
    expect(plain.produced).toBeUndefined();
    expect(getItemProfit(actual.items.produced, plain)).toBeUndefined();
    expect(getItemProfit(actual.items.unpriced, plain)).toBeUndefined();
    expect(plain.zero).toBe(0);
    expect(getItemProfit(actual.items.zero, plain)).toBe(0);
    expect(getItemProfit(actual.items.loss, plain)).toBe(-3);
    expect(getItemProfit(item('fraction', 0.3), { fraction: 0.2 })).toBe(0.1);
  });

  it('chooses the cheapest plain recipe and leaves unseeded cycles unknown', () => {
    const plain = calculatePlainPrices(data([item('cheap', 4), item('expensive', 9), item('result'), item('a', 100), item('b')], [
      recipe('cheap', [slot('cheap')], [slot('result')]),
      recipe('expensive', [slot('expensive')], [slot('result')]),
      recipe('cycle-a', [slot('a')], [slot('b')]),
      recipe('cycle-b', [slot('b')], [slot('a')])
    ]));
    expect(plain.result).toBe(4);
    expect(plain.a).toBeUndefined();
    expect(plain.b).toBeUndefined();
  });

  it('reverse derives a single input using independently derived plain outputs', () => {
    const source = data([item('raw', 20), item('input'), item('a', 100), item('b', 100), item('attachment', 2)], [
      recipe('seed-a', [slot('raw')], [slot('a')]),
      recipe('seed-b', [slot('raw')], [slot('b')]),
      recipe('reverse', [slot('input', 2)], [slot('a'), slot('b')])
    ]);
    // 两个输出由独立配方获得素价，反推不使用其手动售价。
    const plain = calculatePlainPrices(source);
    expect(plain.input).toBe(20);
    expect(plain.a).toBe(20);
    expect(plain.b).toBe(20);
  });

  it('uses actual quantities and ignores materials without prices', () => {
    const result = recalculatePrices(data(
      [item('known', 2), item('unknown'), item('result')],
      [recipe('r', [slot('known', 3), slot('unknown', 9)], [slot('result', 2)])]
    ));

    expect(result.items.result.autoPrice).toBe(3);
  });

  it('includes attachments and uses the lowest valid tag member price', () => {
    const tags = {
      choice: { id: 'choice', name: 'choice', items: ['high', 'low'], childTags: [], parentTags: [] }
    };
    const result = recalculatePrices(data(
      [item('high', 5), item('low', 2), item('attachment', 1), item('result')],
      [recipe('r', [slot('choice', 2, 'tag')], [slot('result')], [slot('attachment', 3)])],
      tags
    ));

    expect(result.items.result.autoPrice).toBe(7);
  });

  it('splits multiple outputs by item kind and then quantity', () => {
    const result = recalculatePrices(data(
      [item('material', 30), item('a'), item('b')],
      [recipe('r', [slot('material')], [slot('a', 2), slot('b')])]
    ));

    expect(result.items.a.autoPrice).toBe(7.5);
    expect(result.items.b.autoPrice).toBe(15);
  });

  it('deducts manual output value while retaining the manual item base auto price', () => {
    const result = recalculatePrices(data(
      [item('material', 30), item('a', 8), item('b')],
      [recipe('r', [slot('material')], [slot('a', 2), slot('b')])]
    ));

    expect(result.items.a.autoPrice).toBe(7.5);
    expect(result.items.b.autoPrice).toBe(14);
    expect(getEffectivePrice(result.items.a)).toBe(8);
  });

  it('uses zero for unpriced outputs when manual outputs exceed the input total', () => {
    const result = recalculatePrices(data(
      [item('material', 10), item('a', 20), item('b')],
      [recipe('r', [slot('material')], [slot('a'), slot('b')])]
    ));

    expect(result.items.b.autoPrice).toBe(0);
  });

  it('chooses the lowest candidate from multiple recipes', () => {
    const result = recalculatePrices(data(
      [item('cheap', 4), item('expensive', 9), item('result')],
      [
        recipe('cheap-recipe', [slot('cheap')], [slot('result')]),
        recipe('expensive-recipe', [slot('expensive')], [slot('result')])
      ]
    ));

    expect(result.items.result.autoPrice).toBe(4);
  });

  it('propagates price changes through multiple downstream recipes', () => {
    const base = data(
      [item('raw', 2), item('middle'), item('final')],
      [
        recipe('middle-recipe', [slot('raw', 2)], [slot('middle')]),
        recipe('final-recipe', [slot('middle', 3)], [slot('final')])
      ]
    );
    const first = recalculatePrices(base);
    expect(first.items.middle.autoPrice).toBe(4);
    expect(first.items.final.autoPrice).toBe(12);

    const changed = recalculatePrices({
      ...first,
      items: { ...first.items, raw: { ...first.items.raw, manualPrice: 3 } }
    });
    expect(changed.items.middle.autoPrice).toBe(6);
    expect(changed.items.final.autoPrice).toBe(18);
  });

  it('calculates a single input price from multiple priced outputs', () => {
    const result = recalculatePrices(data(
      [item('input'), item('a', 4), item('b', 3)],
      [recipe('r', [slot('input', 2)], [slot('a', 2), slot('b')])]
    ));

    expect(result.items.input.autoPrice).toBe(5.5);
  });

  it('does not assign tag output prices to tag members', () => {
    const tags = {
      outputTag: { id: 'outputTag', name: 'outputTag', items: ['member'], childTags: [], parentTags: [] }
    };
    const result = recalculatePrices(data(
      [item('material', 10), item('member')],
      [recipe('r', [slot('material')], [slot('outputTag', 1, 'tag')])],
      tags
    ));

    expect(result.items.member.autoPrice).toBeUndefined();
  });

  it('leaves an unseeded cycle without prices and terminates', () => {
    const result = recalculatePrices(data(
      [item('a'), item('b')],
      [
        recipe('a-to-b', [slot('a')], [slot('b')]),
        recipe('b-to-a', [slot('b')], [slot('a')])
      ]
    ));

    expect(result.items.a.autoPrice).toBeUndefined();
    expect(result.items.b.autoPrice).toBeUndefined();
  });

  it('adds workstation fixed and percentage fees to the batch total', () => {
    const items = [item('material', 20), item('furnace', undefined, ['workstation']), item('result')];
    items[1].processingFee = { fixedFee: 1, rate: 0.05, cap: 3 };
    const tags = {
      workstation: { id: 'workstation', name: '工作方块', items: ['furnace'], childTags: [], parentTags: [] }
    };
    const pricedRecipe = recipe('r', [slot('material')], [slot('result', 4)]);
    pricedRecipe.workstation = 'furnace';
    const result = recalculatePrices(data(items, [pricedRecipe], tags));

    expect(result.items.result.autoPrice).toBe(5.5);
  });

  it('caps the total processing fee and supports recipe overrides', () => {
    const items = [item('material', 100), item('machine', undefined, ['workstation']), item('result')];
    items[1].processingFee = { fixedFee: 2, rate: 0.1, cap: 20 };
    const tags = {
      workstation: { id: 'workstation', name: '工作方块', items: ['machine'], childTags: [], parentTags: [] }
    };
    const pricedRecipe = recipe('r', [slot('material')], [slot('result')]);
    pricedRecipe.workstation = 'machine';
    pricedRecipe.processingFeeOverride = { fixedFee: 1, rate: 0.2, capMode: 'value', cap: 5 };
    const result = recalculatePrices(data(items, [pricedRecipe], tags));

    expect(result.items.result.autoPrice).toBe(105);
  });

  it('does not charge processing fees for an item outside the workstation tag', () => {
    const items = [item('material', 10), item('machine'), item('result')];
    items[1].processingFee = { fixedFee: 10, rate: 1 };
    const pricedRecipe = recipe('r', [slot('material')], [slot('result')]);
    pricedRecipe.workstation = 'machine';
    const result = recalculatePrices(data(items, [pricedRecipe]));

    expect(result.items.result.autoPrice).toBe(10);
  });

  it('reverses capped processing fees before pricing the single input', () => {
    const items = [item('input'), item('machine', undefined, ['workstation']), item('a', 60), item('b', 45)];
    items[1].processingFee = { fixedFee: 2, rate: 0.1, cap: 5 };
    const tags = {
      workstation: { id: 'workstation', name: '工作方块', items: ['machine'], childTags: [], parentTags: [] }
    };
    const pricedRecipe = recipe('r', [slot('input', 2)], [slot('a'), slot('b')]);
    pricedRecipe.workstation = 'machine';
    const result = recalculatePrices(data(items, [pricedRecipe], tags));

    expect(result.items.input.autoPrice).toBe(50);
  });
});
