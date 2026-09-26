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
      slots.forEach((slot, slotIndex) => {
        const role: TreeNodeRole = mode === 'usage' ? 'output' : (recipe.attachments.includes(slot) ? 'attachment' : 'input');
        const entityTarget: EntityTarget = { type: slot.type, id: slot.ref };
        const slotNode = this.addNode(state, entityTarget, level + (mode === 'source' ? 1 : -1), role, branchId, recipe.id, lane, `slot-${branchId}-${mode}-${slotIndex}`);
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
    const spacing = 92;
    const branchGap = 260;
    const laneRows = new Map<number, number>();
    const nodes = [...state.nodes].sort((a, b) => a.level - b.level || a.lane - b.lane || a.id.localeCompare(b.id));
    nodes.forEach(node => {
      const row = laneRows.get(node.lane) || 0;
      node.row = row; node.x = node.level * 300; node.y = row * spacing + node.lane * branchGap;
      laneRows.set(node.lane, row + 1);
    });
    state.edges.filter(edge => edge.relation === 'tag-member').forEach(edge => {
      const tag = state.nodes.find(node => node.id === edge.from && !node.isTagMember) || state.nodes.find(node => node.id === edge.to && !node.isTagMember);
      const member = state.nodes.find(node => node.id === edge.from && node.isTagMember) || state.nodes.find(node => node.id === edge.to && node.isTagMember);
      if (!tag || !member) return;
      const members = state.edges.filter(candidate => candidate.relation === 'tag-member' && (candidate.from === tag.id || candidate.to === tag.id)).map(candidate => state.nodes.find(node => node.id === (candidate.from === tag.id ? candidate.to : candidate.from))).filter((node): node is TreeNode => !!node);
      const index = members.findIndex(node => node.id === member.id);
      member.x = tag.x; member.y = tag.y + 74 + index * 58; member.row = tag.row + index + 1;
      laneRows.set(tag.lane, Math.max(laneRows.get(tag.lane) || 0, member.row + 1));
    });
    state.nodes.filter(node => node.entityType === 'tag' && !node.isTagMember).forEach(tag => {
      const memberCount = state.edges.filter(edge => edge.relation === 'tag-member' && (edge.from === tag.id || edge.to === tag.id)).length;
      if (!memberCount) return;
      const occupiedHeight = memberCount * 58 + 28;
      state.nodes.forEach(node => {
        if (node.id !== tag.id && !node.isTagMember && node.lane === tag.lane && node.y > tag.y) node.y += occupiedHeight;
      });
    });
  }
}
