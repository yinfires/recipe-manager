import { readFile } from 'node:fs/promises';
import { buildRecipeIndex } from './recipe-index-core.mjs';

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
function ids(value, fallback) { return value === undefined ? fallback : value.split(',').filter(Boolean); }
const persisted = JSON.parse(await readFile('public/data/recipe-manager.json', 'utf8'));
const data = persisted.data;
const index = buildRecipeIndex(persisted);
const baseTag = Object.values(data.tags).find(tag => tag.name === '基础食材');
const workTag = Object.values(data.tags).find(tag => tag.name === '工作方块');
const scenario = index.allUnlockedScenario;
const unlockedWorkstations = ids(option('--workstations'), workTag?.items || []);
const availableBaseIngredients = ids(option('--ingredients'), baseTag?.items || []);
scenario.unlockedWorkstations = unlockedWorkstations;
scenario.availableBaseIngredients = availableBaseIngredients;
scenario.availableItems = [...availableBaseIngredients];
scenario.craftableRecipeIds = [];
scenario.craftableFinishedItems = [];
scenario.matches = {};
const unlocked = new Set(unlockedWorkstations);
const available = new Set(availableBaseIngredients);
const recipes = Object.values(data.recipes);
let changed = true;
while (changed) {
  changed = false;
  for (const recipe of recipes) {
    if (!unlocked.has(recipe.workstation) || scenario.craftableRecipeIds.includes(recipe.id)) continue;
    const slots = recipe.inputs;
    const matches = slots.map(slot => {
      const candidates = slot.type === 'item' ? [slot.ref] : (data.tags[slot.ref]?.items || []);
      return { type: slot.type, ref: slot.ref, matched: candidates.filter(id => available.has(id)) };
    });
    if (!matches.every(match => match.matched.length)) continue;
    scenario.craftableRecipeIds.push(recipe.id);
    scenario.matches[recipe.id] = matches;
    recipe.outputs.filter(slot => slot.type === 'item').forEach(slot => {
      if (!available.has(slot.ref)) { available.add(slot.ref); changed = true; }
    });
  }
}
const finishedTag = Object.values(data.tags).find(tag => tag.name === '成品菜');
scenario.availableItems = [...available].sort();
scenario.craftableRecipeIds.sort();
scenario.craftableFinishedItems = [...available].filter(id => finishedTag?.items.includes(id)).sort();
console.log(JSON.stringify(scenario, null, 2));
