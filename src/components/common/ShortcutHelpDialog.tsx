import { useEffect } from 'react';
import { useBackdropClick } from './useBackdropClick';

interface ShortcutHelpDialogProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'A', action: '添加获取配方', targets: '物品' },
  { key: 'R', action: '查看获取配方', targets: '物品、标签' },
  { key: 'U', action: '查看制作配方', targets: '物品、标签' },
  { key: 'T', action: '查看配方树', targets: '物品、标签' },
  { key: 'W', action: '编辑', targets: '物品、标签、配方' },
  { key: 'S', action: '查看标签 / 详情', targets: '物品 / 标签、配方' }
];

export function ShortcutHelpDialog({ onClose }: ShortcutHelpDialogProps) {
  const backdropClickHandlers = useBackdropClick(onClose);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-overlay" data-shortcut-help {...backdropClickHandlers}>
      <div
        className="dialog shortcut-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 id="shortcut-help-title">⌨️ 快捷键</h2>
          <button className="dialog-close" onClick={onClose} aria-label="关闭快捷键说明" autoFocus>×</button>
        </div>
        <div className="dialog-body">
          <p className="shortcut-help-intro">将鼠标移到物品、标签或配方上，再按对应按键。</p>
          <div className="shortcut-list">
            {shortcuts.map(shortcut => (
              <div className="shortcut-row" key={shortcut.key}>
                <kbd>{shortcut.key}</kbd>
                <span className="shortcut-action">{shortcut.action}</span>
                <span className="shortcut-targets">{shortcut.targets}</span>
              </div>
            ))}
          </div>
          <p className="shortcut-help-note">输入框或编辑控件聚焦时快捷键不会触发；不适用的按键会被忽略。</p>
        </div>
      </div>
    </div>
  );
}
