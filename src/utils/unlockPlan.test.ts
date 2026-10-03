import { describe, expect, it } from 'vitest';
import { AppData, Recipe, RecipeSlot } from '../types';
import { analyzeUnlockStage, assignUnlockItems, deleteUnlockStage, normalizeUnlockPlan } from './unlockPlan';

const item = (id: string) => ({ id, name: id, itemId: `test:${id}`, tags: [] });
const slot = (ref: string, type: 'item' | 'tag' = 'item'): RecipeSlot => ({ type, ref, count: 1 });
const recipe = (id: string, inputs: RecipeSlot[], output: string, attachments: RecipeSlot[] = [], workstation = 'pot'): Recipe => ({
  id, name: id, workstation, inputs, attachments, outputs: [slot(output)]
});

function data(overrides: Partial<AppData> = {}): AppData {
  const ids = ['raw', 'alternate', 'middle', 'dish', 'bowl', 'pot', 'other-pot'];
  return {
    items: Object.fromEntries(ids.map(id => [id, item(id)])),
    tags: { choice: { id: 'choice', name: '任选', items: ['raw', 'alternate'], childTags: [], parentTags: [] } },
    recipes: {
      middle: recipe('middle', [slot('choice', 'tag')], 'middle'),
      dish: recipe('dish', [slot('middle')], 'dish', [slot('bowl')])
    },
    unlockPlan: {
      stages: [{ id: 's1', name: '阶段1' }, { id: 's2', name: '阶段2' }, { id: 's3', name: '阶段3' }],
      itemStages: { raw: 's1', pot: 's1' }
    },
    ...overrides
  };
}

describe('unlock plan', () => {
  it('normalizes legacy data, drops recipe stages and invalid item stage references', () => {
    expect(normalizeUnlockPlan(undefined, new Set()).stages[0].name).toBe('阶段1');
    const result = normalizeUnlockPlan({
      stages: [{ id: 's', name: '' }],
      itemStages: { valid: 's', missingItem: 's', badStage: 'missing' },
      recipeStages: { oldRecipe: 's' }
    }, new Set(['valid', 'badStage']));

    expect(result).toEqual({ stages: [{ id: 's', name: '阶段1' }], itemStages: { valid: 's' } });
    expect(result).not.toHaveProperty('recipeStages');
  });

  it('uses cumulative items and exposes only one direct crafting step', () => {
    const first = analyzeUnlockStage(data(), 's1');
    expect(first.candidates.map(value => value.itemId)).toEqual(['middle']);
    expect(first.candidates.map(value => value.itemId)).not.toContain('dish');

    const base = data();
    const withMiddle = data({
      unlockPlan: { stages: base.unlockPlan.stages, itemStages: { raw: 's1', pot: 's1', middle: 's2', bowl: 's2' } }
    });
    expect(analyzeUnlockStage(withMiddle, 's1').candidates.map(value => value.itemId)).toEqual(['middle']);
    expect(analyzeUnlockStage(withMiddle, 's2').candidates.map(value => value.itemId)).toEqual(['dish']);
  });

  it('requires workstation, every input and every attachment', () => {
    const base = data();
    expect(analyzeUnlockStage({ ...base, unlockPlan: { ...base.unlockPlan, itemStages: { raw: 's1' } } }, 's1').candidates).toEqual([]);

    const missingAttachment = data({
      unlockPlan: { stages: base.unlockPlan.stages, itemStages: { raw: 's1', pot: 's1', middle: 's1' } }
    });
    expect(analyzeUnlockStage(missingAttachment, 's1').candidates.map(value => value.itemId)).not.toContain('dish');

    const complete = data({
      unlockPlan: { stages: base.unlockPlan.stages, itemStages: { raw: 's1', pot: 's1', middle: 's1', bowl: 's1' } }
    });
    expect(analyzeUnlockStage(complete, 's1').candidates.map(value => value.itemId)).toContain('dish');
  });

  it('accepts any unlocked tag member and merges recipes producing the same item', () => {
    const base = data();
    const current = data({
      recipes: {
        first: recipe('first', [slot('choice', 'tag')], 'middle'),
        second: recipe('second', [slot('alternate')], 'middle')
      },
      unlockPlan: { stages: base.unlockPlan.stages, itemStages: { alternate: 's1', pot: 's1' } }
    });
    const candidates = analyzeUnlockStage(current, 's1').candidates;
    expect(candidates).toHaveLength(1);
    expect(candidates[0].itemId).toBe('middle');
    expect(candidates[0].recipes.map(value => value.id)).toEqual(['first', 'second']);
  });

  it('excludes current and earlier outputs but keeps later-stage outputs marked', () => {
    const base = data();
    const later = data({ unlockPlan: { stages: base.unlockPlan.stages, itemStages: { raw: 's1', pot: 's1', middle: 's3' } } });
    expect(analyzeUnlockStage(later, 's1').candidates[0]).toMatchObject({ itemId: 'middle', assignedStageId: 's3' });

    const current = data({ unlockPlan: { stages: base.unlockPlan.stages, itemStages: { raw: 's1', pot: 's1', middle: 's1' } } });
    expect(analyzeUnlockStage(current, 's1').candidates.map(value => value.itemId)).not.toContain('middle');
  });

  it('does not recurse through cycles', () => {
    const base = data();
    const cyclic = data({
      recipes: { a: recipe('a', [slot('dish')], 'middle'), b: recipe('b', [slot('middle')], 'dish') },
      unlockPlan: { stages: base.unlockPlan.stages, itemStages: { pot: 's1' } }
    });
    expect(analyzeUnlockStage(cyclic, 's1').candidates).toEqual([]);
  });

  it('moves selected items and returns deleted-stage items to unassigned', () => {
    const source = data().unlockPlan;
    const moved = assignUnlockItems(source, ['raw'], 's2');
    expect(moved.itemStages.raw).toBe('s2');
    expect(assignUnlockItems(moved, ['raw']).itemStages.raw).toBeUndefined();

    const deleted = deleteUnlockStage({ ...moved, itemStages: { ...moved.itemStages, bowl: 's2' } }, 's2');
    expect(deleted.stages.map(stage => stage.id)).toEqual(['s1', 's3']);
    expect(deleted.itemStages.raw).toBeUndefined();
    expect(deleted.itemStages.bowl).toBeUndefined();
  });
});
