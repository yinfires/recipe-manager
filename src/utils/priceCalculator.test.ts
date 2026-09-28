import { describe, expect, it } from 'vitest';
import { AppData, Item, Recipe, RecipeSlot } from '../types';
import { getEffectivePrice, recalculatePrices } from './priceCalculator';

function item(id: string, manualPrice?: number, tags: string[] = []): Item {
  return {
    id,
    name: id,
    itemId: `minecraft:${id}`,
    tags,
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
    recipes: Object.fromEntries(recipes.map(value => [value.id, value]))
  };
}

describe('priceCalculator', () => {
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
