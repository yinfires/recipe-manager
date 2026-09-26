import { useApp } from '../../contexts/AppContext';
import { EntityType, entityDataAttributes } from '../../utils/entityTarget';

interface ItemDisplayProps {
  icon: '📦' | '🏷️';
  name: string;
  id: string;
  count?: number;
  onClick?: (e?: React.MouseEvent) => void;
  entityType: Exclude<EntityType, 'recipe'>;
  entityId: string;
}

export function ItemDisplay({ icon, name, id, count, onClick, entityType, entityId }: ItemDisplayProps) {
  const { showItemIds } = useApp();

  return (
    <div
      className="item-display"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      {...entityDataAttributes({ type: entityType, id: entityId })}
    >
      <div className="item-main">
        {icon} {name} {count && count > 1 ? `×${count}` : ''}
      </div>
      {showItemIds && <div className="item-id">{id}</div>}
    </div>
  );
}
