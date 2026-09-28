import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Item } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { matchesSearch } from '../../utils/searchMatcher';
import { useBackdropClick } from '../common/useBackdropClick';

interface ItemEditDialogProps {
  item: Item | null;
  onSave: (item: Item) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function ItemEditDialog({ item, onSave, onDelete, onCancel, onClose }: ItemEditDialogProps) {
  const { data } = useApp();
  const backdropClickHandlers = useBackdropClick(onCancel);
  const [formData, setFormData] = useState<Item>({
    id: item?.id || '',
    name: item?.name || '',
    itemId: item?.itemId || '',
    tags: item?.tags || [],
    createdAt: item?.createdAt || new Date().toISOString(),
    manualPrice: item?.manualPrice,
    autoPrice: item?.autoPrice,
    processingFee: item?.processingFee
  });
  const [manualPriceInput, setManualPriceInput] = useState(
    item?.manualPrice === undefined ? '' : String(item.manualPrice)
  );
  const [tagSearchText, setTagSearchText] = useState('');
  const isWorkstation = formData.tags.some(tagId => data.tags[tagId]?.name.trim() === '工作方块');

  const updateProcessingFee = (field: 'fixedFee' | 'rate' | 'cap', value: string) => {
    const next = value === '' ? undefined : Number(value);
    setFormData(prev => ({
      ...prev,
      processingFee: { ...prev.processingFee, [field]: field === 'rate' && next !== undefined ? next / 100 : next }
    }));
  };

  useEffect(() => {
    if (!item) {
      // 新建模式：生成唯一ID
      setFormData({
        id: `item_${Date.now()}`,
        name: '',
        itemId: '',
        tags: [],
        createdAt: new Date().toISOString(),
        manualPrice: undefined,
        autoPrice: undefined
      });
      setManualPriceInput('');
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const itemId = formData.itemId.trim();

    if (!formData.name.trim() || !itemId) {
      alert('名称和物品ID不能为空');
      return;
    }

    const hasDuplicateItemId = Object.values(data.items).some(existingItem =>
      existingItem.id !== formData.id && existingItem.itemId.trim() === itemId
    );
    if (hasDuplicateItemId) {
      alert('该物品ID已存在，无法重复添加');
      return;
    }

    const normalizedPriceText = manualPriceInput.trim();
    if (normalizedPriceText && !/^\d+(?:\.\d)?$/.test(normalizedPriceText)) {
      alert('手动覆盖价格必须是非负数，且最多保留 1 位小数');
      return;
    }

    const manualPrice = normalizedPriceText === '' ? undefined : Number(normalizedPriceText);
    if (manualPrice !== undefined && (!Number.isFinite(manualPrice) || manualPrice < 0)) {
      alert('手动覆盖价格必须是非负数，且最多保留 1 位小数');
      return;
    }

    const feeValues = [formData.processingFee?.fixedFee, formData.processingFee?.cap];
    const ratePercent = formData.processingFee?.rate === undefined ? undefined : formData.processingFee.rate * 100;
    if ([...feeValues, ratePercent].some(value => value !== undefined && (value < 0 || Math.round(value * 10) !== value * 10))) {
      alert('加工费、费率和上限必须是非负数，且最多保留 1 位小数');
      return;
    }

    const nextItem = {
      ...formData,
      itemId,
      createdAt: item ? formData.createdAt : new Date().toISOString()
    };
    if (manualPrice === undefined) {
      delete nextItem.manualPrice;
    } else {
      nextItem.manualPrice = manualPrice;
    }
    onSave(nextItem);
  };

  const handleToggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  // 使用 useMemo 缓存过滤结果，只在搜索文本或标签数据变化时重新计算
  const filteredTags = useMemo(() => {
    return Object.values(data.tags).filter(tag =>
      matchesSearch(tagSearchText, tag.name)
    );
  }, [data.tags, tagSearchText]);

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{item ? '编辑物品' : '新建物品'}</h2>
          <button type="button" className="dialog-close" onClick={onClose || onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-group">
            <label>显示名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：熟鳕鱼"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Minecraft ID *</label>
            <input
              type="text"
              value={formData.itemId}
              onChange={e => setFormData({ ...formData, itemId: e.target.value })}
              placeholder="例如：minecraft:cooked_cod"
            />
          </div>

          <div className="price-edit-grid">
            <div className="form-group">
              <label>自动计算价格</label>
              <input
                type="text"
                value={formData.autoPrice === undefined ? '无' : String(formData.autoPrice)}
                readOnly
                className="price-readonly-input"
                aria-label="自动计算价格"
              />
            </div>

            <div className="form-group">
              <label>手动覆盖价格</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={manualPriceInput}
                onChange={e => setManualPriceInput(e.target.value)}
                placeholder="留空则使用自动计算价格"
                aria-label="手动覆盖价格"
              />
            </div>
          </div>

          {isWorkstation && (
            <section className="processing-fee-section">
              <div className="processing-fee-heading">
                <h3>默认加工费</h3>
                <p>使用此工作方块的配方默认按整批收取，可在配方中覆盖。</p>
              </div>
              <div className="processing-fee-grid">
                <div className="form-group">
                  <label>固定费 / 批</label>
                  <input type="number" min="0" step="0.1" value={formData.processingFee?.fixedFee ?? ''}
                    onChange={e => updateProcessingFee('fixedFee', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>比例费率 (%)</label>
                  <input type="number" min="0" step="0.1" value={formData.processingFee?.rate === undefined ? '' : formData.processingFee.rate * 100}
                    onChange={e => updateProcessingFee('rate', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>加工费上限 / 批</label>
                  <input type="number" min="0" step="0.1" value={formData.processingFee?.cap ?? ''}
                    onChange={e => updateProcessingFee('cap', e.target.value)} placeholder="留空表示无限制" />
                </div>
              </div>
            </section>
          )}

          <div className="form-group">
            <label>所属标签 ({formData.tags.length} 个)</label>
            <SearchInput placeholder="搜索标签..." onSearch={setTagSearchText} />
            <div className="tag-selection">
              {filteredTags.map(tag => {
                const isChecked = formData.tags.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="tag-checkbox"
                    data-entity-type="tag"
                    data-entity-id={tag.id}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTag(tag.id)}
                    />
                    <span>🏷️ {tag.name}</span>
                  </label>
                );
              })}
              {filteredTags.length === 0 && tagSearchText && (
                <p className="hint-text">无匹配的标签</p>
              )}
              {Object.keys(data.tags).length === 0 && (
                <p className="hint-text">暂无标签，请先在标签管理中创建</p>
              )}
            </div>
          </div>

          <div className="dialog-footer">
            {onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                删除
              </button>
            )}
            <div className="dialog-footer-right">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                返回
              </button>
              <button type="submit" className="btn-primary">
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
