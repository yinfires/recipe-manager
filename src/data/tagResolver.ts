import { AppData } from '../types';

export class TagResolver {
  // 添加物品到标签时，同步到所有父标签
  static addItemToTag(data: AppData, tagId: string, itemId: string): AppData {
    const tag = data.tags[tagId];
    if (!tag || tag.items.includes(itemId)) return data;

    const newData = { ...data };
    newData.tags = { ...newData.tags };
    newData.tags[tagId] = { ...tag, items: [...tag.items, itemId] };

    // 递归添加到父标签
    tag.parentTags.forEach(parentId => {
      newData.tags = TagResolver.addItemToTag(newData, parentId, itemId).tags;
    });

    return newData;
  }

  // 从标签删除物品时，同步从所有父标签删除
  static removeItemFromTag(data: AppData, tagId: string, itemId: string): AppData {
    const tag = data.tags[tagId];
    if (!tag || !tag.items.includes(itemId)) return data;

    const newData = { ...data };
    newData.tags = { ...newData.tags };
    newData.tags[tagId] = { ...tag, items: tag.items.filter(id => id !== itemId) };

    // 递归从父标签删除
    tag.parentTags.forEach(parentId => {
      newData.tags = TagResolver.removeItemFromTag(newData, parentId, itemId).tags;
    });

    return newData;
  }

  // 添加子标签时，建立双向关系并同步物品
  static addChildTag(data: AppData, parentId: string, childId: string): AppData {
    const parent = data.tags[parentId];
    const child = data.tags[childId];
    if (!parent || !child || parent.childTags.includes(childId)) return data;

    let newData = { ...data };
    newData.tags = { ...newData.tags };

    // 建立父子关系
    newData.tags[parentId] = {
      ...parent,
      childTags: [...parent.childTags, childId]
    };
    newData.tags[childId] = {
      ...child,
      parentTags: [...child.parentTags, parentId]
    };

    // 同步子标签的所有物品到父标签
    child.items.forEach(itemId => {
      newData = TagResolver.addItemToTag(newData, parentId, itemId);
    });

    return newData;
  }

  // 移除子标签关系
  static removeChildTag(data: AppData, parentId: string, childId: string): AppData {
    const parent = data.tags[parentId];
    const child = data.tags[childId];
    if (!parent || !child) return data;

    const newData = { ...data };
    newData.tags = { ...newData.tags };

    // 移除父子关系
    newData.tags[parentId] = {
      ...parent,
      childTags: parent.childTags.filter(id => id !== childId)
    };
    newData.tags[childId] = {
      ...child,
      parentTags: child.parentTags.filter(id => id !== parentId)
    };

    // 从父标签移除子标签的所有物品（如果没有其他子标签包含）
    child.items.forEach(itemId => {
      const shouldRemove = !parent.childTags
        .filter(cid => cid !== childId)
        .some(cid => newData.tags[cid]?.items.includes(itemId));

      if (shouldRemove) {
        newData.tags = TagResolver.removeItemFromTag(newData, parentId, itemId).tags;
      }
    });

    return newData;
  }
}
