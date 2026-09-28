import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  Position,
  Handle,
  BaseEdge,
  useStore,
  useReactFlow,
  useViewport,
  ControlButton,
  EdgeProps
} from 'reactflow';
import type { ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ViewMode } from '../../types';
import { RecipeTreeBuilder } from '../../utils/recipeTreeAlgo';
import { EntityTarget } from '../../utils/entityTarget';
import { ItemSelector } from '../common/ItemSelector';

function RecipeFlowNode({ data }: { data: { label: React.ReactNode } }) {
  return (
    <>
      <Handle type="target" position={Position.Left} id="target-main" style={{ top: '50%' }} />
      <Handle type="target" position={Position.Top} id="target-tag" style={{ left: '50%' }} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} id="source-main" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="source-tag" style={{ left: '50%' }} />
    </>
  );
}

const nodeTypes = { recipeNode: RecipeFlowNode };

function RecipeTreeEdge({ sourceX, sourceY, targetX, targetY, markerEnd, style, data }: EdgeProps) {
  const nodes = useStore(state => state.nodeInternals);
  const inputs = (data?.inputs as string[] || []).map(id => nodes.get(id)).filter(Boolean);
  const outputs = (data?.outputs as string[] || []).map(id => nodes.get(id)).filter(Boolean);
  if (data?.relation === 'tag-member' || !inputs.length || !outputs.length) {
    const x = Math.min(sourceX, targetX) - 18;
    return <BaseEdge path={`M ${sourceX} ${sourceY} H ${x} V ${targetY} H ${targetX}`} markerEnd={markerEnd} style={style} />;
  }
  const starts = inputs.map(node => ({ x: node!.positionAbsolute!.x + (node!.width || 204), y: node!.positionAbsolute!.y + (node!.height || 52) / 2 }));
  const ends = outputs.map(node => ({ x: node!.positionAbsolute!.x, y: node!.positionAbsolute!.y + (node!.height || 52) / 2 }));
  const left = Math.max(...starts.map(p => p.x));
  const right = Math.min(...ends.map(p => p.x));
  const trunk = (left + right) / 2 + ((data?.channel as number) || 0);
  const ys = [...starts, ...ends].map(p => p.y);
  return <>
    <BaseEdge path={`M ${trunk} ${Math.min(...ys)} V ${Math.max(...ys)}`} style={style} />
    {starts.map((p, i) => <BaseEdge key={`in-${i}`} path={`M ${p.x} ${p.y} H ${trunk}`} style={style} />)}
    {ends.map((p, i) => <BaseEdge key={`out-${i}`} path={`M ${trunk} ${p.y} H ${p.x}`} markerEnd={markerEnd} style={style} />)}
  </>;
}

function TreeZoomControls() {
  const { zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  return <Controls fitViewOptions={{ padding: 0.15, minZoom: 0.05, maxZoom: 1 }}>
    <ControlButton title="Reset zoom to 100%" onClick={() => zoomTo(1)}>{Math.round(zoom * 100)}%</ControlButton>
  </Controls>;
}

const edgeTypes = { recipeTree: RecipeTreeEdge };

export function RecipeTree() {
  const { data } = useApp();
  const { setSelectedItem, recipeTreeTarget, setRecipeTreeTarget } = useNavigation();
  const [targets, setTargets] = useState<EntityTarget[]>([]);
  const [modes, setModes] = useState<ViewMode[]>(['source', 'usage']);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [nodesLocked, setNodesLocked] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const flowInstance = useRef<ReactFlowInstance | null>(null);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const entityId = (node.data as { entityId?: string }).entityId || node.id;
    const entityType = (node.data as { entityType?: string }).entityType;
    const item = entityType === 'item' ? data.items[entityId] : undefined;
    const tag = entityType === 'tag' ? data.tags[entityId] : undefined;
    if (item) {
      setSelectedItem(item);
    } else if (tag) {
      // 点击标签节点时切换展开/收起状态
      setExpandedTags(prev => {
        const newSet = new Set(prev);
        if (newSet.has(entityId)) {
          newSet.delete(entityId);
        } else {
          newSet.add(entityId);
        }
        return newSet;
      });
    }
  }, [data, setSelectedItem]);

  const buildTree = useCallback(() => {
    if (targets.length === 0 || modes.length === 0) {
      setNodes([]);
      setEdges([]);
      setLayoutRevision(value => value + 1);
      return;
    }

    const { nodes: treeNodes, edges: treeEdges } = RecipeTreeBuilder.build(data, targets, modes, expandedTags, includeAttachments);
    // 转换为 React Flow 节点
    const flowNodes: Node[] = treeNodes.map(node => {
      const item = node.entityType === 'item' ? data.items[node.entityId] : undefined;
      const tag = node.entityType === 'tag' ? data.tags[node.entityId] : undefined;
      const ref = item || tag;
      const isExpanded = tag && expandedTags.has(node.entityId);

      return {
        id: node.id,
        type: 'recipeNode',
        position: {
          x: node.x,
          y: node.y
        },
        data: {
          entityId: node.entityId,
          entityType: node.entityType,
          label: (
            <div
              className={`recipe-node ${node.isTarget ? 'recipe-node-target' : ''} ${node.isTagMember ? 'recipe-node-tag-member' : ''} ${node.role === 'attachment' ? 'recipe-node-attachment' : ''}`}
              data-entity-type={node.entityType}
              data-entity-id={node.entityId}
            >
              {item ? '📦' : '🏷️'} {ref?.name || node.id}
              {tag && <span style={{ marginLeft: '4px' }}>{isExpanded ? '▼' : '▶'}</span>}
            </div>
          )
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left
      };
    });

    const groups = new Map<string, typeof treeEdges>();
    treeEdges.forEach(edge => {
      const key = edge.relation === 'recipe' ? edge.branchId : edge.id;
      groups.set(key, [...(groups.get(key) || []), edge]);
    });
    const flowEdges: Edge[] = [...groups.values()].map(group => {
      const edge = group[0];
      return {
        id: edge.id, source: edge.from, target: edge.to,
        sourceHandle: edge.relation === 'tag-member' ? 'source-tag' : 'source-main',
        targetHandle: edge.relation === 'tag-member' ? 'target-tag' : 'target-main',
        type: 'recipeTree',
        data: { relation: edge.relation, branchId: edge.branchId,
          inputs: [...new Set(group.map(e => e.from))], outputs: [...new Set(group.map(e => e.to))] },
        style: { stroke: '#64748b', strokeWidth: edge.relation === 'recipe' ? 2 : 1.5,
          strokeDasharray: edge.relation === 'tag-member' ? '4 4' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
    setLayoutRevision(value => value + 1);
  }, [data, targets, modes, expandedTags, includeAttachments, setNodes, setEdges]);

  const addTarget = (target: EntityTarget) => {
    if (!targets.some(current => current.type === target.type && current.id === target.id)) {
      setTargets([...targets, target]);
    }
  };

  const removeTarget = (target: EntityTarget) => {
    setTargets(targets.filter(current => current.type !== target.type || current.id !== target.id));
  };

  const toggleMode = (mode: ViewMode) => {
    if (modes.includes(mode)) {
      const newModes = modes.filter(m => m !== mode);
      if (newModes.length > 0) {
        setModes(newModes);
      }
    } else {
      setModes([...modes, mode]);
    }
  };

  // 监听外部导航请求
  useEffect(() => {
    if (recipeTreeTarget) {
      setTargets(prev => {
        if (!prev.some(target => target.type === recipeTreeTarget.type && target.id === recipeTreeTarget.id)) {
          return [...prev, recipeTreeTarget];
        }
        return prev;
      });
      setRecipeTreeTarget(null);
    }
  }, [recipeTreeTarget, setRecipeTreeTarget]);

  // 每次目标或模式改变时自动重新构建树
  useEffect(() => {
    buildTree();
  }, [buildTree]);

  // 仅在树结构改变时适配视口。节点选择和拖拽会改变 React Flow 的 nodes，
  // 但不应重置用户当前排版和缩放位置。
  useEffect(() => {
    if (!flowInstance.current || nodes.length === 0) return;
    const frame = requestAnimationFrame(() => {
      flowInstance.current?.fitView({ padding: 0.2, minZoom: 0.05, maxZoom: 1, duration: 180 });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutRevision]);

  return (
    <div className="recipe-tree-container">
      <div className={`tree-controls-panel ${controlsOpen ? 'is-open' : 'is-closed'}`}>
        {controlsOpen && <div className="tree-controls">
        <div className="tree-targets">
          <label>查看目标:</label>
          <div className="target-chips">
            {targets.map(target => {
              const { id } = target;
              const item = target.type === 'item' ? data.items[id] : undefined;
              const tag = target.type === 'tag' ? data.tags[id] : undefined;
              const entity = item || tag;
              return entity ? (
                <div
                  key={`${target.type}-${id}`}
                  className="target-chip"
                  data-entity-type={item ? 'item' : 'tag'}
                  data-entity-id={id}
                >
                  {item ? '📦' : '🏷️'} {entity.name}
                  <button onClick={() => removeTarget(target)}>×</button>
                </div>
              ) : null;
            })}
          </div>
          <ItemSelector
            value={undefined}
            onChange={(value) => {
              if (value?.ref) {
                addTarget({ type: value.type, id: value.ref });
              }
            }}
            placeholder="搜索添加物品或标签..."
            allowTags={true}
          />
        </div>

        <div className="tree-mode">
          <label>模式:</label>
          <div className="tree-mode-main">
            <label>
              <input
                type="checkbox"
                checked={modes.includes('source')}
                onChange={() => toggleMode('source')}
              />
              查看获取
            </label>
            <label>
              <input
                type="checkbox"
                checked={modes.includes('usage')}
                onChange={() => toggleMode('usage')}
              />
              查看制作
            </label>
          </div>
          <label className="tree-attachments-toggle">
            <input
              type="checkbox"
              checked={includeAttachments}
              onChange={(event) => setIncludeAttachments(event.target.checked)}
            />
            显示附加物品
          </label>
          <label className="tree-attachments-toggle">
            <input
              type="checkbox"
              checked={nodesLocked}
              onChange={(event) => setNodesLocked(event.target.checked)}
            />
            锁定节点
          </label>
        </div>
        </div>}
        <button
          className="tree-controls-toggle"
          onClick={() => setControlsOpen(value => !value)}
          aria-label={controlsOpen ? '收起控制栏' : '展开控制栏'}
          title={controlsOpen ? '收起控制栏' : '展开控制栏'}
        >
          <span aria-hidden="true">{controlsOpen ? '↑' : '↓'}</span>
        </button>
      </div>

      <div className="tree-canvas">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodesDraggable={!nodesLocked}
            onInit={instance => { flowInstance.current = instance; }}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.25, maxZoom: 1 }}
            minZoom={0.05}
            maxZoom={4}
          >
            <Background />
            <TreeZoomControls />
          </ReactFlow>
        ) : (
          <div className="tree-empty">
            <p>请选择物品查看配方树</p>
          </div>
        )}
      </div>
    </div>
  );
}
