import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('./public/data/recipe-manager.json', 'utf8'));
const items = data.data.items;
const recipes = data.data.recipes;
const tags = data.data.tags;

// 标签索引
const tagByName = {};
for (const t of Object.values(tags)) tagByName[t.name] = t;

// 配方按输出物品索引
const recipeByOutput = {};
for (const r of Object.values(recipes)) {
  for (const out of (r.outputs || [])) {
    if (out.type === 'item') recipeByOutput[out.ref] = r;
  }
}

// 标签成员索引：标签id -> 物品id数组
const tagMembers = {};
for (const t of Object.values(tags)) tagMembers[t.id] = t.items || [];

// 物品名索引
const nameOf = id => (items[id] ? items[id].name : id);

// 递归求底层食材（无配方者即为底层）
const memo = new Map();
function baseInputs(itemId, depth = 0, visiting = new Set()) {
  if (memo.has(itemId)) return memo.get(itemId);
  if (visiting.has(itemId) || depth > 12) return { [itemId]: 1 };
  visiting.add(itemId);

  const r = recipeByOutput[itemId];
  if (!r) {
    const res = { [itemId]: 1 };
    memo.set(itemId, res);
    return res;
  }
  const result = {};
  for (const inp of (r.inputs || [])) {
    let ids = [];
    if (inp.type === 'item') ids = [inp.ref];
    else if (inp.type === 'tag') ids = tagMembers[inp.ref] || [];
    for (const id of ids) {
      const sub = baseInputs(id, depth + 1, visiting);
      for (const [k, v] of Object.entries(sub)) result[k] = (result[k] || 0) + v;
    }
  }
  visiting.delete(itemId);
  memo.set(itemId, result);
  return result;
}

// 中间加工品集合（有配方但非成品菜）
const dishTag = tagByName['成品菜'];
const dishIds = new Set(dishTag ? dishTag.items : []);
const workstationTag = tagByName['工作方块'];
const workstationIds = new Set(workstationTag ? workstationTag.items : []);
const baseTag = tagByName['基础食材'];
const baseIds = new Set(baseTag ? baseTag.items : []);

// 顶层成品菜配方
const dishRecipes = [];
for (const [outId, r] of Object.entries(recipeByOutput)) {
  if (dishIds.has(outId)) dishRecipes.push({ outId, recipe: r });
}
// 去重（同一配方可能多输出）
const seen = new Set();
const dishes = [];
for (const d of dishRecipes) {
  if (seen.has(d.outId)) continue;
  seen.add(d.outId);
  const ws = d.recipe.workstation;
  dishes.push({
    id: d.outId,
    name: nameOf(d.outId),
    ws,
    wsName: nameOf(ws),
    itemTags: (items[d.outId].tags || []).map(t => (tags[t] ? tags[t].name : t)),
    directInputs: (d.recipe.inputs || []).map(i => (i.type === 'item' ? nameOf(i.ref) : '[tag]' + (tags[i.ref] ? tags[i.ref].name : i.ref))),
    base: baseInputs(d.outId),
  });
}

console.log('成品菜总数:', dishes.length);

// 底层材料统计
const baseUsage = {};
for (const d of dishes) {
  for (const k of Object.keys(d.base)) baseUsage[k] = (baseUsage[k] || 0) + 1;
}

// 是否为可购买的底层（有配方就不是底层）
console.log('\n=== 全部底层材料（无配方，需采购/解锁采购权限）===');
const bottomItems = Object.entries(baseUsage).sort((a, b) => b[1] - a[1]);
for (const [id, cnt] of bottomItems) {
  console.log(`${nameOf(id)} | 被${cnt}道菜依赖 | 基础食材标签:${baseIds.has(id) ? 'Y' : 'N'}`);
}
console.log('底层材料种类数:', bottomItems.length);

fs.writeFileSync('./.tmp-dish-deps.json', JSON.stringify(dishes, null, 1));
console.log('\n明细已写入 .tmp-dish-deps.json');
