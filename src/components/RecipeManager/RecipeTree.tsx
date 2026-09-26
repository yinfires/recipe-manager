import { useState, useCallback, useEffect } from 'react';
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
  EdgeProps
} from 'reactflow';
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
  const branchOffset = ((data?.lane as number | undefined) || 0) % 7 * 7;
  const midX = sourceX + (targetX - sourceX) / 2 + branchOffset;
  const path = data?.relation === 'tag-member'
    ? `M ${sourceX} ${sourceY} V ${targetY}`
    : `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
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

    // 转换为 React Flow 边；每条边保留自己的 branch/lane，避免无关配方共享主干。
      const flowEdges: Edge[] = treeEdges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.relation === 'tag-member' ? 'source-tag' : 'source-main',
      targetHandle: edge.relation === 'tag-member' ? 'target-tag' : 'target-main',
      type: 'recipeTree',
      data: { relation: edge.relation, branchId: edge.branchId, lane: treeNodes.find(node => node.id === edge.from)?.lane || 0 },
      animated: false,
      style: { stroke: edge.relation === 'tag-member' ? '#94a3b8' : '#64748b', strokeWidth: edge.relation === 'tag-member' ? 1.5 : 2, strokeDasharray: edge.relation === 'tag-member' ? '4 4' : undefined },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b'
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
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

  return (
    <div className="recipe-tree-container">
      <div className="tree-controls">
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
        </div>
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
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <Controls />
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
