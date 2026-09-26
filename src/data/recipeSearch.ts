import { Recipe, AppData, RecipeSlot } from '../types';
import { matchesSearch } from '../utils/searchMatcher';

export interface RecipeSearchOptions {
  text?: string;           // 配方名称搜索
  workstation?: string;    // 工作方块 ID
  input?: string;          // 输入物品/标签 ID
  attachment?: string;     // 附加物品/标签 ID
  output?: string;         // 输出物品/标签 ID
}

export class RecipeSearch {
  static search(data: AppData, options: RecipeSearchOptions): Recipe[] {
    let results = Object.values(data.recipes);

    // 按名称搜索
    if (options.text) {
      results = results.filter(r => matchesSearch(options.text!, r.name));
    }

    // 按工作方块搜索
    if (options.workstation) {
      results = results.filter(r => r.workstation === options.workstation);
    }

    // 按输入搜索
    if (options.input) {
      results = results.filter(r =>
        r.inputs.some(slot => this.matchesSlot(slot, options.input!, data))
      );
    }

    // 按附加搜索
    if (options.attachment) {
      results = results.filter(r =>
        r.attachments.some(slot => this.matchesSlot(slot, options.attachment!, data))
      );
    }

    // 按输出搜索
    if (options.output) {
      results = results.filter(r =>
        r.outputs.some(slot => this.matchesSlot(slot, options.output!, data))
      );
    }

    return results;
  }

  private static matchesSlot(slot: RecipeSlot, targetId: string, data: AppData): boolean {
    if (slot.type === 'item') {
      return slot.ref === targetId;
    } else {
      // 标签匹配：检查标签是否包含目标物品
      const tag = data.tags[slot.ref];
      return tag?.items.includes(targetId) || false;
    }
  }
}
