import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Recipe, RecipeSlot } from '../../types';
import { ItemSelector } from '../common/ItemSelector';

interface RecipeEditDialogProps {
  recipe: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function RecipeEditDialog({ recipe, onSave, onDelete, onCancel, onClose }: RecipeEditDialogProps) {
  const { data } = useApp();
  const workstationTag = Object.values(data.tags).find(tag => tag.name === '工作方块');
  const workstationItemIds = workstationTag?.items || [];
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

    if (!formData.workstation) {
      alert('请选择工作方块');
      return;
    }

    if (formData.outputs.length === 0) {
      alert('至少需要一个输出物品');
      return;
    }

    // 自动生成配方名称：使用第一个输出物品的名称
    let autoName = formData.name;
    if (!autoName.trim() && formData.outputs.length > 0) {
      const firstOutput = formData.outputs[0];
      if (firstOutput.type === 'item' && firstOutput.ref) {
        const item = data.items[firstOutput.ref];
        autoName = item?.name || '';
      } else if (firstOutput.type === 'tag' && firstOutput.ref) {
        const tag = data.tags[firstOutput.ref];
        autoName = tag?.name || '';
      }
    }

    onSave({ ...formData, name: autoName || '未命名配方' });
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
            <ItemSelector
              value={{ type: slot.type, ref: slot.ref }}
              onChange={(value) => {
                if (value) {
                  updateSlot(slotType, idx, { ...slot, type: value.type, ref: value.ref });
                }
              }}
              placeholder="选择物品或标签"
            />

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
          <button type="button" className="dialog-close" onClick={onClose || onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-group">
            <label>配方名称（可选，留空自动使用第一个输出物品名）</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="留空则自动命名"
            />
          </div>

          <div className="form-group">
            <label>工作方块 *</label>
            <ItemSelector
              value={formData.workstation ? { type: 'item', ref: formData.workstation } : undefined}
              onChange={(value) => setFormData({ ...formData, workstation: value?.ref || '' })}
              placeholder="选择工作方块"
              allowTags={false}
              allowedItemIds={workstationItemIds}
            />
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
