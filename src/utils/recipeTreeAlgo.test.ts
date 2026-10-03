import { describe, expect, it } from 'vitest';
import { AppData } from '../types';
import { RecipeTreeBuilder } from './recipeTreeAlgo';

const data: AppData = {
  items: {
    stick: { id: 'stick', name: '木棍', itemId: 'minecraft:stick', tags: [] },
    validDish: { id: 'validDish', name: '有效成品', itemId: 'example:valid_dish', tags: [] }
  },
  tags: {},
  recipes: {
    valid: {
      id: 'valid', name: '有效配方', workstation: '',
      inputs: [{ type: 'item', ref: 'stick', count: 1 }], attachments: [],
      outputs: [{ type: 'item', ref: 'validDish', count: 1 }]
    },
    dangling: {
      id: 'dangling', name: '已删除成品的残留配方', workstation: '',
      inputs: [{ type: 'item', ref: 'stick', count: 1 }], attachments: [],
      outputs: [{ type: 'item', ref: 'missingDish', count: 1 }]
    }
  },
  unlockPlan: { stages: [{ id: 's1', name: '阶段1' }], itemStages: {} }
};

describe('RecipeTreeBuilder', () => {
  it('忽略悬空槽位，避免把内部节点 ID 显示成实体', () => {
    const tree = RecipeTreeBuilder.build(data, [{ type: 'item', id: 'stick' }], ['usage']);

    expect(tree.nodes.map(node => node.entityId)).toContain('validDish');
    expect(tree.nodes.map(node => node.entityId)).not.toContain('missingDish');
    expect(tree.nodes.every(node => data.items[node.entityId] || data.tags[node.entityId])).toBe(true);
  });
});
