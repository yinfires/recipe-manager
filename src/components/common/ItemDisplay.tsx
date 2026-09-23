import { useApp } from '../../contexts/AppContext';

interface ItemDisplayProps {
  icon: '📦' | '🏷️';
  name: string;
  id: string;
  count?: number;
  onClick?: (e?: React.MouseEvent) => void;
}

export function ItemDisplay({ icon, name, id, count, onClick }: ItemDisplayProps) {
  const { showItemIds } = useApp();

  return (
    <div className="item-display" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="item-main">
        {icon} {name} {count && count > 1 ? `×${count}` : ''}
      </div>
      {showItemIds && <div className="item-id">{id}</div>}
    </div>
  );
}
