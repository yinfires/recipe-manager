export function buildRecipeIndex(persisted) {
  const data = persisted.data;
  const itemInfo = id => data.items[id] ? { id, name: data.items[id].name, itemId: data.items[id].itemId } : { id, name: id };
  const tagInfo = id => data.tags[id] ? { id, name: data.tags[id].name } : { id, name: id };
  const finishedTag = Object.values(data.tags).find(tag => tag.name === '成品菜');
  const baseTag = Object.values(data.tags).find(tag => tag.name === '基础食材');
  const workstationTag = Object.values(data.tags).find(tag => tag.name === '工作方块');
  const finished = new Set(finishedTag?.items || []);
  const base = new Set(baseTag?.items || []);
  const workstations = new Set(workstationTag?.items || []);
  const recipes = Object.values(data.recipes);
  const outputItems = recipe => recipe.outputs.filter(slot => slot.type === 'item').map(slot => slot.ref);
  const slotRefs = slot => slot.type === 'item' ? [slot.ref] : (data.tags[slot.ref]?.items || []);
  const recipeRecord = recipe => ({
    id: recipe.id,
    name: recipe.name,
    workstation: itemInfo(recipe.workstation),
    inputs: recipe.inputs.map(slot => slot.type === 'item'
      ? { type: 'item', ref: itemInfo(slot.ref), count: slot.count }
      : { type: 'tag', ref: tagInfo(slot.ref), count: slot.count, candidates: (data.tags[slot.ref]?.items || []).map(itemInfo) }),
    attachments: recipe.attachments.map(slot => slot.type === 'item'
      ? { type: 'item', ref: itemInfo(slot.ref), count: slot.count }
      : { type: 'tag', ref: tagInfo(slot.ref), count: slot.count, candidates: (data.tags[slot.ref]?.items || []).map(itemInfo) }),
    outputs: recipe.outputs.map(slot => slot.type === 'item'
      ? { type: 'item', ref: itemInfo(slot.ref), count: slot.count }
      : { type: 'tag', ref: tagInfo(slot.ref), count: slot.count })
  });
  const byWorkstation = {};
  recipes.forEach(recipe => { (byWorkstation[recipe.workstation] ||= []).push(recipe.id); });
  const byBaseIngredient = {};
  recipes.forEach(recipe => recipe.inputs.forEach(slot => {
    slotRefs(slot).filter(id => base.has(id)).forEach(id => { (byBaseIngredient[id] ||= []).push(recipe.id); });
  }));
  Object.values(byWorkstation).forEach(ids => ids.sort());
  Object.values(byBaseIngredient).forEach(ids => ids.sort());

  const producerByItem = new Map();
  recipes.forEach(recipe => outputItems(recipe).forEach(id => {
    const producers = producerByItem.get(id) || [];
    producers.push(recipe.id);
    producerByItem.set(id, producers);
  }));
  const dependencyLinks = Object.fromEntries(recipes.map(recipe => {
    const consumed = recipe.inputs.flatMap(slot => slotRefs(slot));
    const predecessors = [...new Set(consumed.flatMap(id => producerByItem.get(id) || []).filter(id => id !== recipe.id))].sort();
    return [recipe.id, { predecessorRecipeIds: predecessors, successorRecipeIds: [] }];
  }));
  Object.entries(dependencyLinks).forEach(([recipeId, links]) => links.predecessorRecipeIds.forEach(id => dependencyLinks[id]?.successorRecipeIds.push(recipeId)));
  Object.values(dependencyLinks).forEach(links => links.successorRecipeIds.sort());

  const downstreamRecipesByBase = {};
  const downstreamFoodsByBase = {};
  base.forEach(baseId => {
    const seenItems = new Set([baseId]);
    const seenRecipes = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      recipes.forEach(recipe => {
        if (seenRecipes.has(recipe.id) || !recipe.inputs.some(slot => slotRefs(slot).some(id => seenItems.has(id)))) return;
        seenRecipes.add(recipe.id); changed = true;
        outputItems(recipe).forEach(id => seenItems.add(id));
      });
    }
    downstreamRecipesByBase[baseId] = [...seenRecipes].sort();
    downstreamFoodsByBase[baseId] = [...seenItems].filter(id => finished.has(id)).sort();
  });

  function craftability(unlockedWorkstations = [...workstations], availableItems = [...base]) {
    const unlocked = new Set(unlockedWorkstations);
    const available = new Set(availableItems);
    const matched = new Map();
    const craftedBy = new Map();
    let changed = true;
    while (changed) {
      changed = false;
      recipes.forEach(recipe => {
        if (!unlocked.has(recipe.workstation) || craftedBy.has(recipe.id)) return;
        const slots = recipe.inputs;
        const matches = slots.map(slot => {
          const candidates = slotRefs(slot).filter(id => available.has(id));
          return { slot, candidates };
        });
        if (matches.every(match => match.candidates.length > 0)) {
          craftedBy.set(recipe.id, recipe);
          matched.set(recipe.id, matches.map(match => ({ type: match.slot.type, ref: match.slot.ref, matched: match.candidates })));
          outputItems(recipe).forEach(id => { if (!available.has(id)) { available.add(id); changed = true; } });
        }
      });
    }
    const output = [...available].filter(id => finished.has(id));
    return {
      availableItems: [...available].sort(),
      craftableRecipeIds: [...craftedBy.keys()].sort(),
      craftableFinishedItems: output.sort(),
      matches: Object.fromEntries([...matched.entries()].map(([id, value]) => [id, value]))
    };
  }

  const allCraftable = craftability();
  return {
    indexVersion: 3,
    generatedFrom: { schemaVersion: persisted.schemaVersion, updatedAt: persisted.updatedAt },
    counts: { items: Object.keys(data.items).length, tags: Object.keys(data.tags).length, recipes: recipes.length, finishedFoods: finished.size, baseIngredients: base.size, workstations: workstations.size },
    workstations: [...workstations].sort().map(itemInfo),
    baseIngredients: [...base].sort().map(itemInfo),
    finishedFoods: [...finished].sort().map(itemInfo),
    recipes: recipes.map(recipe => ({ ...recipeRecord(recipe), ...dependencyLinks[recipe.id] })).sort((a, b) => a.id.localeCompare(b.id)),
    recipeIdsByWorkstation: Object.fromEntries(Object.entries(byWorkstation).sort()),
    recipeIdsByBaseIngredient: Object.fromEntries(Object.entries(byBaseIngredient).sort()),
    downstreamRecipeIdsByBaseIngredient: Object.fromEntries(Object.entries(downstreamRecipesByBase).sort()),
    finishedFoodIdsByBaseIngredient: Object.fromEntries(Object.entries(downstreamFoodsByBase).sort()),
    unlockPlan: data.unlockPlan || { stages: [{ id: 'unlock_stage_1', name: '阶段1' }], itemStages: {} },
    allUnlockedScenario: { unlockedWorkstations: [...workstations].sort(), availableBaseIngredients: [...base].sort(), ...allCraftable }
  };
}

export function validateRecipeIndex(index) {
  const errors = [];
  const ids = new Set(index.recipes.map(recipe => recipe.id));
  index.recipes.forEach(recipe => [...recipe.predecessorRecipeIds, ...recipe.successorRecipeIds].forEach(id => { if (!ids.has(id)) errors.push(`配方链引用不存在配方 ${recipe.id}/${id}`); }));
  Object.entries(index.recipeIdsByWorkstation).forEach(([key, values]) => values.forEach(id => { if (!ids.has(id)) errors.push(`工作方块索引引用不存在配方 ${key}/${id}`); }));
  Object.entries(index.recipeIdsByBaseIngredient).forEach(([key, values]) => values.forEach(id => { if (!ids.has(id)) errors.push(`基础食材索引引用不存在配方 ${key}/${id}`); }));
  if (index.allUnlockedScenario.craftableFinishedItems.length > index.finishedFoods.length) errors.push('可制作成品数量超过成品菜总数');
  if (errors.length) throw new Error(errors.join('\n'));
}
