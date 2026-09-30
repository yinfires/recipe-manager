import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve('public/data/recipe-manager.json');
const DOC_PATH = path.resolve('docs/food-classification.md');
const CHECK_ONLY = process.argv.includes('--check');
const FINISHED_TAG_NAME = '成品菜';
const DELETED_DISH_NAME = '鲶鱼烤串';

const TAGS = [
  ['tag_food_main_staple', '主食'], ['tag_food_main_drink', '饮品'], ['tag_food_main_snack', '点心'],
  ['tag_food_flavor_sweet', '甜'], ['tag_food_flavor_spicy', '辣'], ['tag_food_flavor_sour', '酸'],
  ['tag_food_flavor_umami', '鲜'], ['tag_food_flavor_light', '清淡'], ['tag_food_flavor_rich', '浓郁'],
  ['tag_food_flavor_refreshing', '凉爽'], ['tag_food_drink_mellow', '甘'], ['tag_food_drink_dry', '辛'],
  ['tag_food_drink_bitter', '苦'], ['tag_food_ingredient_meat', '肉食'],
  ['tag_food_ingredient_aquatic', '水产'], ['tag_food_ingredient_vegetarian', '素食'],
  ['tag_food_ingredient_fungus', '菌类'], ['tag_food_ingredient_fruit', '水果'],
  ['tag_food_ingredient_dairy', '奶香'], ['tag_food_ingredient_grain', '米面'],
  ['tag_food_form_soup', '汤羹'], ['tag_food_form_tea', '茶饮'], ['tag_food_form_grilled', '烧烤'],
  ['tag_food_form_fried', '油炸'], ['tag_food_form_raw', '生食'], ['tag_food_form_baked', '烘焙'],
  ['tag_food_form_alcohol', '酒类']
].map(([id, name]) => ({ id, name }));
const MANAGED_IDS = new Set(TAGS.map(tag => tag.id));
const MANAGED_NAMES = new Set(TAGS.map(tag => tag.name));
const MAIN_NAMES = ['主食', '饮品', '点心'];

const DRINK_WORKSTATIONS = new Set(['茶壶', '酒桶', '榨汁机']);
const DESSERT = /蛋糕|布丁|果冻|冰棍|麻薯|团子|羊羹|牛皮糖|巧克力礼盒|饼干|曲奇|蜜饯|刨冰|果酱卷|翻糖派|青柠派|苹果派|巧克力派|芝士派|南瓜派|蛋奶沙司|拔丝土豆|冰糖炖雪梨|糍粑|樱饼|生首烧|信州瘦马|花椒蜂蜜/;
const SNACK = /脆海苔|仙贝|小鱼干|臭豆腐|烤.*串|串$|脆皮面包|面包|法棍|吐司|牛角面包|号角蛋糕|巧克力礼盒/;
const MEAL_EXCLUSIONS = /凉拌|冷切|冷肉|手卷|饭团|豆包饭|臭豆腐|肉夹馍|火烧|包子|馒头|饺子|薯条|烤红薯|烤马铃薯|炸春卷/;
const MAIN_OVERRIDES = new Map([['炸春卷','主食'],['白雪','主食'],['冰糖炖雪梨','点心'],['幻昙花羹','点心'],['蟠桃饭','主食']]);
const ALCOHOL = new Set(['葡萄酒','雪莉','尊尼获加','獺祭','红皇后','诗庄堡','马利宝椰子朗姆酒']);
const DRY = new Set(['葡萄酒','雪莉','尊尼获加','獺祭']);
const MELLOW = new Set(['苹果汁','西瓜汁','葡萄汁','桃子汁','梨汁','浆果青柠汁','粉红青柠汁','椰奶','港式丝袜奶茶','红皇后','诗庄堡','马利宝椰子朗姆酒']);
const BITTER = new Set(['铁观音','碧螺春','冻顶乌龙茶','云南滇红','麦香乌龙茶','樱吹雪']);

const P = {
  sweet: /蛋糕|布丁|果冻|冰棍|麻薯|团子|羊羹|糖|巧克力|饼干|曲奇|蜜饯|刨冰|果酱|翻糖|甜浆果|蜜汁|拔丝|樱饼|糍粑|信州瘦马|生首烧/,
  spicy: /辣|麻婆|椒麻|水煮|毛血旺|重庆小面|螺蛳粉|干锅|虎皮青椒|油泼鱼|花椒/,
  sour: /酸|青柠|柠汁|柠檬|醋渍|罗宋汤/,
  light: /清蒸|冷奴|凉拌|沙拉|米饭$|蒸蛋|蛋花汤|海带寿司卷|蔬菜面|蔬菜杂烩|素手卷/,
  rich: /红烧|东坡|佛跳墙|奶油|黄油|蜜汁|酱烧|干锅|毛血旺|大盘鸡|炖牛肉|狮子头|牧羊人派|千层面|浓汤|酥油茶|尊尼获加|朗姆酒/,
  refreshing: /冰|冷|凉拌|果汁|汁$|水母果冻/,
  soup: /汤|羹|粥|稀饭|浓汤|煲$|石狩锅|佛跳墙|炖雪梨/,
  fried: /炸|薯条|酥炸|炸饼|水煎包/,
  baked: /面包|蛋糕|派$|饼干|曲奇|果酱卷|号角蛋糕|牛角面包|法棍|吐司/,
  raw: /寿司|握寿司|军舰|细卷|太卷|加州卷|铁火卷|鱼生拼盘|夜雀的手握/,
  meat: /牛肉|牛排|猪(?!蛋)|培根|火腿|羊|鸡(?!蛋)|兔|鹿|野猪|驴肉|肉馅|肉丸|排骨|五花肉|肉片|肉丝|猪肚|中翅|鸡翅|骨肉相连|熊掌|龟肉/,
  aquatic: /鱼|虾|蟹|生蚝|蛤蜊|鱿鱼|海鲜|水母|鳗|河豚|鲑|鳕|鲈|鲱|金枪|鱼籽|蟹籽/,
  fungus: /蘑菇|菌/,
  fruit: /苹果|西瓜|葡萄|桃|梨|浆果|石榴|青柠|火龙果|蛋黄果|椰子|草莓|柠檬/,
  dairy: /奶|奶油|黄油|芝士|酥油/,
  grain: /米饭|稻米|面条|意面|乌冬|粉$|粉条|苕皮|馒头|包子|饺子|抄手|卷饼|火烧|肉夹馍|泡馍|肠粉|米肠|饭团|寿司|粥|稀饭|年糕|裹馅面食/,
  sugar: /糖|蜂蜜|果酱|巧克力|甜浆果/,
  chili: /红辣椒|绿辣椒|辣椒|花椒/,
  sourIngredient: /醋|酸菜|青柠|柠檬|腌黄瓜/
};

function singleTag(data, name) {
  const found = Object.values(data.tags).filter(tag => tag.name.trim() === name);
  if (found.length !== 1) throw new Error(`应当恰好找到一个“${name}”标签，实际找到 ${found.length} 个。`);
  return found[0];
}
function recipeFor(data, itemId) { return Object.values(data.recipes).find(recipe => recipe.outputs.some(output => output.type === 'item' && output.ref === itemId)); }
function ingredientNames(data, itemId) {
  const recipe = recipeFor(data, itemId);
  if (!recipe) return [data.items[itemId]?.name].filter(Boolean);
  const names = [];
  for (const slot of [...recipe.inputs, ...recipe.attachments]) {
    if (slot.type === 'item' && data.items[slot.ref]) {
      names.push(data.items[slot.ref].name);
    } else if (slot.type === 'tag' && data.tags[slot.ref]) names.push(`[${data.tags[slot.ref].name}]`);
  }
  return [...new Set(names)];
}
function mainFor(name, workstation) {
  if (MAIN_OVERRIDES.has(name)) return MAIN_OVERRIDES.get(name);
  if (DRINK_WORKSTATIONS.has(workstation) || /茶|奶茶|果汁|汁$|葡萄酒|雪莉|威士忌|朗姆酒|獺祭/.test(name)) return '饮品';
  if (MEAL_EXCLUSIONS.test(name)) return '主食';
  if (DESSERT.test(name)) return '点心';
  if (SNACK.test(name) && !/烤红薯|烤马铃薯|薯条/.test(name)) return '点心';
  return '主食';
}
function fruitEvidence(itemName, ingredients) {
  if (/柠汁腌|酸柠腌/.test(itemName)) return false;
  if (P.fruit.test(itemName)) return true;
  return ingredients.some(name => P.fruit.test(name) && !/柠檬汁|青柠汁|果汁$|汁$/.test(name));
}
function classify(data, itemId) {
  const item = data.items[itemId];
  const recipe = recipeFor(data, itemId);
  const workstation = recipe ? data.items[recipe.workstation]?.name ?? '' : '';
  const ingredients = ingredientNames(data, itemId);
  const text = ingredients.join('|');
  const main = mainFor(item.name, workstation);
  const tags = new Set([main]);
  const meat = (!DESSERT.test(item.name) && P.meat.test(item.name)) || ingredients.some(name => P.meat.test(name) && !/蛋|奶|黄油|油|汤|酱|汁|羊羹/.test(name));
  const aquatic = P.aquatic.test(text) || P.aquatic.test(item.name);
  const fungus = P.fungus.test(text) || P.fungus.test(item.name);
  const fruit = fruitEvidence(item.name, ingredients);
  const dairy = P.dairy.test(text) || P.dairy.test(item.name);
  const grain = main === '主食' && !P.baked.test(item.name) && (P.grain.test(item.name) || ingredients.some(name => P.grain.test(name)));
  if (meat) tags.add('肉食'); if (aquatic) tags.add('水产');
  const plantDish = main === '主食' && !meat && !aquatic && !P.baked.test(item.name) && /豆腐|蔬菜|菌|蘑菇|折耳根|土豆|马铃薯|红薯|茄子|豆皮|豆包|豆汁/.test(`${item.name}|${text}`);
  if (plantDish) tags.add('素食');
  if (fungus) tags.add('菌类'); if (fruit) tags.add('水果'); if (dairy) tags.add('奶香'); if (grain) tags.add('米面');
  const sweetDrink = main === '饮品' && (/汁$|奶茶|椰奶|红皇后|马利宝椰子朗姆酒/.test(item.name) || P.sugar.test(text));
  if (P.sweet.test(item.name) || P.sugar.test(text) || sweetDrink) tags.add('甜');
  if (P.spicy.test(item.name) || P.chili.test(text)) tags.add('辣');
  if (P.sour.test(item.name) || P.sourIngredient.test(text)) tags.add('酸');
  if (aquatic || fungus || (P.soup.test(item.name) && meat)) tags.add('鲜');
  if (P.light.test(item.name)) tags.add('清淡');
  if (P.rich.test(item.name) || (dairy && main !== '饮品')) tags.add('浓郁');
  if (P.refreshing.test(item.name) || workstation === '冰柜') tags.add('凉爽');
  if (MELLOW.has(item.name)) tags.add('甘'); if (DRY.has(item.name)) tags.add('辛'); if (BITTER.has(item.name)) tags.add('苦');
  if (main === '主食' && P.soup.test(item.name) && !/羊羹|花羹/.test(item.name)) tags.add('汤羹');
  if (workstation === '茶壶' || /茶$|奶茶/.test(item.name)) tags.add('茶饮');
  if (workstation === '烧烤架' || /烤.*串|烤串/.test(item.name)) tags.add('烧烤');
  if (P.fried.test(item.name)) tags.add('油炸');
  if (P.baked.test(item.name) && workstation === '烤炉') tags.add('烘焙');
  if (ALCOHOL.has(item.name)) tags.add('酒类');
  const heated = ['炒锅','汤锅','烤炉','蒸笼','烧烤架'].includes(workstation);
  if (!heated && P.raw.test(item.name) && aquatic && !P.fried.test(item.name)) tags.add('生食');
  if (['柠汁腌鱼','酸柠腌虾'].includes(item.name)) tags.delete('生食');
  if (item.name === '炸春卷') { tags.delete('点心'); tags.add('主食'); tags.add('油炸'); }
  return { itemId, name: item.name, main, tags: [...tags], workstation };
}
function classifications(data) {
  const finished = singleTag(data, FINISHED_TAG_NAME);
  const missing = finished.items.filter(itemId => !data.items[itemId]);
  if (missing.length) throw new Error(`成品菜标签含不存在物品：${missing.join(', ')}`);
  if (finished.items.some(itemId => data.items[itemId].name === DELETED_DISH_NAME)) throw new Error(`已删除食物“${DELETED_DISH_NAME}”仍存在。`);
  return finished.items.map(itemId => classify(data, itemId)).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
function apply(data, list) {
  const finished = singleTag(data, FINISHED_TAG_NAME);
  const oldIds = Object.values(data.tags).filter(tag => MANAGED_IDS.has(tag.id) || MANAGED_NAMES.has(tag.name)).map(tag => tag.id);
  for (const item of Object.values(data.items)) item.tags = item.tags.filter(id => !oldIds.includes(id));
  oldIds.forEach(id => delete data.tags[id]);
  TAGS.forEach(tag => { data.tags[tag.id] = { ...tag, items: [], childTags: [], parentTags: [finished.id] }; });
  finished.childTags = [...finished.childTags.filter(id => !oldIds.includes(id) && !MANAGED_IDS.has(id)), ...TAGS.map(tag => tag.id)];
  const byName = new Map(TAGS.map(tag => [tag.name, tag.id]));
  list.forEach(entry => entry.tags.forEach(name => {
    const id = byName.get(name);
    data.items[entry.itemId].tags.push(id);
    data.tags[id].items.push(entry.itemId);
  }));
}
function validate(data, list) {
  const errors = [];
  const byName = new Map(TAGS.map(tag => [tag.name, tag.id]));
  const finished = singleTag(data, FINISHED_TAG_NAME);
  finished.items.forEach(itemId => {
    const item = data.items[itemId];
    const mains = MAIN_NAMES.filter(name => item.tags.includes(byName.get(name)));
    if (mains.length !== 1) errors.push(`${item.name} 主类数量为 ${mains.length}`);
    const expected = list.find(entry => entry.itemId === itemId);
    const actualManaged = item.tags.filter(tagId => MANAGED_IDS.has(tagId)).sort();
    const expectedManaged = (expected?.tags ?? []).map(name => byName.get(name)).sort();
    if (JSON.stringify(actualManaged) !== JSON.stringify(expectedManaged)) {
      errors.push(`${item.name} 的正式标签与分类规则不一致`);
    }
  });
  TAGS.forEach(def => {
    const tag = data.tags[def.id];
    if (!tag) errors.push(`缺少标签 ${def.name}`);
    (tag?.items ?? []).forEach(itemId => {
      if (!data.items[itemId]) errors.push(`${def.name} 引用不存在物品 ${itemId}`);
      else if (!data.items[itemId].tags.includes(tag.id)) errors.push(`${def.name}/${data.items[itemId].name} 双向引用不一致`);
    });
  });
  const finishedIds = new Set(finished.items);
  TAGS.forEach(def => {
    for (const itemId of data.tags[def.id]?.items ?? []) {
      if (!finishedIds.has(itemId)) errors.push(`${def.name} 包含非成品菜 ${data.items[itemId]?.name ?? itemId}`);
    }
  });
  const check = (name, required, forbidden = []) => {
    const entry = list.find(value => value.name === name);
    if (!entry) return errors.push(`边界样例不存在：${name}`);
    required.forEach(tag => { if (!entry.tags.includes(tag)) errors.push(`${name} 应有 ${tag}`); });
    forbidden.forEach(tag => { if (entry.tags.includes(tag)) errors.push(`${name} 不应有 ${tag}`); });
  };
  check('炸春卷',['主食','油炸'],['点心']); check('柠汁腌鱼',['主食','水产','酸'],['生食','水果']);
  check('酸柠腌虾',['主食','水产','酸'],['生食','水果']); check('鱼生拼盘',['主食','水产','生食']);
  check('鲑鱼寿司',['主食','水产','米面','生食']); check('青柠冰棍',['点心','甜','酸','凉爽','水果']);
  check('港式丝袜奶茶',['饮品','茶饮','奶香']); check('铁观音',['饮品','茶饮','苦']); check('葡萄酒',['饮品','酒类']);
  ['苹果汁','葡萄汁','桃子汁','梨汁','浆果青柠汁','粉红青柠汁','港式丝袜奶茶'].forEach(name => check(name,['饮品','甜']));
  check('炸春卷',['主食','肉食','油炸'],['点心','甜']);
  check('臭豆腐',['主食','素食','菌类','辣'],['点心','水产']);
  check('法式薯条',['主食','油炸'],['点心','米面']);
  check('烤红薯',['主食'],['点心','米面']); check('烤马铃薯',['主食'],['点心','米面']);
  check('竹筒水羊羹',['点心','甜'],['汤羹','米面','肉食','素食']);
  check('七色羊羹',['点心','甜'],['汤羹','米面','肉食','素食']);
  check('幻昙花羹',['点心','甜'],['汤羹','米面','肉食','素食']);
  ['面包','牛角面包','脆皮面包','烘焙师面包','法棍面包','吐司面包','辫子面包','小圆面包'].forEach(name => check(name,['点心','烘焙'],['肉食','素食','米面']));
  ['草莓釉面饼干','甜浆果釉面饼干','巧克力釉面饼干'].forEach(name => check(name,['点心','烘焙','甜'],['肉食','素食','米面']));
  ['凉拌折耳根','冷切火腿片','素手卷','猪肉饭团','八云豆包饭'].forEach(name => check(name,['主食'],['点心']));
  if (Object.values(data.items).some(item => item.name === DELETED_DISH_NAME)) errors.push(`已删除食物仍存在：${DELETED_DISH_NAME}`);
  if (errors.length) throw new Error(`分类校验失败：\n- ${errors.join('\n- ')}`);
}
function document(persisted, list) {
  const examples = name => list.filter(entry => entry.tags.includes(name)).slice(0, 6).map(entry => entry.name).join('、');
  const rows = list.map(entry => `| ${entry.name} | ${entry.main} | ${entry.tags.filter(tag => tag !== entry.main).join('、') || '—'} | ${entry.workstation || '无配方'} |`).join('\n');
  const defs = [
    ['甜','料理中的明确甜味，不替代饮品的“甘”'],['辣','辣椒或明确的辣、麻辣、椒麻风味'],['酸','醋、酸菜、青柠或柠檬等酸味'],['鲜','水产、菌类或肉汤形成的鲜味'],
    ['清淡','蒸煮、清汤或原味为主'],['浓郁','奶油、油脂、浓酱或多种肉类形成厚重风味'],['凉爽','冰制、冷食、凉拌或清凉成品'],['甘','仅用于饮品的圆润甘口'],
    ['辛','仅用于酒饮的辛口、干烈或酒精刺激'],['苦','仅用于饮品的苦涩口感'],['肉食','畜肉或禽肉是主要原料'],['水产','鱼、虾、蟹、贝、鱿鱼等是主要原料'],
    ['素食','明确以蔬菜、豆制品或菌类为主体的菜肴；不与肉食互补'],['菌类','菌类是主要食材或核心风味'],['水果','水果是主体或显著风味来源；柠檬汁、青柠汁等调味汁不算水果'],['奶香','奶、奶油或黄油是显著原料'],
    ['米面','米饭、粥、面条、米粉、米皮或餐食面皮是主体；不含面包和糕点'],['汤羹','实际为汤、粥、咸羹、浓汤或汤煲的主食料理'],['茶饮','茶壶制作或以茶汤为主体'],['烧烤','烧烤架或明确串烤'],
    ['油炸','使用油脂加热且明确为炸制'],['生食','生鲜原料未经加热直接组合'],['烘焙','烤炉制作的面包、蛋糕、派或曲奇'],['酒类','明确含酒精的饮品']
  ].map(([name, rule]) => `| ${name} | ${rule} | ${examples(name)} |`).join('\n');
  return `# 成品菜分类与标签依据

本文件是成品菜分类的正式维护依据。新增、修改或删除成品菜、配方、工作方块和食物标签时，必须同步运行分类脚本并维护本文件。

- 最后审核日期：2026-09-30
- 数据快照时间：${persisted.updatedAt}
- 当前成品菜数量：${list.length}
- 生成命令：\`npm run classify-foods\`
- 一致性检查：\`npm run check-food-classification\`

## 三大主类

| 主类 | 定义 | 参考食物 |
|---|---|---|
| 主食 | 正餐、菜肴、汤粥、饭面，以及明确作为正餐食用的熟制食品 | ${examples('主食')} |
| 饮品 | 茶饮、果汁、奶饮及酒类 | ${examples('饮品')} |
| 点心 | 甜点、糕饼、冰品、糖果、传统小吃和零食 | ${examples('点心')} |

点心包含甜品、烘焙糕点、冰品、糖果和没有正餐属性的零食、小吃。凉拌菜、冷切菜、手卷、饭团、臭豆腐、豆包饭、薯条、炸春卷和直接烤制的饱腹薯类归主食。

## 小标签依据

| 标签 | 判定依据 | 当前参考食物 |
|---|---|---|
${defs}

“甜”也适用于明确甜口的饮品，并可与饮品的“甘”同时存在。辛表示辛口或干烈，不等于辣；甘表示圆润甘口。

## 工作方块规则

- 炒锅、汤锅、烤炉、蒸笼和烧烤架代表加热加工，成品原则上不得标记生食。
- 料理台、混合碗不自动代表生食，仍需检查原料状态和前置加工。
- 冰柜通常支持凉爽，但不能仅凭冰柜决定主类。
- 榨汁机通常制作饮品，但沙司和蛋奶沙司仍按成品用途判断。
- 茶壶成品通常归饮品并标记茶饮；酒桶成品归饮品并标记酒类。
- 油炸不能只看工作方块名称；炸春卷虽使用汤锅，但名称和油脂配方支持油炸。
- 肉食、素食和米面均为独立可选标签，不得使用互补规则；蛋类不是肉食，饮品、烘焙和甜点不得被强制标记肉食或素食。
- 面包、蛋糕、饼干、派等烘焙食品不因面粉或面团标记米面。

## 边界样例

- 炸春卷：主食、油炸，不是点心。
- 薯条、烤红薯、烤马铃薯：作为饱腹食品归主食，不是点心；薯类不标记米面。
- 羊羹、幻昙花羹：归点心，不因名称含“羹”标记汤羹。
- 凉拌折耳根、冷切火腿片、素手卷、猪肉饭团、臭豆腐、八云豆包饭：具有菜肴或餐食属性，归主食。
- 柠汁腌鱼、酸柠腌虾：使用炒锅，属于熟制主食，不标记生食。
- 鱼生拼盘：使用混合碗直接组合生鱼片，标记生食。
- 鲑鱼寿司等寿司：料理台组合熟米饭和生鱼片，标记生食。
- 白雪：汤锅制作的鱼汤料理，归主食。
- 樱吹雪：茶壶制作，归饮品并标记茶饮。
- 已删除的鲶鱼烤串不得出现在正式分类、标签成员或下方明细中。

## 全量成品菜明细

| 食物 | 主类 | 小标签 | 工作方块 |
|---|---|---|---|
${rows}

## 维护与迁移

1. 修改前运行 \`npm run check-food-classification\`，确认当前基线一致。
2. 新增、删除或调整成品菜后，更新本脚本的分类规则，再运行 \`npm run classify-foods\`。
3. 不得只改 \`item.tags\` 或 \`tag.items\` 一侧；脚本会同时重建双向关系。
4. 标签重命名或删除时保留稳定 ID，或在脚本中明确迁移旧 ID。
5. 每次变更同步更新 \`docs/maintenance-log.md\`，并运行测试、构建和一致性检查。
`;
}

const persisted = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const list = classifications(persisted.data);
if (CHECK_ONLY) {
  validate(persisted.data, list);
  if (await readFile(DOC_PATH, 'utf8') !== document(persisted, list)) throw new Error('分类文档与正式数据或规则不一致，请运行 npm run classify-foods。');
  console.log(`分类检查通过：${list.length} 项成品菜，${TAGS.length} 个分类标签。`);
} else {
  apply(persisted.data, list);
  persisted.updatedAt = new Date().toISOString();
  validate(persisted.data, list);
  const temporary = `${DATA_PATH}.tmp`;
  await writeFile(temporary, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
  await rename(temporary, DATA_PATH);
  await writeFile(DOC_PATH, document(persisted, list), 'utf8');
  console.log(`已分类 ${list.length} 项成品菜并更新维护文档。`);
}
