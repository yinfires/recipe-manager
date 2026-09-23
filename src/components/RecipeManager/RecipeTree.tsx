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
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../../contexts/AppContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ViewMode } from '../../types';
import { RecipeTreeBuilder } from '../../utils/recipeTreeAlgo';
import { ItemSelector } from '../common/ItemSelector';

export function RecipeTree() {
  const { data } = useApp();
  const { setSelectedItem, setSelectedTag, recipeTreeTarget, setRecipeTreeTarget } = useNavigation();
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [modes, setModes] = useState<ViewMode[]>(['source', 'usage']);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const item = data.items[node.id];
    const tag = data.tags[node.id];
    if (item) {
      setSelectedItem(item);
    } else if (tag) {
      // 点击标签节点时切换展开/收起状态
      setExpandedTags(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        return newSet;
      });
    }
  }, [data, setSelectedItem, setSelectedTag]);

  const buildTree = useCallback(() => {
    if (targetIds.length === 0 || modes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: treeNodes, edges: treeEdges } = RecipeTreeBuilder.build(data, targetIds, modes, expandedTags);

    // 转换为 React Flow 节点
    const flowNodes: Node[] = treeNodes.map(node => {
      const item = data.items[node.id];
      const tag = data.tags[node.id];
      const ref = item || tag;
      const isExpanded = tag && expandedTags.has(node.id);

      return {
        id: node.id,
        type: 'default',
        position: {
          x: node.level * 250,
          y: node.row * 80
        },
        data: {
          label: (
            <div className="recipe-node">
              {item ? '📦' : '🏷️'} {ref?.name || node.id}
              {tag && <span style={{ marginLeft: '4px' }}>{isExpanded ? '▼' : '▶'}</span>}
            </div>
          )
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left
      };
    });

    // 转换为 React Flow 边
    const flowEdges: Edge[] = treeEdges.map((edge, idx) => ({
      id: `edge-${idx}`,
      source: edge.from,
      target: edge.to,
      type: ConnectionLineType.SmoothStep,
      animated: false,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b'
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, targetIds, modes, expandedTags, setNodes, setEdges]);

  const addTarget = (itemId: string) => {
    if (!targetIds.includes(itemId)) {
      setTargetIds([...targetIds, itemId]);
    }
  };

  const removeTarget = (itemId: string) => {
    setTargetIds(targetIds.filter(id => id !== itemId));
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
      const id = recipeTreeTarget.id;
      setTargetIds(prev => {
        if (!prev.includes(id)) {
          return [...prev, id];
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
            {targetIds.map(id => {
              const item = data.items[id];
              const tag = data.tags[id];
              const target = item || tag;
              return target ? (
                <div key={id} className="target-chip">
                  {item ? '📦' : '🏷️'} {target.name}
                  <button onClick={() => removeTarget(id)}>×</button>
                </div>
              ) : null;
            })}
          </div>
          <ItemSelector
            value={undefined}
            onChange={(value) => {
              if (value?.ref) {
                addTarget(value.ref);
              }
            }}
            placeholder="搜索添加物品或标签..."
            allowTags={true}
          />
        </div>

        <div className="tree-mode">
          <label>模式:</label>
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
      </div>

      <div className="tree-canvas">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
