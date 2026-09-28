# 数据存储、迁移与发布

## 唯一正式数据源

正式数据位于 `public/data/recipe-manager.json`，包含 `schemaVersion`、`updatedAt` 和完整 `AppData`。生产构建会将其复制到 `dist/data/recipe-manager.json`。

## 本地编辑模式

`npm run dev` 启动的 Vite 服务暴露 `/api/data/status`、`GET /api/data` 和 `PUT /api/data`。前端的所有编辑共用仓库 JSON，而不是浏览器各自的 LocalStorage。

保存采用同目录临时文件加原子替换。首次保存和每日首次保存前，旧文件会复制到 `.data-backups/`；该目录不提交到 Git。页面提供自动防抖保存、立即保存、重试和下载当前数据。

## 生产模式

生产静态站从 `./data/recipe-manager.json` 读取，只读展示；新建、编辑、删除与 URL 导入均不可用。推送仓库并重新部署后，其他访问者才会看到新快照。

## 旧数据迁移

本地编辑模式会检查旧键 `recipe_manager_data`。如果旧浏览器数据和文件数据同时存在，迁移弹窗显示双方数量，先通过下载保存双方备份，再由用户明确选择是否以浏览器数据覆盖文件。迁移不会删除旧 LocalStorage。
