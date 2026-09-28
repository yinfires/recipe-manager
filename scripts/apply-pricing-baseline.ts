import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE_INGREDIENT_PRICES, WORKSTATION_PROCESSING_FEES } from '../src/data/pricingBaseline';
import { PersistedData, Tag } from '../src/types';
import { recalculatePrices } from '../src/utils/priceCalculator';

const dataPath = path.resolve('public/data/recipe-manager.json');
const persisted = JSON.parse(await readFile(dataPath, 'utf8')) as PersistedData;

function findTag(name: string): Tag {
  const matches = Object.values(persisted.data.tags).filter(tag => tag.name.trim() === name);
  if (matches.length !== 1) {
    throw new Error(`应当恰好找到一个“${name}”标签，实际找到 ${matches.length} 个。`);
  }
  return matches[0];
}

function applyByTag(tagName: string, expected: Record<string, unknown>, apply: (itemId: string) => void) {
  const tag = findTag(tagName);
  const names = tag.items.map(itemId => persisted.data.items[itemId]?.name);
  const missingItems = tag.items.filter(itemId => !persisted.data.items[itemId]);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  const missingDefinitions = names.filter(name => name && !(name in expected));
  const extraDefinitions = Object.keys(expected).filter(name => !names.includes(name));

  if (missingItems.length || duplicateNames.length || missingDefinitions.length || extraDefinitions.length) {
    throw new Error(JSON.stringify({ tagName, missingItems, duplicateNames, missingDefinitions, extraDefinitions }, null, 2));
  }

  tag.items.forEach(apply);
}

applyByTag('基础食材', BASE_INGREDIENT_PRICES, itemId => {
  const item = persisted.data.items[itemId];
  item.manualPrice = BASE_INGREDIENT_PRICES[item.name];
});

applyByTag('工作方块', WORKSTATION_PROCESSING_FEES, itemId => {
  const item = persisted.data.items[itemId];
  delete item.manualPrice;
  item.processingFee = { ...WORKSTATION_PROCESSING_FEES[item.name] };
});

persisted.data = recalculatePrices(persisted.data);
persisted.updatedAt = new Date().toISOString();
const temporaryPath = `${dataPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
await rename(temporaryPath, dataPath);

console.log(`已更新 ${Object.keys(BASE_INGREDIENT_PRICES).length} 项基础食材价格。`);
console.log(`已更新 ${Object.keys(WORKSTATION_PROCESSING_FEES).length} 项工作方块加工费。`);
