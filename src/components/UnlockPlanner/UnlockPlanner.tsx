import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AppData, Item } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { analyzeUnlockStage, assignUnlockItems, deleteUnlockStage, getItemCategory, getPlanningItemIds, StageUnlockAnalysis, UnlockItemCategory } from '../../utils/unlockPlan';
import { matchesSearch } from '../../utils/searchMatcher';
import { entityDataAttributes } from '../../utils/entityTarget';

const labels: Record<UnlockItemCategory, string> = {
  workstation: '工作方块', base: '基础食材', processed: '加工品', finished: '成品菜', related: '其他物品'
};
type Mode = 'overview' | 'edit';
type MainTab = 'workstation' | 'items';
type StatusFilter = 'all' | 'unassigned' | 'current' | 'other';
type ItemFilter = 'all' | Exclude<UnlockItemCategory, 'workstation'>;

export function UnlockPlanner() {
  const { data, setData, isEditable } = useApp();
  const plan = data.unlockPlan;
  const [selectedStageId, setSelectedStageId] = useState(plan.stages[0]?.id || '');
  const [mode, setMode] = useState<Mode>('overview');
  const [mainTab, setMainTab] = useState<MainTab>('workstation');
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [workstationFilter, setWorkstationFilter] = useState('all');
  const stageId = plan.stages.some(stage => stage.id === selectedStageId) ? selectedStageId : plan.stages[0].id;
  const stage = plan.stages.find(value => value.id === stageId)!;
  const analysis = useMemo(() => analyzeUnlockStage(data, stageId), [data.items, data.tags, data.recipes, data.unlockPlan, stageId]);
  const planningItemIds = useMemo(() => getPlanningItemIds(data), [data.items, data.tags, data.recipes]);
  const workstationIds = useMemo(() => [...planningItemIds].filter(id => getItemCategory(data, id) === 'workstation'), [data.items, data.tags, planningItemIds]);
  const itemRelations = useMemo(() => {
    const relations = Object.fromEntries([...planningItemIds].map(id => [id, { asInput: 0, asOutput: 0, workstations: new Set<string>() }]));
    Object.values(data.recipes).forEach(recipe => {
      const inputIds = new Set<string>();
      [...recipe.inputs, ...recipe.attachments].forEach(slot => {
        if (slot.type === 'item') inputIds.add(slot.ref);
        else data.tags[slot.ref]?.items.forEach(id => inputIds.add(id));
      });
      const outputIds = new Set(recipe.outputs.filter(slot => slot.type === 'item').map(slot => slot.ref));
      inputIds.forEach(id => { if (relations[id]) relations[id].asInput += 1; });
      outputIds.forEach(id => { if (relations[id]) relations[id].asOutput += 1; });
      new Set([...inputIds, ...outputIds]).forEach(id => relations[id]?.workstations.add(recipe.workstation));
    });
    return relations;
  }, [data.recipes, data.tags, planningItemIds]);

  const searchableIds = useMemo(() => [...planningItemIds].filter(id => {
    const item = data.items[id]; const category = getItemCategory(data, id);
    return (mainTab === 'workstation' ? category === 'workstation' : category !== 'workstation')
      && (mainTab === 'workstation' || itemFilter === 'all' || category === itemFilter)
      && (workstationFilter === 'all' || itemRelations[id].workstations.has(workstationFilter))
      && matchesSearch(search, item.name, item.id, item.itemId);
  }).sort((a, b) => data.items[a].name.localeCompare(data.items[b].name, 'zh-CN')), [
    planningItemIds, data.items, data.tags, itemRelations,
    mainTab, itemFilter, workstationFilter, search
  ]);
  const filteredIds = useMemo(() => statusFilter === 'all' ? searchableIds : searchableIds.filter(id => {
    const assigned = plan.itemStages[id];
    return (statusFilter === 'unassigned' && !assigned)
      || (statusFilter === 'current' && assigned === stageId)
      || (statusFilter === 'other' && !!assigned && assigned !== stageId);
  }), [searchableIds, plan.itemStages, statusFilter, stageId]);

  const updatePlan = (unlockPlan: typeof plan) => setData(prev => ({ ...prev, unlockPlan }));
  const assign = (ids: string[], target = stageId) => setData(prev => ({ ...prev, unlockPlan: assignUnlockItems(prev.unlockPlan, ids, target) }));
  const unassign = (ids: string[]) => setData(prev => ({ ...prev, unlockPlan: assignUnlockItems(prev.unlockPlan, ids) }));
  const toggleItem = useCallback((id: string) => setData(prev => ({
    ...prev,
    unlockPlan: assignUnlockItems(prev.unlockPlan, [id], prev.unlockPlan.itemStages[id] === stageId ? undefined : stageId)
  })), [setData, stageId]);
  const addStage = () => { const id = `unlock_stage_${Date.now()}`; updatePlan({ ...plan, stages: [...plan.stages, { id, name: `阶段${plan.stages.length + 1}` }] }); setSelectedStageId(id); };
  const moveStage = (offset: number) => { const index = plan.stages.findIndex(value => value.id === stageId); const target = index + offset; if (target < 0 || target >= plan.stages.length) return; const stages = [...plan.stages]; [stages[index], stages[target]] = [stages[target], stages[index]]; updatePlan({ ...plan, stages }); };
  const removeStage = () => { if (plan.stages.length <= 1 || !window.confirm(`删除“${stage.name}”？其中物品将退回未分配。`)) return; const next = deleteUnlockStage(plan, stageId); updatePlan(next); setSelectedStageId(next.stages[Math.max(0, analysis.stageIndex - 1)].id); };
  const stageName = (id?: string) => plan.stages.find(value => value.id === id)?.name || '未分配';
  const clearFilters = () => { setSearch(''); setItemFilter('all'); setStatusFilter('all'); setWorkstationFilter('all'); };

  return <div className="unlock-planner-v2">
    <aside className="unlock-stage-sidebar">
      <header className="unlock-section-header"><div><span>剧情规划</span><h2>解锁阶段</h2></div>{isEditable && <button className="btn-primary" onClick={addStage}>新增阶段</button>}</header>
      <p className="unlock-caption">每个物品只记录首次解锁阶段，后续阶段自动继承。</p>
      <nav className="unlock-stage-nav" aria-label="解锁阶段">{plan.stages.map((value, index) => <button key={value.id} aria-current={value.id === stageId ? 'step' : undefined} onClick={() => setSelectedStageId(value.id)}>
        <span className="unlock-stage-index">{index + 1}</span><span><strong>{value.name}</strong><small>{Object.values(plan.itemStages).filter(id => id === value.id).length} 个新物品</small></span>
      </button>)}</nav>
      {isEditable && <div className="unlock-stage-settings"><label><span>当前阶段名称</span><input value={stage.name} onChange={event => updatePlan({ ...plan, stages: plan.stages.map(value => value.id === stageId ? { ...value, name: event.target.value } : value) })} /></label><div className="unlock-stage-actions"><button onClick={() => moveStage(-1)} disabled={analysis.stageIndex === 0}>上移</button><button onClick={() => moveStage(1)} disabled={analysis.stageIndex === plan.stages.length - 1}>下移</button></div><button className="unlock-danger" onClick={removeStage} disabled={plan.stages.length === 1}>删除当前阶段</button></div>}
    </aside>

    <main className="unlock-workspace">
      <header className="unlock-workspace-header"><div><span>当前阶段</span><h1>{stage.name}</h1></div><div className="unlock-mode-tabs" role="tablist" aria-label="规划模式"><button className={mode === 'overview' ? 'active' : ''} onClick={() => setMode('overview')}>阶段总览</button>{isEditable && <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>编辑阶段</button>}</div></header>
      {mode === 'overview' || !isEditable ? <Overview data={data} stageId={stageId} currentIds={[...analysis.currentItemIds]} cumulativeCount={analysis.cumulativeItemIds.size} onEdit={() => setMode('edit')} editable={isEditable} /> :
      <div className="unlock-editor-layout">
        <section className="unlock-item-editor">
          <div className="unlock-list-tabs"><button className={mainTab === 'workstation' ? 'active' : ''} onClick={() => setMainTab('workstation')}>工作方块 <span>{workstationIds.length}</span></button><button className={mainTab === 'items' ? 'active' : ''} onClick={() => setMainTab('items')}>食材与物品 <span>{planningItemIds.size - workstationIds.length}</span></button></div>
          <div className="unlock-filter-bar"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索名称、ID 或拼音" aria-label="搜索名称、ID 或拼音" />{mainTab === 'items' && <select value={itemFilter} onChange={event => setItemFilter(event.target.value as ItemFilter)}><option value="all">全部类别</option><option value="base">基础食材</option><option value="processed">加工品</option><option value="finished">成品菜</option><option value="related">其他物品</option></select>}<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}><option value="all">全部状态</option><option value="unassigned">未分配</option><option value="current">当前阶段</option><option value="other">其他阶段</option></select>{mainTab === 'items' && <select value={workstationFilter} onChange={event => setWorkstationFilter(event.target.value)}><option value="all">全部相关工作方块</option>{workstationIds.map(id => <option key={id} value={id}>{data.items[id].name}</option>)}</select>}</div>
          <div className="unlock-selection-tools"><button onClick={() => assign(filteredIds)} disabled={!filteredIds.length}>选择全部</button><button onClick={() => unassign(filteredIds.filter(id => plan.itemStages[id] === stageId))} disabled={!filteredIds.some(id => plan.itemStages[id] === stageId)}>清除选择</button><span>{filteredIds.length} 项</span></div>
          <div className="unlock-item-list">{filteredIds.map(id => <ItemRow key={id} id={id} item={data.items[id]} category={getItemCategory(data, id)} currentStageId={stageId} assignedStageId={plan.itemStages[id]} stageName={stageName(plan.itemStages[id])} relation={itemRelations[id]} onToggle={toggleItem} />)}{!filteredIds.length && <div className="unlock-empty"><strong>当前筛选没有结果</strong><p>调整搜索、类别或阶段状态后再试。</p><button onClick={clearFilters}>清除筛选</button></div>}</div>
        </section>
        <CandidatePanel data={data} analysis={analysis} stageName={stageName} onAdd={ids => assign(ids)} />
      </div>}
    </main>
  </div>;
}

interface ItemRowProps {
  id: string;
  item: Item;
  category: UnlockItemCategory;
  currentStageId: string;
  assignedStageId?: string;
  stageName: string;
  relation: { asInput: number; asOutput: number };
  onToggle: (id: string) => void;
}

const ItemRow = memo(function ItemRow({ id, item, category, currentStageId, assignedStageId, stageName, relation, onToggle }: ItemRowProps) {
  const current = assignedStageId === currentStageId; const other = assignedStageId && !current;
  return <label className={`unlock-item-row ${current ? 'is-current' : ''} ${other ? 'is-other' : ''}`} {...entityDataAttributes({ type: 'item', id })}><input className={`unlock-stage-checkbox ${other ? 'is-other' : ''}`} type="checkbox" checked={current} ref={node => { if (node) node.indeterminate = !!other; }} onChange={() => onToggle(id)} aria-label={current ? `从当前阶段移除 ${item.name}` : `将 ${item.name} 加入当前阶段`} /><span className="unlock-item-main"><strong>📦 {item.name}</strong><small>{item.itemId}</small></span><span className="unlock-category">{labels[category]}</span><span className="unlock-relation">输入 {relation.asInput} · 产出 {relation.asOutput}</span><span className={`unlock-status ${current ? 'current' : other ? 'other' : ''}`}>{current ? '当前阶段' : other ? `已在 ${stageName}` : '未分配'}</span></label>;
});

interface CandidatePanelProps {
  data: AppData;
  analysis: StageUnlockAnalysis;
  stageName: (id?: string) => string;
  onAdd: (ids: string[]) => void;
}

function CandidatePanel({ data, analysis, stageName, onAdd }: CandidatePanelProps) {
  const [selected, setSelected] = useState(new Set<string>());
  const candidates = analysis.candidates;
  const candidateIds = useMemo(() => new Set<string>(candidates.map((value: { itemId: string }) => value.itemId)), [candidates]);
  useEffect(() => setSelected(previous => new Set([...previous].filter(id => candidateIds.has(id)))), [candidateIds]);
  const toggle = (id: string) => setSelected(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return <aside className="unlock-candidates"><header><div><span>下一步建议</span><h2>单步可制作</h2></div><strong>{candidates.length}</strong></header><p className="unlock-caption">输入、附件和工作方块均已解锁，可直接加入当前阶段。</p>{candidates.length > 0 && <div className="unlock-candidate-tools"><button onClick={() => setSelected(new Set(candidates.map((value: any) => value.itemId)))}>选择全部</button><button onClick={() => setSelected(new Set())} disabled={!selected.size}>清除选择</button><button className="btn-primary" disabled={!selected.size} onClick={() => { onAdd([...selected]); setSelected(new Set()); }}>加入当前阶段</button></div>}<div className="unlock-candidate-list">{candidates.map((candidate: any) => <label key={candidate.itemId} className="unlock-candidate-row" {...entityDataAttributes({ type: 'item', id: candidate.itemId })}><input type="checkbox" checked={selected.has(candidate.itemId)} onChange={() => toggle(candidate.itemId)} /><span><strong>📦 {data.items[candidate.itemId].name}</strong><small>{candidate.recipes.length} 个直接配方 · <span className="unlock-entity-inline" {...entityDataAttributes({ type: 'item', id: candidate.recipes[0].workstation })}>📦 {data.items[candidate.recipes[0].workstation]?.name || '未知工作方块'}</span></small>{candidate.assignedStageId && <em>已安排在 {stageName(candidate.assignedStageId)}</em>}</span><details><summary>配方</summary>{candidate.recipes.map((recipe: any) => <small key={recipe.id} {...entityDataAttributes({ type: 'recipe', id: recipe.id })}>{recipe.name}</small>)}</details></label>)}{!candidates.length && <div className="unlock-empty compact"><strong>暂无单步候选</strong><p>继续解锁工作方块、输入或附件后，这里会出现下一步产物。</p></div>}</div></aside>;
}

function Overview({ data, currentIds, cumulativeCount, onEdit, editable }: any) {
  const groups = Object.entries(labels).map(([category, label]) => ({ category, label, ids: currentIds.filter((id: string) => getItemCategory(data, id) === category) })).filter(group => group.ids.length);
  return <section className="unlock-overview"><div className="unlock-overview-summary"><div><strong>{currentIds.length}</strong><span>本阶段新增</span></div><div><strong>{cumulativeCount}</strong><span>累计解锁</span></div></div>{!currentIds.length ? <div className="unlock-empty overview"><strong>此阶段尚未安排任何物品</strong><p>进入编辑模式，从完整列表中选择工作方块和物品。</p>{editable && <button className="btn-primary" onClick={onEdit}>编辑此阶段</button>}</div> : <div className="unlock-overview-groups">{groups.map(group => <section key={group.category}><header><h2>{group.label}</h2><span>{group.ids.length}</span></header><div>{group.ids.map((id: string) => <span key={id} {...entityDataAttributes({ type: 'item', id })}>📦 {data.items[id].name}</span>)}</div></section>)}</div>}</section>;
}
