import { match } from 'pinyin-pro';

/**
 * 匹配原文本、连续全拼或拼音首字母。
 * 多个候选字段中任意一个匹配即可，例如物品名称或 Minecraft ID。
 */
export function matchesSearch(query: string, ...candidates: Array<string | null | undefined>): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return candidates.some(candidate => {
    if (!candidate) {
      return false;
    }

    return candidate.toLowerCase().includes(normalizedQuery) ||
      match(candidate, normalizedQuery) !== null;
  });
}
