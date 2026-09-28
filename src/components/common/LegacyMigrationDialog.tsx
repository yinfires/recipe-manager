import { useApp } from '../../contexts/AppContext';

function counts(data: { items: object; tags: object; recipes: object }) {
  return `${Object.keys(data.items).length} 个物品、${Object.keys(data.tags).length} 个标签、${Object.keys(data.recipes).length} 个配方`;
}

export function LegacyMigrationDialog() {
  const { data, legacyData, migrateLegacyData, keepFileData } = useApp();
  if (!legacyData) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog migration-dialog" role="dialog" aria-modal="true" aria-labelledby="migration-title">
        <div className="dialog-header"><h2 id="migration-title">发现浏览器旧数据</h2></div>
        <div className="dialog-body">
          <p>仓库文件：{counts(data)}</p>
          <p>当前浏览器旧数据：{counts(legacyData)}</p>
          <p className="hint-text">选择前会下载双方备份；旧浏览器数据不会被删除。</p>
          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={keepFileData}>保留仓库文件</button>
            <button type="button" className="btn-primary" onClick={() => void migrateLegacyData()}>用浏览器数据覆盖文件</button>
          </div>
        </div>
      </div>
    </div>
  );
}
