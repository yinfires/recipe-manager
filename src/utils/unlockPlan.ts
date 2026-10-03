import { AppData, Recipe, RecipeSlot, UnlockPlan } from '../types';

export type UnlockItemCategory = 'workstation' | 'base' | 'processed' | 'finished' | 'related';
export interface SingleStepCandidate { itemId: string; recipes: Recipe[]; assignedStageId?: string; }
export interface StageUnlockAnalysis {
  stageId: string; stageIndex: number; currentItemIds: Set<string>;
  cumulativeItemIds: Set<string>; candidates: SingleStepCandidate[];
}

export function createEmptyUnlockPlan(): UnlockPlan {
  return { stages: [{ id: 'unlock_stage_1', name: '阶段1' }], itemStages: {} };
}

export function normalizeUnlockPlan(value: unknown, itemIds: Set<string>): UnlockPlan {
  const candidate = value as Partial<UnlockPlan> | null;
  const seen = new Set<string>();
  const stages = (Array.isArray(candidate?.stages) ? candidate!.stages! : [])
    .filter(stage => stage && typeof stage.id === 'string' && stage.id && !seen.has(stage.id) && seen.add(stage.id))
    .map((stage, index) => ({ id: stage.id, name: typeof stage.name === 'string' && stage.name.trim() ? stage.name.trim() : `阶段${index + 1}` }));
  if (!stages.length) stages.push(createEmptyUnlockPlan().stages[0]);
  const validStages = new Set(stages.map(stage => stage.id));
  const itemStages = Object.fromEntries(Object.entries(candidate?.itemStages || {})
    .filter(([id, stageId]) => itemIds.has(id) && typeof stageId === 'string' && validStages.has(stageId))) as Record<string, string>;
  return { stages, itemStages };
}

function slotSatisfied(data: AppData, slot: RecipeSlot, available: Set<string>): boolean {
  return slot.type === 'item' ? available.has(slot.ref) : (data.tags[slot.ref]?.items || []).some(id => available.has(id));
}
function stageIndex(plan: UnlockPlan, stageId?: string): number { return stageId ? plan.stages.findIndex(stage => stage.id === stageId) : -1; }

export function getPlanningItemIds(data: AppData): Set<string> {
  const ids = new Set<string>();
  Object.values(data.recipes).forEach(recipe => {
    ids.add(recipe.workstation);
    [...recipe.inputs, ...recipe.attachments, ...recipe.outputs].forEach(slot => {
      if (slot.type === 'item') ids.add(slot.ref); else data.tags[slot.ref]?.items.forEach(id => ids.add(id));
    });
  });
  return new Set([...ids].filter(id => !!data.items[id]));
}

export function getItemCategory(data: AppData, itemId: string): UnlockItemCategory {
  const names = new Set(data.items[itemId]?.tags.map(id => data.tags[id]?.name));
  if (names.has('工作方块')) return 'workstation';
  if (names.has('基础食材')) return 'base';
  if (names.has('加工品')) return 'processed';
  if (names.has('成品菜')) return 'finished';
  return 'related';
}

export function analyzeUnlockStage(data: AppData, selectedStageId: string): StageUnlockAnalysis {
  const plan = data.unlockPlan;
  const selectedIndex = Math.max(0, plan.stages.findIndex(stage => stage.id === selectedStageId));
  const stageId = plan.stages[selectedIndex].id;
  const currentItemIds = new Set(Object.entries(plan.itemStages).filter(([, id]) => id === stageId).map(([id]) => id));
  const cumulativeItemIds = new Set(Object.entries(plan.itemStages).filter(([, id]) => {
    const index = stageIndex(plan, id); return index >= 0 && index <= selectedIndex;
  }).map(([id]) => id));
  const byOutput = new Map<string, Recipe[]>();
  Object.values(data.recipes).forEach(recipe => {
    if (!cumulativeItemIds.has(recipe.workstation)) return;
    if (![...recipe.inputs, ...recipe.attachments].every(slot => slotSatisfied(data, slot, cumulativeItemIds))) return;
    recipe.outputs.filter(slot => slot.type === 'item' && data.items[slot.ref] && !cumulativeItemIds.has(slot.ref)).forEach(slot => {
      byOutput.set(slot.ref, [...(byOutput.get(slot.ref) || []), recipe]);
    });
  });
  const candidates = [...byOutput.entries()].map(([itemId, recipes]) => ({ itemId, recipes, assignedStageId: plan.itemStages[itemId] }))
    .sort((a, b) => data.items[a.itemId].name.localeCompare(data.items[b.itemId].name, 'zh-CN'));
  return { stageId, stageIndex: selectedIndex, currentItemIds, cumulativeItemIds, candidates };
}

export function assignUnlockItems(plan: UnlockPlan, ids: string[], stageId?: string): UnlockPlan {
  const itemStages = { ...plan.itemStages };
  ids.forEach(id => { if (stageId) itemStages[id] = stageId; else delete itemStages[id]; });
  return { ...plan, itemStages };
}

export function deleteUnlockStage(plan: UnlockPlan, stageId: string): UnlockPlan {
  if (plan.stages.length <= 1) return plan;
  return { stages: plan.stages.filter(stage => stage.id !== stageId), itemStages: Object.fromEntries(Object.entries(plan.itemStages).filter(([, id]) => id !== stageId)) };
}
