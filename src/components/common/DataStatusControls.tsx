import { useApp } from '../../contexts/AppContext';

const saveStateLabels = {
  loading: '正在读取数据',
  saving: '正在保存',
  saved: '已保存到文件',
  error: '保存失败',
  readonly: '公开只读快照'
} as const;

export function DataStatusControls() {
  const { saveState, isEditable, saveNow, downloadBackup } = useApp();
  return (
    <div className="data-status-controls">
      <span className={`data-status data-status-${saveState}`}>{saveStateLabels[saveState]}</span>
      {isEditable && (
        <>
          <button type="button" className="header-action-button" onClick={() => void saveNow()}>立即保存</button>
          <button type="button" className="header-action-button" onClick={downloadBackup}>下载备份</button>
        </>
      )}
    </div>
  );
}
