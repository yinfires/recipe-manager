import { AppData, Recipe, ViewMode } from '../types';

export interface TreeNode {
  id: string;
  level: number;
  row: number;
}

export class RecipeTreeBuilder {
  static build(data: AppData, targetIds: string[], modes: ViewMode[], expandedTags: Set<string> = new Set()): { nodes: TreeNode[]; edges: Array<{ from: string; to: string }> } {
    const nodes: TreeNode[] = [];
    const edges: Array<{ from: string; to: string }> = [];
    const visited = new Set<string>();
    const nodePositions = new Map<string, { level: number; rows: Set<number> }>();

    targetIds.forEach((targetId) => {
      modes.forEach(mode => {
        this.traverse(data, targetId, 0, mode, visited, nodes, edges, nodePositions, expandedTags);
      });
    });

    const finalNodes: TreeNode[] = [];
    const levels = this.calculateLevels(nodePositions, edges);

    // 按配方边方向分组节点：原材料在左，成品在右
    const levelGroups = new Map<number, string[]>();
    nodePositions.forEach((pos, id) => {
      const level = levels.get(id) ?? pos.level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(id);
    });

    // 为每层分配行位置
    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((id, index) => {
        finalNodes.push({ id, level, row: index });
      });
    });

    return { nodes: finalNodes, edges };
  }

  private static traverse(
    data: AppData,
    itemId: string,
    level: number,
    mode: ViewMode,
    visited: Set<string>,
    nodes: TreeNode[],
    edges: Array<{ from: string; to: string }>,
    nodePositions: Map<string, { level: number; rows: Set<number> }>,
    expandedTags: Set<string>
  ): void {
    const visitKey = `${itemId}-${mode}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);

    // 记录节点位置
    if (!nodePositions.has(itemId)) {
      nodePositions.set(itemId, { level, rows: new Set() });
    } else {
      const existing = nodePositions.get(itemId)!;
      existing.level = Math.min(existing.level, level);
    }

    const recipes = mode === 'source'
      ? this.findRecipesProducing(data, itemId)
      : this.findRecipesUsing(data, itemId);

    recipes.forEach((recipe) => {
      // source模式：看输入和附加槽位；usage模式：看输出槽位
      const slots = mode === 'source' ? [...recipe.inputs, ...recipe.attachments] : recipe.outputs;
      slots.forEach((slot) => {
        // 如果是标签类型
        if (slot.type === 'tag') {
          const tag = data.tags[slot.ref];
          if (!tag) return;

          // 标签节点总是显示
          const tagEdge = mode === 'source'
            ? { from: slot.ref, to: itemId }
            : { from: itemId, to: slot.ref };

          if (!edges.some(e => e.from === tagEdge.from && e.to === tagEdge.to)) {
            edges.push(tagEdge);
          }

          // 记录标签节点
          if (!nodePositions.has(slot.ref)) {
            nodePositions.set(slot.ref, { level: level + 1, rows: new Set() });
          }

          // 如果标签被展开，额外显示标签内的物品
          if (expandedTags.has(slot.ref)) {
            tag.items.forEach(itemInTag => {
              const edge = mode === 'source'
                ? { from: itemInTag, to: slot.ref }
                : { from: slot.ref, to: itemInTag };

              if (!edges.some(e => e.from === edge.from && e.to === edge.to)) {
                edges.push(edge);
              }

              this.traverse(data, itemInTag, level + 2, mode, visited, nodes, edges, nodePositions, expandedTags);
            });
          }
          return;
        }

        // 处理普通物品
        const refId = slot.ref;
        const edge = mode === 'source'
          ? { from: refId, to: itemId }
          : { from: itemId, to: refId };

        if (!edges.some(e => e.from === edge.from && e.to === edge.to)) {
          edges.push(edge);
        }

        this.traverse(data, refId, level + 1, mode, visited, nodes, edges, nodePositions, expandedTags);
      });
    });
  }

  private static calculateLevels(
    nodePositions: Map<string, { level: number; rows: Set<number> }>,
    edges: Array<{ from: string; to: string }>
  ): Map<string, number> {
    const levels = new Map<string, number>();
    const indegrees = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    nodePositions.forEach((_position, id) => {
      levels.set(id, 0);
      indegrees.set(id, 0);
      outgoing.set(id, []);
    });

    edges.forEach(({ from, to }) => {
      if (!indegrees.has(from) || !indegrees.has(to) || from === to) return;

      const targets = outgoing.get(from)!;
      if (targets.includes(to)) return;

      targets.push(to);
      indegrees.set(to, indegrees.get(to)! + 1);
    });

    const queue = Array.from(indegrees.entries())
      .filter(([, indegree]) => indegree === 0)
      .map(([id]) => id);
    const processed = new Set<string>();

    while (queue.length > 0) {
      const id = queue.shift()!;
      processed.add(id);

      outgoing.get(id)!.forEach(targetId => {
        levels.set(targetId, Math.max(levels.get(targetId)!, levels.get(id)! + 1));
        const nextIndegree = indegrees.get(targetId)! - 1;
        indegrees.set(targetId, nextIndegree);
        if (nextIndegree === 0) {
          queue.push(targetId);
        }
      });
    }

    // 循环配方无法同时满足所有边的方向，保留其遍历层级作为稳定回退。
    nodePositions.forEach((position, id) => {
      if (!processed.has(id)) {
        levels.set(id, position.level);
      }
    });

    return levels;
  }

  private static findRecipesProducing(data: AppData, itemId: string): Recipe[] {
    const itemTags = data.items[itemId]?.tags || [];
    const allTags = this.getAllParentTags(data, itemTags);

    return Object.values(data.recipes).filter(r =>
      r.outputs.some(slot =>
        (slot.type === 'item' && slot.ref === itemId) ||
        (slot.type === 'tag' && allTags.includes(slot.ref))
      )
    );
  }

  private static findRecipesUsing(data: AppData, itemId: string): Recipe[] {
    const itemTags = data.items[itemId]?.tags || [];
    const allTags = this.getAllParentTags(data, itemTags);

    return Object.values(data.recipes).filter(r =>
      [...r.inputs, ...r.attachments].some(slot =>
        (slot.type === 'item' && slot.ref === itemId) ||
        (slot.type === 'tag' && allTags.includes(slot.ref))
      )
    );
  }

  private static getAllParentTags(data: AppData, tagIds: string[]): string[] {
    const result = new Set<string>(tagIds);
    const toProcess = [...tagIds];

    while (toProcess.length > 0) {
      const currentTagId = toProcess.pop()!;
      const tag = data.tags[currentTagId];
      if (tag?.parentTags) {
        tag.parentTags.forEach(parentId => {
          if (!result.has(parentId)) {
            result.add(parentId);
            toProcess.push(parentId);
          }
        });
      }
    }

    return Array.from(result);
  }
}
