import { AppData, ViewMode } from '../types';
import { findRecipesForTarget } from './recipeRelations';
import { EntityTarget } from './entityTarget';

export type TreeNodeRole = 'input' | 'attachment' | 'output' | 'target' | 'tag-member';
export interface TreeNode {
  id: string; displayId: string; entityId: string; entityType: 'item' | 'tag';
  level: number; row: number; x: number; y: number; lane: number; branchId: string;
  role: TreeNodeRole; recipeId?: string; isTarget: boolean; isTagMember?: boolean;
}
export interface TreeEdge { id: string; from: string; to: string; relation: 'recipe' | 'tag-member'; recipeId?: string; branchId: string; }
interface BuildState { nodes: TreeNode[]; edges: TreeEdge[]; targets: Set<string>; expandedTags: Set<string>; sequence: number; branchSequence: number; }

export class RecipeTreeBuilder {
  static build(data: AppData, targets: EntityTarget[], modes: ViewMode[], expandedTags = new Set<string>(), includeAttachments = true): { nodes: TreeNode[]; edges: TreeEdge[] } {
    const uniqueTargets = targets.filter((target, index, list) => list.findIndex(t => t.type === target.type && t.id === target.id) === index);
    const state: BuildState = { nodes: [], edges: [], targets: new Set(uniqueTargets.map(t => `${t.type}:${t.id}`)), expandedTags, sequence: 0, branchSequence: 0 };
    uniqueTargets.forEach(target => {
      const root = this.addNode(state, target, 0, 'target', `root-${target.type}-${target.id}`, undefined, 0);
      modes.forEach(mode => this.expandEntity(data, state, target, mode, root, 0, new Set<string>(), includeAttachments));
    });
    this.layout(state);
    return { nodes: state.nodes, edges: state.edges };
  }

  private static addNode(state: BuildState, target: EntityTarget, level: number, role: TreeNodeRole, branchId: string, recipeId?: string, lane = 0, displayId?: string, isTagMember = false): TreeNode {
    const id = displayId || `node-${state.sequence++}-${target.type}-${target.id}`;
    const node: TreeNode = { id, displayId: id, entityId: target.id, entityType: target.type === 'tag' ? 'tag' : 'item', level, row: 0, x: 0, y: 0, lane, branchId, role, recipeId, isTarget: role === 'target' && state.targets.has(`${target.type}:${target.id}`), isTagMember };
    state.nodes.push(node); return node;
  }

  private static addEdge(state: BuildState, from: TreeNode, to: TreeNode, relation: TreeEdge['relation'], branchId: string, recipeId?: string) {
    const id = `edge-${from.id}-${to.id}`;
    if (!state.edges.some(edge => edge.id === id)) state.edges.push({ id, from: from.id, to: to.id, relation, recipeId, branchId });
  }

  private static expandEntity(data: AppData, state: BuildState, target: EntityTarget, mode: ViewMode, current: TreeNode, level: number, path: Set<string>, includeAttachments: boolean) {
    const pathKey = `${mode}:${target.type}:${target.id}`;
    if (path.has(pathKey)) return;
    const nextPath = new Set(path); nextPath.add(pathKey);
    findRecipesForTarget(data, target, mode, includeAttachments).forEach(recipe => {
      const branchId = `branch-${state.branchSequence++}`;
      const lane = state.branchSequence;
      const slots = mode === 'source' ? (includeAttachments ? [...recipe.inputs, ...recipe.attachments] : recipe.inputs) : recipe.outputs;
      const uniqueSlots = slots.filter((slot, index) => slots.findIndex(candidate =>
        candidate.type === slot.type && candidate.ref === slot.ref &&
        recipe.attachments.includes(candidate) === recipe.attachments.includes(slot)) === index);
      uniqueSlots.forEach((slot, slotIndex) => {
        const role: TreeNodeRole = mode === 'usage' ? 'output' : (recipe.attachments.includes(slot) ? 'attachment' : 'input');
        const entityTarget: EntityTarget = { type: slot.type, id: slot.ref };
        // Keep the dependency direction stable: ingredients are to the left of
        // the current product, while usage/output nodes are to the right.
        const nextLevel = level + (mode === 'source' ? -1 : 1);
        const slotNode = this.addNode(state, entityTarget, nextLevel, role, branchId, recipe.id, lane, `slot-${branchId}-${mode}-${slotIndex}`);
        this.addEdge(state, mode === 'source' ? slotNode : current, mode === 'source' ? current : slotNode, 'recipe', branchId, recipe.id);
        if (slot.type === 'tag') {
          const tag = data.tags[slot.ref];
          if (tag && state.expandedTags.has(tag.id)) tag.items.forEach((itemId, memberIndex) => {
            const member = this.addNode(state, { type: 'item', id: itemId }, slotNode.level, 'tag-member', branchId, recipe.id, lane, `tag-member-${slotNode.id}-${memberIndex}`, true);
            this.addEdge(state, mode === 'source' ? member : slotNode, mode === 'source' ? slotNode : member, 'tag-member', branchId);
          });
          return;
        }
        this.expandEntity(data, state, entityTarget, mode, slotNode, slotNode.level, nextPath, includeAttachments);
      });
    });
  }

  private static layout(state: BuildState) {
    const byId = new Map(state.nodes.map(node => [node.id, node]));
    const children = new Map<string, TreeNode[]>();
    const members = new Map<string, TreeNode[]>();
    for (const edge of state.edges) {
      const from = byId.get(edge.from)!;
      const to = byId.get(edge.to)!;
      const parent = edge.relation === 'tag-member'
        ? (from.isTagMember ? to : from)
        : (Math.abs(from.level) < Math.abs(to.level) ? from : to);
      const child = parent === from ? to : from;
      const map = edge.relation === 'tag-member' ? members : children;
      map.set(parent.id, [...(map.get(parent.id) || []), child]);
    }
    const ownHeight = (node: TreeNode) => 52 + (members.get(node.id)?.length || 0) * 60;
    const gap = (a: TreeNode, b: TreeNode) => a.branchId === b.branchId ? 24 : 48;
    const heights = new Map<string, number>();
    const span = (list: TreeNode[]): number => list.reduce((sum, node, i) =>
      sum + measure(node) + (i ? gap(list[i - 1], node) : 0), 0);
    const measure = (node: TreeNode): number => {
      if (!heights.has(node.id)) heights.set(node.id,
        Math.max(ownHeight(node), span(children.get(node.id) || [])));
      return heights.get(node.id)!;
    };
    const place = (node: TreeNode, center: number, offset = 0) => {
      node.x = node.level * 320 + offset;
      node.y = center - ownHeight(node) / 2;
      node.row = center;
      (members.get(node.id) || []).forEach((member, i) => {
        member.x = node.x; member.y = node.y + 60 * (i + 1); member.row = member.y;
      });
      const list = children.get(node.id) || [];
      // Nodes belonging to one recipe share a vertical center. Only separate
      // recipe groups receive a horizontal offset, keeping each recipe's
      // same-level inputs/outputs visually aligned.
      const groups = [...new Map(list.map(child => [child.branchId, child])).keys()]
        .map(branchId => list.filter(child => child.branchId === branchId));
      const groupGap = 48;
      const groupHeights = groups.map(group => span(group));
      const totalHeight = groupHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, groups.length - 1) * groupGap;
      let groupCursor = center - totalHeight / 2;
      groups.forEach((group, groupIndex) => {
        const groupHeight = groupHeights[groupIndex];
        let childCursor = groupCursor;
        group.forEach((child, i) => {
          if (i) childCursor += gap(group[i - 1], child);
          place(child, childCursor + measure(child) / 2, groups.length > 1 ? (groupIndex / (groups.length - 1) - 0.5) * 28 : 0);
          childCursor += measure(child);
        });
        groupCursor += groupHeight + groupGap;
      });
    };
    let cursor = 0;
    for (const root of state.nodes.filter(node => node.role === 'target')) {
      const list = children.get(root.id) || [];
      const left = list.filter(node => node.level < 0);
      const right = list.filter(node => node.level > 0);
      const height = Math.max(ownHeight(root), span(left), span(right));
      const center = cursor + height / 2;
      children.set(root.id, []);
      place(root, center);
      for (const side of [left, right]) {
        let y = center - span(side) / 2;
        side.forEach((child, i) => {
          if (i) y += gap(side[i - 1], child);
          place(child, y + measure(child) / 2);
          y += measure(child);
        });
      }
      cursor += height + 80;
    }
    if (state.nodes.length) {
      const top = Math.min(...state.nodes.map(node => node.y));
      const bottom = Math.max(...state.nodes.map(node => node.y + 52));
      state.nodes.forEach(node => { node.y -= (top + bottom) / 2; });
    }
  }
}
