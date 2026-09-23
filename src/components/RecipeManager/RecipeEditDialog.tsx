import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Recipe, RecipeSlot } from '../../types';

interface RecipeEditDialogProps {
  recipe: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function RecipeEditDialog({ recipe, onSave, onDelete, onCancel }: RecipeEditDialogProps) {
  const { data } = useApp();
  const [formData, setFormData] = useState<Recipe>({
    id: recipe?.id || '',
    name: recipe?.name || '',
    workstation: recipe?.workstation || '',
    inputs: recipe?.inputs || [],
    attachments: recipe?.attachments || [],
    outputs: recipe?.outputs || []
  });

  useEffect(() => {
    if (!recipe) {
      setFormData({
        id: `recipe_${Date.now()}`,
        name: '',
        workstation: '',
        inputs: [],
        attachments: [],
        outputs: []
      });
    }
  }, [recipe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('配方名称不能为空');
      return;
    }

    if (!formData.workstation) {
      alert('请选择工作方块');
      return;
    }

    if (formData.outputs.length === 0) {
      alert('至少需要一个输出物品');
      return;
    }

    onSave(formData);
  };

  const addSlot = (slotType: 'inputs' | 'attachments' | 'outputs') => {
    setFormData({
      ...formData,
      [slotType]: [...formData[slotType], { type: 'item', ref: '', count: 1 }]
    });
  };

  const updateSlot = (slotType: 'inputs' | 'attachments' | 'outputs', index: number, slot: RecipeSlot) => {
    const newSlots = [...formData[slotType]];
    newSlots[index] = slot;
    setFormData({ ...formData, [slotType]: newSlots });
  };

  const removeSlot = (slotType: 'inputs' | 'attachments' | 'outputs', index: number) => {
    setFormData({
      ...formData,
      [slotType]: formData[slotType].filter((_, i) => i !== index)
    });
  };

  const renderSlotEditor = (slotType: 'inputs' | 'attachments' | 'outputs', label: string) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="slots-editor">
        {formData[slotType].map((slot, idx) => (
          <div key={idx} className="slot-editor-row">
            <select
              value={slot.type}
              onChange={e => updateSlot(slotType, idx, { ...slot, type: e.target.value as 'item' | 'tag', ref: '' })}
            >
              <option value="item">📦 物品</option>
              <option value="tag">🏷️ 标签</option>
            </select>

            <select
              value={slot.ref}
              onChange={e => updateSlot(slotType, idx, { ...slot, ref: e.target.value })}
            >
              <option value="">请选择...</option>
              {slot.type === 'item'
                ? Object.values(data.items).map(item => (
                    <option key={item.id} value={item.id}>
                      📦 {item.name}
                    </option>
                  ))
                : Object.values(data.tags).map(tag => (
                    <option key={tag.id} value={tag.id}>
                      🏷️ {tag.name}
                    </option>
                  ))}
            </select>

            <input
              type="number"
              min="1"
              value={slot.count}
              onChange={e => updateSlot(slotType, idx, { ...slot, count: parseInt(e.target.value) || 1 })}
              style={{ width: '60px' }}
            />

            <button type="button" className="btn-icon" onClick={() => removeSlot(slotType, idx)}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary btn-small" onClick={() => addSlot(slotType)}>
          + 添加槽位
        </button>
      </div>
    </div>
  );

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog dialog-large" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{recipe ? '编辑配方' : '新建配方'}</h2>
          <button className="dialog-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-group">
            <label>配方名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：金枪鱼寿司"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>工作方块 *</label>
            <select
              value={formData.workstation}
              onChange={e => setFormData({ ...formData, workstation: e.target.value })}
            >
              <option value="">请选择...</option>
              {Object.values(data.items).map(item => (
                <option key={item.id} value={item.id}>
                  📦 {item.name}
                </option>
              ))}
            </select>
          </div>

          {renderSlotEditor('inputs', '输入槽位')}
          {renderSlotEditor('attachments', '附加槽位（可选）')}
          {renderSlotEditor('outputs', '输出槽位 *')}

          <div className="dialog-footer">
            {onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                删除
              </button>
            )}
            <div className="dialog-footer-right">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                取消
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
