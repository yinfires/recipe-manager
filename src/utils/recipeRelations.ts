import { AppData, Recipe, RecipeSlot, ViewMode } from '../types';
import { EntityTarget } from './entityTarget';

function getAllParentTags(data: AppData, tagIds: string[]): Set<string> {
  const result = new Set(tagIds);
  const pending = [...tagIds];

  while (pending.length > 0) {
    const tag = data.tags[pending.pop()!];
    tag?.parentTags.forEach(parentId => {
      if (!result.has(parentId)) {
        result.add(parentId);
        pending.push(parentId);
      }
    });
  }

  return result;
}

function slotMatchesTarget(data: AppData, slot: RecipeSlot, target: EntityTarget): boolean {
  if (target.type === 'tag') {
    return slot.type === 'tag' && slot.ref === target.id;
  }

  if (target.type !== 'item') return false;
  if (slot.type === 'item') return slot.ref === target.id;

  const item = data.items[target.id];
  return !!item && getAllParentTags(data, item.tags).has(slot.ref);
}

export function findRecipesForTarget(
  data: AppData,
  target: EntityTarget,
  mode: ViewMode,
  includeAttachments = true
): Recipe[] {
  if (target.type === 'recipe') return [];

  return Object.values(data.recipes).filter(recipe => {
    const slots = mode === 'source'
      ? recipe.outputs
      : (includeAttachments ? [...recipe.inputs, ...recipe.attachments] : recipe.inputs);
    return slots.some(slot => slotMatchesTarget(data, slot, target));
  });
}
