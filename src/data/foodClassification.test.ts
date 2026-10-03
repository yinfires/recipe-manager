import { describe, expect, it } from 'vitest';
import persistedJson from '../../public/data/recipe-manager.json';
import { PersistedData } from '../types';

const persisted = persistedJson as PersistedData;
const managedNames = [
  '主食', '饮品', '点心', '甜', '辣', '酸', '鲜', '清淡', '浓郁', '凉爽',
  '甘', '辛', '苦', '肉食', '水产', '素食', '菌类', '水果', '奶香', '米面',
  '汤羹', '茶饮', '烧烤', '油炸', '生食', '烘焙', '酒类'
];

function tag(name: string) {
  const matches = Object.values(persisted.data.tags).filter(value => value.name === name);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function item(name: string) {
  const matches = Object.values(persisted.data.items).filter(value => value.name === name);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function namesFor(name: string) {
  return item(name).tags.map(tagId => persisted.data.tags[tagId]?.name).filter(Boolean);
}

describe('成品菜分类正式数据', () => {
  it('为每个现存成品菜设置恰好一个主类', () => {
    const finished = tag('成品菜');
    expect(finished.items.length).toBeGreaterThan(0);
    for (const itemId of finished.items) {
      const current = persisted.data.items[itemId];
      expect(current).toBeDefined();
      const mains = current.tags.map(tagId => persisted.data.tags[tagId]?.name)
        .filter(name => ['主食', '饮品', '点心'].includes(name));
      expect(mains, current.name).toHaveLength(1);
    }
  });

  it('保持所有分类标签的双向引用一致', () => {
    for (const name of managedNames) {
      const currentTag = tag(name);
      for (const itemId of currentTag.items) {
        expect(persisted.data.items[itemId], `${name}: ${itemId}`).toBeDefined();
        expect(persisted.data.items[itemId].tags).toContain(currentTag.id);
        expect(tag('成品菜').items).toContain(itemId);
      }
    }
  });

  it('保留明确的边界分类', () => {
    expect(namesFor('炸春卷')).toEqual(expect.arrayContaining(['主食', '油炸']));
    expect(namesFor('炸春卷')).not.toContain('点心');
    expect(namesFor('炸春卷')).not.toContain('甜');
    expect(namesFor('柠汁腌鱼')).toEqual(expect.arrayContaining(['主食', '水产', '酸']));
    expect(namesFor('柠汁腌鱼')).not.toContain('生食');
    expect(namesFor('柠汁腌鱼')).not.toContain('水果');
    expect(namesFor('酸柠腌虾')).not.toContain('生食');
    expect(namesFor('酸柠腌虾')).not.toContain('水果');
    expect(namesFor('鱼生拼盘')).toContain('生食');
    expect(namesFor('鲑鱼寿司')).toEqual(expect.arrayContaining(['主食', '水产', '米面', '生食']));
    expect(namesFor('港式丝袜奶茶')).toEqual(expect.arrayContaining(['饮品', '茶饮', '奶香']));
    for (const name of ['苹果汁', '葡萄汁', '桃子汁', '梨汁', '浆果青柠汁', '粉红青柠汁', '港式丝袜奶茶']) {
      expect(namesFor(name)).toContain('甜');
    }
    expect(namesFor('铁观音')).toEqual(expect.arrayContaining(['饮品', '茶饮', '苦']));
    expect(namesFor('臭豆腐')).toEqual(expect.arrayContaining(['主食', '素食', '菌类', '辣']));
    expect(namesFor('臭豆腐')).not.toEqual(expect.arrayContaining(['点心', '水产']));
    expect(namesFor('法式薯条')).toEqual(expect.arrayContaining(['主食', '油炸']));
    expect(namesFor('法式薯条')).not.toEqual(expect.arrayContaining(['点心', '米面']));
    for (const name of ['烤红薯', '烤马铃薯']) {
      expect(namesFor(name)).toContain('主食');
      expect(namesFor(name)).not.toEqual(expect.arrayContaining(['点心', '米面']));
    }
    for (const name of ['竹筒水羊羹', '七色羊羹', '幻昙花羹']) {
      expect(namesFor(name)).toContain('点心');
      expect(namesFor(name)).not.toEqual(expect.arrayContaining(['汤羹', '米面', '肉食', '素食']));
    }
    for (const name of ['面包', '牛角面包', '脆皮面包', '烘焙师面包', '法棍面包', '吐司面包', '辫子面包', '小圆面包']) {
      expect(namesFor(name)).toEqual(expect.arrayContaining(['点心', '烘焙']));
      expect(namesFor(name)).not.toEqual(expect.arrayContaining(['肉食', '素食', '米面']));
    }
    for (const name of ['草莓釉面饼干', '甜浆果釉面饼干', '巧克力釉面饼干']) {
      expect(namesFor(name)).not.toEqual(expect.arrayContaining(['肉食', '素食', '米面']));
    }
    for (const name of ['凉拌折耳根', '冷切火腿片', '素手卷', '猪肉饭团', '八云豆包饭']) {
      expect(namesFor(name)).toContain('主食');
      expect(namesFor(name)).not.toContain('点心');
    }
  });

  it('不再保留已删除的鲶鱼烤串', () => {
    expect(Object.values(persisted.data.items).some(value => value.name === '鲶鱼烤串')).toBe(false);
    expect(Object.values(persisted.data.recipes).some(value => value.name === '鲶鱼烤串')).toBe(false);
    expect(Object.values(persisted.data.tags).some(value => value.items.some(itemId => !persisted.data.items[itemId]))).toBe(false);
  });

  it('所有配方槽位都引用现存物品或标签', () => {
    for (const recipe of Object.values(persisted.data.recipes)) {
      for (const [field, slots] of Object.entries({
        inputs: recipe.inputs,
        attachments: recipe.attachments,
        outputs: recipe.outputs
      })) {
        for (const slot of slots) {
          const target = slot.type === 'item'
            ? persisted.data.items[slot.ref]
            : persisted.data.tags[slot.ref];
          expect(target, `${recipe.name} (${recipe.id}) ${field}: ${slot.type}:${slot.ref}`).toBeDefined();
        }
      }
    }
  });
});
