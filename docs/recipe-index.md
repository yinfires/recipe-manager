# AI 配方与解锁规划索引

> 本文件由 `public/data/recipe-manager.json` 自动生成，只读，不是正式数据源。
> 源数据更新时间：2026-10-03T06:30:12.464Z；生成格式版本：1

## 快速统计

- 工作方块：16；基础食材：84；配方：411；成品菜：291

## 查询约定

- `recipes`：411 个配方的完整目录，适合分类、读取工作方块、输入、附件、输出和配方链；不要只读取闭包结果。
- `finishedFoods`：291 个成品菜的完整目录；`allUnlockedScenario.craftableFinishedItems` 只是其中当前材料条件可达的子集。
- `recipeIdsByWorkstation[工作方块ID]`：该工作方块涉及的全部配方。
- `recipeIdsByBaseIngredient[基础食材ID]`：直接引用该基础食材（或其标签）的配方。
- `downstreamRecipeIdsByBaseIngredient[基础食材ID]` / `finishedFoodIdsByBaseIngredient[基础食材ID]`：沿输入关系得到的候选影响范围；只表示可能受该基础食材影响，不保证其他输入也已满足。
- `allUnlockedScenario`：假设所有登记的工作方块和基础食材均可用时的材料可达闭包，用于解锁规划，不是全量配方目录。
- 配方标签输入按“标签内任一成员可满足”计算，具体命中的成员记录在 `matches`。

## 三种结果的区别

- **全量分类**：读取 `recipes`、`finishedFoods` 以及各类反向索引；这部分应覆盖所有正式内容。
- **候选影响范围**：读取 `downstreamRecipeIdsByBaseIngredient` 和 `finishedFoodIdsByBaseIngredient`，用于快速找出某基础食材可能影响的后续内容。
- **严格材料可达**：读取 `allUnlockedScenario` 或运行局面查询命令；只有输入材料和工作方块满足分析条件的配方才会进入结果。

## 按局面试算

运行 `npm run query-recipe-index -- --workstations <工作方块ID,...> --ingredients <基础食材ID,...>`，即可读取指定解锁条件下的可制作配方、成品菜和每个标签槽命中的成员。省略参数表示使用对应的全部登记项。

## 工作方块

| ID | 名称 | 配方数 |
|---|---|---:|
| farm_and_charm_crafting_bowl____ | 混合碗 | 33 |
| farmersdelight_cutting_board___ | 砧板 | 51 |
| icecore_oven___ | 烤炉 | 31 |
| kaleidoscope_cookery_bamboo_tray___ | 竹匾 | 3 |
| kaleidoscope_cookery_pot___ | 炒锅 | 95 |
| kaleidoscope_cookery_steamer___ | 蒸笼 | 9 |
| kaleidoscope_cookery_stockpot___ | 汤锅 | 94 |
| kaleidoscope_cookery_teapot___ | 茶壶 | 8 |
| kaleidoscope_fragrantorchard_juicer____ | 榨汁机 | 18 |
| kaleidoscope_grilling_grill____ | 烧烤架 | 11 |
| kaleidoscope_grilling_oil_press____ | 榨油器 | 1 |
| kaleidoscope_tavern_barrel___ | 酒桶 | 7 |
| kaleidoscope_world_liquor_freezer___ | 冰柜 | 8 |
| minecraft_stick___ | 木棍 | 11 |
| youkaisfeasts_cuisine_board____ | 料理台 | 22 |
| youkaisfeasts_fermentation_tank____ | 发酵桶 | 9 |

## 基础食材

| ID | 名称 | 下游配方数 |
|---|---|---:|
| aquaculture_atlantic_halibut_______ | 大西洋比目鱼 | 1 |
| aquaculture_atlantic_herring______ | 大西洋鲱鱼 | 3 |
| aquaculture_box_turtle___ | 箱龟 | 1 |
| aquaculture_brown_shrooma____ | 褐蕈鱼 | 1 |
| aquaculture_catfish___ | 鲶鱼 | 2 |
| aquaculture_jellyfish___ | 水母 | 1 |
| aquaculture_perch____ | 河鲈鱼 | 4 |
| aquaculture_red_shrooma____ | 红蕈鱼 | 1 |
| aquaculture_tambaqui______ | 大盖巨脂鲤 | 2 |
| aquaculture_tuna____ | 金枪鱼 | 1 |
| collectorsreap_platinum_bass______ | 生白金鲈鱼 | 1 |
| collectorsreap_tiger_prawn_____ | 生黑虎虾 | 8 |
| crabbersdelight_clam___ | 蛤蜊 | 1 |
| farm_and_charm_strawberry___ | 草莓 | 2 |
| farmersdelight_ham___ | 火腿 | 4 |
| item_1790124131145 | 小麦 | 4 |
| item_1790125887206 | 胡萝卜 | 9 |
| item_1790126010461 | 马铃薯 | 9 |
| item_1790126025786 | 甜菜根 | 7 |
| item_1790126144727 | 海带 | 5 |
| item_1790126151178 | 海草 | 3 |
| item_1790128035425 | 南瓜 | 1 |
| item_1790128108725 | 棕色蘑菇 | 23 |
| item_1790128122990 | 红色蘑菇 | 4 |
| item_1790128163987 | 双孢蘑菇 | 6 |
| item_1790130683439 | 稻米穗 | 1 |
| item_1790134179343 | 卷心菜 | 1 |
| item_1790135106649 | 番茄 | 4 |
| item_1790137148750 | 绿辣椒 | 22 |
| item_1790138031487 | 红辣椒 | 28 |
| item_1790138361858 | 红薯 | 3 |
| item_1790138417330 | 茄子 | 2 |
| item_1790138531027 | 玉米 | 4 |
| item_1790138660812 | 折耳根 | 1 |
| item_1790138757205 | 红豆 | 9 |
| item_1790138879144 | 幻昙花 | 2 |
| item_1790138974040 | 洋葱 | 35 |
| item_1790139066734 | 黄瓜 | 2 |
| item_1790139253176 | 发光浆果 | 2 |
| item_1790139430160 | 甜浆果 | 12 |
| item_1790140009664 | 苹果 | 1 |
| item_1790140036153 | 西瓜 | 1 |
| item_1790140073708 | 可可豆 | 1 |
| item_1790140447393 | 石榴 | 1 |
| item_1790141723911 | 青柠 | 1 |
| item_1790141751973 | 红心火龙果 | 3 |
| item_1790141853911 | 蛋黄果 | 4 |
| item_1790141939382 | 椰子 | 2 |
| item_1790141973599 | 桃子 | 3 |
| item_1790141993088 | 梨 | 3 |
| item_1790142009787 | 葡萄 | 3 |
| item_1790142054571 | 冰葡萄 | 1 |
| item_1790142068808 | 黄金葡萄 | 2 |
| item_1790142085428 | 青提葡萄 | 1 |
| item_1790155533298 | 生牛肉 | 3 |
| item_1790155582175 | 生猪排 | 2 |
| item_1790155604936 | 生羊肉 | 2 |
| item_1790155640667 | 生鸡肉 | 3 |
| item_1790155660361 | 生兔肉 | 2 |
| item_1790155674872 | 生鹿排 | 1 |
| item_1790155689801 | 生野猪肉 | 1 |
| kaleidoscope_chinesefood_salt__ | 盐 | 37 |
| kaleidoscope_chinesefood_yellow_croaker____ | 黄花鱼 | 2 |
| kaleidoscope_cookery_caterpillar____ | 猪儿虫 | 1 |
| kaleidoscope_cookery_oil___ | 油脂 | 1 |
| kaleidoscope_grilling_canola_seeds____ | 油菜籽 | 1 |
| kaleidoscope_grilling_sichuan_pepper___ | 花椒 | 2 |
| kaleidoscope_grilling_squid_tentacle____ | 鱿鱼须 | 2 |
| minecraft_bamboo___ | 竹子 | 6 |
| minecraft_charcoal___ | 木炭 | 1 |
| minecraft_cod | 生鳕鱼 | 3 |
| minecraft_egg___ | 鸡蛋 | 42 |
| minecraft_honey_bottle____ | 蜂蜜瓶 | 11 |
| minecraft_lily_pad___ | 睡莲 | 1 |
| minecraft_milk_bucket___ | 奶桶 | 23 |
| minecraft_pink_petals______ | 粉红色花簇 | 2 |
| minecraft_pufferfish | 河豚 | 2 |
| minecraft_salmon | 生鲑鱼 | 2 |
| minecraft_sugar_cane___ | 甘蔗 | 2 |
| minecraft_water_bucket___ | 水桶 | 21 |
| youkaisfeasts_crab___ | 螃蟹 | 2 |
| youkaisfeasts_pods___ | 豆荚 | 1 |
| youkaisfeasts_raw_lamprey_____ | 生八目鳗 | 2 |
| youkaisfeasts_tea_leaves____ | 生茶叶 | 2 |

## 材料可达闭包摘要

在全部工作方块和基础食材可用时，按当前分析口径可达配方 389 个，成品菜 280 个；这不是正式配方总数。

完整配方、输入候选、输出、匹配追踪和配方链请读取同目录的 `public/data/recipe-index.json`。

