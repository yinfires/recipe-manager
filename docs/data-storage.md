# 数据存储、迁移与发布

## 唯一正式数据源

正式数据位于 `public/data/recipe-manager.json`，包含 `schemaVersion`、`updatedAt` 和完整 `AppData`。生产构建会将其复制到 `dist/data/recipe-manager.json`。当前 schema v5 保留物品 `createdAt`，并将 `unlockPlan` 简化为单套人工剧情解锁阶段和物品首次解锁阶段；工作方块也作为物品记录，配方不保存人工解锁状态。

## 本地编辑模式

`npm run dev` 启动的 Vite 服务暴露 `/api/data/status`、`GET /api/data` 和 `PUT /api/data`。前端的所有编辑共用仓库 JSON，而不是浏览器各自的 LocalStorage。

保存采用同目录临时文件加原子替换。首次保存和每日首次保存前，旧文件会复制到 `.data-backups/`；该目录不提交到 Git。页面提供自动防抖保存、立即保存、重试和下载当前数据。

每次本地 API 成功保存正式 JSON 后，会自动重建 `public/data/recipe-index.json` 和 `docs/recipe-index.md`。这两个文件是只读派生索引，不参与数据加载或编辑；构建时也会重建。使用 `npm run check-recipe-index` 可检查派生文件是否与正式 JSON 一致。AI 可直接读取 JSON，或用 `npm run query-recipe-index -- --workstations <逗号分隔ID> --ingredients <逗号分隔ID>` 试算；参数省略时使用全部登记项。此试算不记录存档进度或人工覆盖。


## 生产模式

生产静态站从 Vite 基础路径下的 `data/recipe-manager.json` 读取，只读展示；生产构建不会请求本地开发 API。新建、编辑、删除与 URL 导入均不可用，公开 JSON 可以读取但没有任何远程写入接口。

## GitHub Pages 发布

- 公开地址为 `https://yinfires.github.io/recipe-manager/`，源码和完整数据快照均随公开仓库发布。
- 推送 `master` 后，`.github/workflows/deploy-pages.yml` 使用 Node.js 20 执行 `npm ci`、`npm test` 和 `npm run build`，只将 `dist/` 上传到 GitHub Pages。
- 首次发布需在仓库 `Settings → Pages` 中选择 `GitHub Actions` 作为发布来源。后续推送会自动更新，测试或构建失败不会覆盖上一版网站。
- 回滚时恢复或回退对应 Git 提交并重新推送，公开站随新的成功部署恢复。
- Vite 使用相对基础路径，静态资源和数据文件可在 `/recipe-manager/` 项目子路径下加载。

推送仓库并完成成功部署后，其他访问者才能看到新的数据快照。

## 旧数据迁移

本地编辑模式会检查旧键 `recipe_manager_data`。如果旧浏览器数据和文件数据同时存在，迁移弹窗显示双方数量，先通过下载保存双方备份，再由用户明确选择是否以浏览器数据覆盖文件。迁移不会删除旧 LocalStorage。

schema v2 及更早数据没有物品创建时间。加载时会以数据快照 `updatedAt` 为末项时间锚点，按照物品在 JSON 中的原有顺序，以一秒间隔回填稳定的近似 `createdAt`；该值用于保留旧数据的相对顺序，并不代表真实历史创建时间。正式数据升级前的快照保存在本地 `.data-backups/`。

schema v3 及更早数据没有解锁规划。加载时会创建唯一的“阶段1”，所有物品保持未分配；不会根据任务文档自动分配阶段。schema v4 数据加载时会保留有效的物品阶段并忽略旧 `recipeStages`，因为配方不再人工分配。

URL 导入会保留合法的 `createdAt`；缺失或非法时使用导入时刻补齐，同批物品通过毫秒偏移维持稳定先后顺序。物品排序偏好和搜索、标签筛选分别使用版本化 LocalStorage 键单独保存，不进入正式 JSON。
