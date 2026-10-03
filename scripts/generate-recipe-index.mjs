import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { buildRecipeIndex, validateRecipeIndex } from './recipe-index-core.mjs';

const root = process.cwd();
const dataPath = path.join(root, 'public/data/recipe-manager.json');
const jsonPath = path.join(root, 'public/data/recipe-index.json');
const markdownPath = path.join(root, 'docs/recipe-index.md');
const checkOnly = process.argv.includes('--check');

function markdown(index) {
  const lines = [
    '# AI 配方与解锁规划索引', '',
    '> 本文件由 `public/data/recipe-manager.json` 自动生成，只读，不是正式数据源。',
    `> 源数据更新时间：${index.generatedFrom.updatedAt}；生成格式版本：${index.indexVersion}`, '',
    '## 快速统计', '',
    `- 工作方块：${index.counts.workstations}；基础食材：${index.counts.baseIngredients}；配方：${index.counts.recipes}；成品菜：${index.counts.finishedFoods}`, '',
    '## 查询约定', '',
    '- `recipes`：411 个配方的完整目录，适合分类、读取工作方块、输入、附件、输出和配方链；不要只读取闭包结果。',
    '- `finishedFoods`：291 个成品菜的完整目录；`allUnlockedScenario.craftableFinishedItems` 只是其中当前材料条件可达的子集。',
    '- `recipeIdsByWorkstation[工作方块ID]`：该工作方块涉及的全部配方。',
    '- `recipeIdsByBaseIngredient[基础食材ID]`：直接引用该基础食材（或其标签）的配方。',
    '- `downstreamRecipeIdsByBaseIngredient[基础食材ID]` / `finishedFoodIdsByBaseIngredient[基础食材ID]`：沿输入关系得到的候选影响范围；只表示可能受该基础食材影响，不保证其他输入也已满足。',
    '- `allUnlockedScenario`：假设所有登记的工作方块和基础食材均可用时的材料可达闭包，用于解锁规划，不是全量配方目录。',
    '- 配方标签输入按“标签内任一成员可满足”计算，具体命中的成员记录在 `matches`。', '',
    '## 三种结果的区别', '',
    '- **全量分类**：读取 `recipes`、`finishedFoods` 以及各类反向索引；这部分应覆盖所有正式内容。',
    '- **候选影响范围**：读取 `downstreamRecipeIdsByBaseIngredient` 和 `finishedFoodIdsByBaseIngredient`，用于快速找出某基础食材可能影响的后续内容。',
    '- **严格材料可达**：读取 `allUnlockedScenario` 或运行局面查询命令；只有输入材料和工作方块满足分析条件的配方才会进入结果。', '',
    '## 按局面试算', '',
    '运行 `npm run query-recipe-index -- --workstations <工作方块ID,...> --ingredients <基础食材ID,...>`，即可读取指定解锁条件下的可制作配方、成品菜和每个标签槽命中的成员。省略参数表示使用对应的全部登记项。', '',
    '## 工作方块', '', '| ID | 名称 | 配方数 |', '|---|---|---:|',
    ...index.workstations.map(item => `| ${item.id} | ${item.name} | ${(index.recipeIdsByWorkstation[item.id] || []).length} |`), '',
    '## 基础食材', '', '| ID | 名称 | 下游配方数 |', '|---|---|---:|',
    ...index.baseIngredients.map(item => `| ${item.id} | ${item.name} | ${(index.recipeIdsByBaseIngredient[item.id] || []).length} |`), '',
    '## 材料可达闭包摘要', '', `在全部工作方块和基础食材可用时，按当前分析口径可达配方 ${index.allUnlockedScenario.craftableRecipeIds.length} 个，成品菜 ${index.allUnlockedScenario.craftableFinishedItems.length} 个；这不是正式配方总数。`, '',
    '完整配方、输入候选、输出、匹配追踪和配方链请读取同目录的 `public/data/recipe-index.json`。', ''
  ];
  return `${lines.join('\n')}\n`;
}

const persisted = JSON.parse(await readFile(dataPath, 'utf8'));
const index = buildRecipeIndex(persisted);
validateRecipeIndex(index);
const json = `${JSON.stringify(index, null, 2)}\n`;
const md = markdown(index);
if (checkOnly) {
  const [oldJson, oldMd] = await Promise.all([readFile(jsonPath, 'utf8'), readFile(markdownPath, 'utf8')]);
  if (oldJson !== json || oldMd !== md) throw new Error('配方索引与正式数据不一致，请运行 npm run generate-recipe-index。');
  console.log('配方索引检查通过。');
} else {
  await Promise.all([
    writeFile(`${jsonPath}.tmp`, json, 'utf8').then(() => rename(`${jsonPath}.tmp`, jsonPath)),
    writeFile(`${markdownPath}.tmp`, md, 'utf8').then(() => rename(`${markdownPath}.tmp`, markdownPath))
  ]);
  console.log(`已生成配方索引：${index.counts.recipes} 个配方，${index.allUnlockedScenario.craftableFinishedItems.length} 个可制作成品菜。`);
}
