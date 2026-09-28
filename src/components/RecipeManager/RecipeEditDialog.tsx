import { CSSProperties, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../contexts/AppContext';
import { Recipe, RecipeSlot } from '../../types';
import { ItemSelector } from '../common/ItemSelector';
import { useBackdropClick } from '../common/useBackdropClick';
import { isWorkstationItem, resolveProcessingFee } from '../../utils/processingFees';

interface RecipeEditDialogProps {
  recipe: Recipe | null;
  initialOutputs?: RecipeSlot[];
  onSave: (recipe: Recipe) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function RecipeEditDialog({ recipe, initialOutputs = [], onSave, onDelete, onCancel, onClose }: RecipeEditDialogProps) {
  const { data } = useApp();
  const backdropClickHandlers = useBackdropClick(onCancel);
  const workstationItemIds = [...new Set(Object.values(data.tags)
    .filter(tag => tag.name.trim() === '工作方块')
    .flatMap(tag => tag.items))];
  const initialOutputsSignature = initialOutputs
    .map(slot => `${slot.type}:${slot.ref}:${slot.count}`)
    .join('|');
  const [formData, setFormData] = useState<Recipe>({
    id: recipe?.id || '',
    name: recipe?.name || '',
    workstation: recipe?.workstation || '',
    inputs: recipe?.inputs || [],
    attachments: recipe?.attachments || [],
    outputs: recipe?.outputs || initialOutputs.map(slot => ({ ...slot })),
    processingFeeOverride: recipe?.processingFeeOverride
  });
  const [openAddPicker, setOpenAddPicker] = useState<'inputs' | 'attachments' | 'outputs' | null>(null);
  const [pickerStyle, setPickerStyle] = useState<CSSProperties>({});
  const addButtonRefs = useRef<Record<'inputs' | 'attachments' | 'outputs', HTMLButtonElement | null>>({
    inputs: null,
    attachments: null,
    outputs: null
  });
  const resolvedFee = resolveProcessingFee(data, formData);
  const selectedWorkstationIsValid = !formData.workstation || isWorkstationItem(data, formData.workstation);

  const setFeeOverride = (field: 'fixedFee' | 'rate' | 'cap', value: string) => {
    const numeric = value === '' ? undefined : Number(value);
    setFormData(current => ({
      ...current,
      processingFeeOverride: {
        ...current.processingFeeOverride,
        [field]: field === 'rate' && numeric !== undefined ? numeric / 100 : numeric
      }
    }));
  };

  const setFeeInheritance = (field: 'fixedFee' | 'rate', inherit: boolean) => {
    setFormData(current => {
      const nextOverride = { ...current.processingFeeOverride };
      if (inherit) delete nextOverride[field];
      else nextOverride[field] = 0;
      return { ...current, processingFeeOverride: nextOverride };
    });
  };

  useEffect(() => {
    if (!recipe) {
      setFormData({
        id: `recipe_${Date.now()}`,
        name: '',
        workstation: '',
        inputs: [],
        attachments: [],
        outputs: initialOutputs.map(slot => ({ ...slot })),
        processingFeeOverride: undefined
      });
    }
  }, [recipe, initialOutputsSignature]);

  const calculatePickerStyle = (slotType: 'inputs' | 'attachments' | 'outputs'): CSSProperties | null => {
    const button = addButtonRefs.current[slotType];
    if (!button) return null;

    const buttonRect = button.getBoundingClientRect();
    const safeGap = 8;
    const gapToButton = 6;
    const pickerWidth = Math.min(320, Math.max(220, window.innerWidth - safeGap * 2));
    const preferredLeft = buttonRect.right + gapToButton;
    // Always favor the button's right side. Clamp only against the viewport, not
    // the dialog, so the output picker can extend beyond the dialog's right edge.
    const left = Math.max(
      safeGap,
      Math.min(preferredLeft, window.innerWidth - safeGap - pickerWidth)
    );
    const top = Math.max(safeGap, buttonRect.top - 8);
    const availableHeight = Math.max(140, window.innerHeight - top - safeGap);

    return {
      position: 'fixed',
      left,
      top,
      width: pickerWidth,
      maxHeight: availableHeight
    };
  };

  useLayoutEffect(() => {
    if (!openAddPicker) return;

    const updatePickerPosition = () => {
      const nextStyle = calculatePickerStyle(openAddPicker);
      if (nextStyle) setPickerStyle(nextStyle);
    };

    updatePickerPosition();
    window.addEventListener('resize', updatePickerPosition);
    document.addEventListener('scroll', updatePickerPosition, true);
    return () => {
      window.removeEventListener('resize', updatePickerPosition);
      document.removeEventListener('scroll', updatePickerPosition, true);
    };
  }, [openAddPicker]);

  const toggleAddPicker = (slotType: 'inputs' | 'attachments' | 'outputs') => {
    if (openAddPicker === slotType) {
      setOpenAddPicker(null);
      setPickerStyle({});
      return;
    }

    const nextStyle = calculatePickerStyle(slotType);
    if (nextStyle) setPickerStyle(nextStyle);
    setOpenAddPicker(slotType);
  };

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

    const override = formData.processingFeeOverride;
    const ratePercent = override?.rate === undefined ? undefined : override.rate * 100;
    if ([override?.fixedFee, override?.cap, ratePercent].some(value => value !== undefined && (value < 0 || Math.round(value * 10) !== value * 10))) {
      alert('加工费、费率和上限必须是非负数，且最多保留 1 位小数');
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

  const addSlot = (slotType: 'inputs' | 'attachments' | 'outputs', value: { type: 'item' | 'tag'; ref: string }) => {
    setFormData(current => ({
      ...current,
      [slotType]: [...current[slotType], { type: value.type, ref: value.ref, count: 1 }]
    }));
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

  const slotPanelMeta = {
    inputs: { title: '输入', description: '制作时需要消耗的材料' },
    attachments: { title: '附加', description: '工具、催化剂或额外条件' },
    outputs: { title: '输出', description: '配方最终生成的物品或标签' }
  } as const;

  const renderSlotEditor = (slotType: 'inputs' | 'attachments' | 'outputs') => {
    const meta = slotPanelMeta[slotType];
    const isPickerOpen = openAddPicker === slotType;

    return (
    <section className={`recipe-slot-editor-panel recipe-slot-editor-${slotType}`}>
      <div className="recipe-slot-editor-header">
        <div>
          <div className="recipe-slot-editor-title-row">
            <h3>{meta.title}</h3>
            <span className="slot-count-badge">{formData[slotType].length}</span>
          </div>
          <p>{meta.description}</p>
        </div>
        <div className="recipe-slot-editor-actions">
          {slotType === 'outputs' && <span className="required-badge">必填</span>}
          <button
            ref={element => { addButtonRefs.current[slotType] = element; }}
            type="button"
            className={`slot-header-add-button ${isPickerOpen ? 'active' : ''}`}
            aria-label={`添加${meta.title}槽位`}
            aria-expanded={isPickerOpen}
            data-item-selector-toggle
            onPointerDown={event => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              toggleAddPicker(slotType);
            }}
          >
            ＋
          </button>
          {isPickerOpen && createPortal(
            <div
              className="slot-header-picker slot-header-picker-portal"
              style={pickerStyle}
              onMouseDown={event => event.stopPropagation()}
              onClick={event => event.stopPropagation()}
            >
              <ItemSelector
                value={undefined}
                onChange={(value) => {
                  if (value) addSlot(slotType, value);
                }}
                placeholder={`搜索${meta.title}物品或标签...`}
                allowTags={true}
                keepOpenAfterSelect={true}
                open={true}
                onOpenChange={(nextOpen) => {
                  if (!nextOpen) {
                    setOpenAddPicker(null);
                    window.requestAnimationFrame(() => addButtonRefs.current[slotType]?.focus());
                  }
                }}
                dropdownOnly={true}
              />
            </div>,
            document.body
          )}
        </div>
      </div>
      <div className="slots-editor slot-editor-scroll-area">
        {formData[slotType].length === 0 && (
          <div className="slot-editor-empty">暂无{meta.title}槽位</div>
        )}
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
              aria-label={`${meta.title}槽位数量`}
              value={slot.count}
              onChange={e => updateSlot(slotType, idx, { ...slot, count: parseInt(e.target.value) || 1 })}
            />

            <button type="button" className="btn-icon" onClick={() => removeSlot(slotType, idx)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
  };

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div className="dialog recipe-edit-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{recipe ? '编辑配方' : '新建配方'}</h2>
          <button type="button" className="dialog-close" onClick={onClose || onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="recipe-edit-form">
          <div className="dialog-body recipe-edit-body">
            <section className="recipe-basic-section">
              <div className="recipe-basic-heading">
                <div>
                  <h3>基础信息</h3>
                  <p>设置配方名称与使用的工作方块</p>
                </div>
              </div>
              <div className="recipe-basic-grid">
                <div className="form-group">
                  <label>配方名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="留空则使用第一个输出物品名"
                  />
                </div>

                <div className="form-group">
                  <label>工作方块 <span className="required-mark">*</span></label>
                  <ItemSelector
                    value={formData.workstation ? { type: 'item', ref: formData.workstation } : undefined}
                    onChange={(value) => setFormData({ ...formData, workstation: value?.ref || '' })}
                    placeholder="选择工作方块"
                    allowTags={false}
                    allowedItemIds={workstationItemIds}
                  />
                </div>
              </div>
              {!selectedWorkstationIsValid && (
                <p className="processing-fee-warning">所选物品不再属于“工作方块”标签，本配方加工费按 0 计算。</p>
              )}
              <div className="recipe-processing-fee">
                <div className="processing-fee-heading">
                  <h3>工序加工费</h3>
                  <p>最终采用：固定费 {resolvedFee.fixedFee}，费率 {resolvedFee.rate * 100}% ，上限 {resolvedFee.cap ?? '无限制'}</p>
                </div>
                <div className="processing-fee-grid">
                  <div className="form-group">
                    <label>固定费</label>
                    <select value={formData.processingFeeOverride?.fixedFee === undefined ? 'inherit' : 'override'}
                      onChange={e => setFeeInheritance('fixedFee', e.target.value === 'inherit')}>
                      <option value="inherit">继承工作方块</option><option value="override">覆盖</option>
                    </select>
                    {formData.processingFeeOverride?.fixedFee !== undefined && (
                      <input type="number" min="0" step="0.1" value={formData.processingFeeOverride.fixedFee}
                        onChange={e => setFeeOverride('fixedFee', e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label>比例费率 (%)</label>
                    <select value={formData.processingFeeOverride?.rate === undefined ? 'inherit' : 'override'}
                      onChange={e => setFeeInheritance('rate', e.target.value === 'inherit')}>
                      <option value="inherit">继承工作方块</option><option value="override">覆盖</option>
                    </select>
                    {formData.processingFeeOverride?.rate !== undefined && (
                      <input type="number" min="0" step="0.1" value={formData.processingFeeOverride.rate * 100}
                        onChange={e => setFeeOverride('rate', e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label>加工费上限</label>
                    <select value={formData.processingFeeOverride?.capMode || 'inherit'}
                      onChange={e => setFormData(current => ({ ...current, processingFeeOverride: { ...current.processingFeeOverride, capMode: e.target.value as 'inherit' | 'unlimited' | 'value' } }))}>
                      <option value="inherit">继承工作方块</option><option value="unlimited">无限制</option><option value="value">指定数值</option>
                    </select>
                    {formData.processingFeeOverride?.capMode === 'value' && (
                      <input type="number" min="0" step="0.1" value={formData.processingFeeOverride.cap ?? ''}
                        onChange={e => setFeeOverride('cap', e.target.value)} />
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="recipe-slot-editor-grid">
              {renderSlotEditor('inputs')}
              {renderSlotEditor('attachments')}
              {renderSlotEditor('outputs')}
            </div>
          </div>

          <div className="dialog-footer recipe-edit-footer">
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
