export type EntityType = 'item' | 'tag' | 'recipe';

export interface EntityTarget {
  type: EntityType;
  id: string;
}

export function entityDataAttributes(target: EntityTarget) {
  return {
    'data-entity-type': target.type,
    'data-entity-id': target.id
  };
}

export function getEntityTarget(element: Element | null): EntityTarget | null {
  const entityElement = element?.closest<HTMLElement>('[data-entity-type][data-entity-id]');
  const type = entityElement?.dataset.entityType;
  const id = entityElement?.dataset.entityId;

  if (!id || (type !== 'item' && type !== 'tag' && type !== 'recipe')) return null;
  return { type, id };
}
