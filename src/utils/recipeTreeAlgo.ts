import { AppData, Recipe, ViewMode } from '../types';

export interface TreeNode {
  id: string;
  level: number;
  branchIndex: number;
}

export class RecipeTreeBuilder {
  static build(data: AppData, targetIds: string[], mode: ViewMode): { nodes: TreeNode[]; edges: Array<{ from: string; to: string }> } {
    const nodes: TreeNode[] = [];
    const edges: Array<{ from: string; to: string }> = [];
    const visited = new Set<string>();

    targetIds.forEach((targetId, idx) => {
      this.traverse(data, targetId, 0, idx, mode, visited, nodes, edges);
    });

    return { nodes, edges };
  }

  private static traverse(
    data: AppData,
    itemId: string,
    level: number,
    branchIndex: number,
    mode: ViewMode,
    visited: Set<string>,
    nodes: TreeNode[],
    edges: Array<{ from: string; to: string }>
  ): void {
    const visitKey = `${itemId}-${level}-${branchIndex}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);

    nodes.push({ id: itemId, level, branchIndex });

    const recipes = mode === 'source'
      ? this.findRecipesProducing(data, itemId)
      : this.findRecipesUsing(data, itemId);

    recipes.forEach((recipe, recipeIdx) => {
      const slots = mode === 'source' ? [...recipe.inputs, ...recipe.attachments] : recipe.outputs;
      slots.forEach((slot, slotIdx) => {
        const refId = slot.ref;
        const newBranchIndex = branchIndex * 100 + recipeIdx * 10 + slotIdx;

        if (mode === 'source') {
          edges.push({ from: refId, to: itemId });
        } else {
          edges.push({ from: itemId, to: refId });
        }

        this.traverse(data, refId, level + 1, newBranchIndex, mode, visited, nodes, edges);
      });
    });
  }

  private static findRecipesProducing(data: AppData, itemId: string): Recipe[] {
    return Object.values(data.recipes).filter(r =>
      r.outputs.some(slot => this.matchesSlot(slot, itemId, data))
    );
  }

  private static findRecipesUsing(data: AppData, itemId: string): Recipe[] {
    return Object.values(data.recipes).filter(r =>
      [...r.inputs, ...r.attachments].some(slot => this.matchesSlot(slot, itemId, data))
    );
  }

  private static matchesSlot(slot: { type: 'item' | 'tag'; ref: string }, itemId: string, data: AppData): boolean {
    if (slot.type === 'item') {
      return slot.ref === itemId;
    } else {
      // 标签匹配
      const tag = data.tags[slot.ref];
      return tag?.items.includes(itemId) || false;
    }
  }
}
