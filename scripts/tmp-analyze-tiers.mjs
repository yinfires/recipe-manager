import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('./public/data/recipe-manager.json', 'utf8'));
const items = data.data.items;
const recipes = data.data.recipes;
const tags = data.data.tags;

const tagByName = {};
for (const t of Object.values(tags)) tagByName[t.name] = t;
const recipeByOutput = {};
for (const r of Object.values(recipes)) for (const out of (r.outputs || [])) if (out.type === 'item') recipeByOutput[out.ref] = r;
const tagMembers = {};
for (const t of Object.values(tags)) tagMembers[t.id] = t.items || [];
const nameOf = id => (items[id] ? items[id].name : id);

const WS = {
  stockpot: '汤锅', pot: '炒锅', cutting_board: '砧板', steamer: '蒸笼', oven: '烤炉',
  crafting_bowl: '混合碗', juicer: '榨汁机', teapot: '茶壶', bamboo_tray: '竹匾',
  cuisine_board: '料理台', grill: '烧烤架', freezer: '冰柜',
  fermentation_tank: '发酵桶', oil_press: '榨油机', tavern_barrel: '酒桶', stick: '木棍',
};
function wsKey(wsId) {
  for (const k of Object.keys(WS)) if (wsId && wsId.includes(k)) return WS[k];
  return String(wsId);
}

const memo = new Map();
function analyze(itemId, visiting = new Set()) {
  if (memo.has(itemId)) return memo.get(itemId);
  if (visiting.has(itemId)) return { ws: new Set(), base: { [itemId]: 1 } };
  visiting.add(itemId);
  const r = recipeByOutput[itemId];
  if (!r) {
    const res = { ws: new Set(), base: { [itemId]: 1 } };
    memo.set(itemId, res); visiting.delete(itemId); return res;
  }
  const ws = new Set([wsKey(r.workstation)]);
  const base = {};
  for (const inp of (r.inputs || [])) {
    const ids = inp.type === 'item' ? [inp.ref] : (tagMembers[inp.ref] || []);
    for (const id of ids) {
      const sub = analyze(id, visiting);
      for (const w of sub.ws) ws.add(w);
      for (const [k, v] of Object.entries(sub.base)) base[k] = (base[k] || 0) + v;
    }
  }
  visiting.delete(itemId);
  const res = { ws, base };
  memo.set(itemId, res);
  return res;
}

const dishIds = tagByName['成品菜'].items;
const seen = new Set();
const out = [];
for (const id of dishIds) {
  if (seen.has(id)) continue;
  seen.add(id);
  const a = analyze(id);
  out.push({
    name: nameOf(id),
    tags: (items[id].tags || []).map(t => tags[t] ? tags[t].name : t).filter(n => n !== '成品菜'),
    ws: [...a.ws].sort(),
    base: Object.keys(a.base).map(nameOf).sort(),
  });
}

const L = [];
L.push('=== 工作方块组合分布 ===');
const combos = {};
for (const d of out) {
  const k = d.ws.join('+');
  (combos[k] = combos[k] || []).push(d.name);
}
for (const [k, v] of Object.entries(combos).sort((a, b) => b[1].length - a[1].length)) {
  L.push(`\n[${k}] → ${v.length}道`);
  L.push('  ' + v.join('、'));
}

L.push('\n\n=== 单工作方块即可完成的菜（不含中间加工品）===');
const simple = out.filter(d => d.ws.length === 1);
for (const d of simple) {
  L.push(`${d.ws[0]} | ${d.name} | 底层食材: ${d.base.join('、')}`);
}

fs.writeFileSync('./.tmp-report.txt', L.join('\n'));
console.log('written', L.length, 'lines');
