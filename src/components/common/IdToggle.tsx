import { useApp } from '../../contexts/AppContext';

interface IdToggleProps {
  className?: string;
}

export function IdToggle({ className }: IdToggleProps) {
  const { showItemIds, setShowItemIds } = useApp();

  return (
    <label className={`id-toggle ${className || ''}`}>
      <span>显示ID:</span>
      <input
        type="checkbox"
        checked={showItemIds}
        onChange={(e) => setShowItemIds(e.target.checked)}
      />
    </label>
  );
}
