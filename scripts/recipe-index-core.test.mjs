import { describe, expect, it } from 'vitest';
import { buildRecipeIndex } from './recipe-index-core.mjs';
import persistedJson from '../public/data/recipe-manager.json' with { type: 'json' };

function fixture() {
  const items = Object.fromEntries(['base', 'work', 'raw', 'meal', 'other'].map(id => [id, { id, name: id, itemId: `test:${id}`, tags: [] }]));
  const tags = {
    baseTag: { id: 'baseTag', name: '基础食材', items: ['base'], childTags: [], parentTags: [] },
    workTag: { id: 'workTag', name: '工作方块', items: ['work'], childTags: [], parentTags: [] },
    doneTag: { id: 'doneTag', name: '成品菜', items: ['meal'], childTags: [], parentTags: [] },
    any: { id: 'any', name: '任选', items: ['raw', 'base'], childTags: [], parentTags: [] }
  };
  const recipes = {
    r1: { id: 'r1', name: '加工', workstation: 'work', inputs: [{ type: 'item', ref: 'base', count: 1 }], attachments: [], outputs: [{ type: 'item', ref: 'raw', count: 1 }] },
    r2: { id: 'r2', name: '成菜', workstation: 'work', inputs: [{ type: 'tag', ref: 'any', count: 1 }, { type: 'item', ref: 'raw', count: 1 }], attachments: [], outputs: [{ type: 'item', ref: 'meal', count: 1 }] },
    cycle: { id: 'cycle', name: '循环', workstation: 'work', inputs: [{ type: 'item', ref: 'other', count: 1 }], attachments: [], outputs: [{ type: 'item', ref: 'other', count: 1 }] },
    missing: { id: 'missing', name: '缺失', workstation: 'work', inputs: [{ type: 'item', ref: 'absent', count: 1 }], attachments: [], outputs: [{ type: 'item', ref: 'other', count: 1 }] }
  };
  return { schemaVersion: 3, updatedAt: '2026-01-01T00:00:00Z', data: { items, tags, recipes } };
}

describe('recipe index craftability', () => {
  it('propagates direct inputs through recipes and satisfies tag inputs with any available member', () => {
    const result = buildRecipeIndex(fixture()).allUnlockedScenario;
    expect(result.craftableRecipeIds).toEqual(['r1', 'r2']);
    expect(result.craftableFinishedItems).toEqual(['meal']);
    expect(result.matches.r2[0].matched).toEqual(['raw', 'base']);
  });

  it('does not unlock cycles or missing references without a reachable input', () => {
    const persisted = fixture();
    persisted.data.tags.baseTag.items = [];
    const result = buildRecipeIndex(persisted).allUnlockedScenario;
    expect(result.craftableRecipeIds).toEqual([]);
    expect(result.availableItems).not.toContain('other');
  });

  it('treats attachments as reusable support items and indexes transitive base-food reachability', () => {
    const persisted = fixture();
    persisted.data.recipes.r2.attachments = [{ type: 'item', ref: 'missing-tool', count: 1 }];
    const index = buildRecipeIndex(persisted);
    expect(index.allUnlockedScenario.craftableFinishedItems).toEqual(['meal']);
    expect(index.finishedFoodIdsByBaseIngredient.base).toEqual(['meal']);
  });
});

describe('formal recipe index coverage', () => {
  it('covers formal ingredient, workstation, processing and finished-food references', () => {
    const index = buildRecipeIndex(persistedJson);
    const data = persistedJson.data;
    expect(index.counts.recipes).toBe(Object.keys(data.recipes).length);
    expect(index.workstations.map(item => item.id).sort()).toEqual(Object.values(data.tags).find(tag => tag.name === '工作方块').items.sort());
    expect(index.baseIngredients.map(item => item.id).sort()).toEqual(Object.values(data.tags).find(tag => tag.name === '基础食材').items.sort());
    expect(index.finishedFoods.map(item => item.id).sort()).toEqual(Object.values(data.tags).find(tag => tag.name === '成品菜').items.sort());
    expect(index.recipes.flatMap(recipe => [...recipe.inputs, ...recipe.attachments, ...recipe.outputs]).every(slot => slot.ref.id)).toBe(true);
    expect(index.allUnlockedScenario.craftableFinishedItems.length).toBeGreaterThan(0);
  });
});
