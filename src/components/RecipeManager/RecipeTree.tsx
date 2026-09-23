import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../../contexts/AppContext';
import { ViewMode } from '../../types';
import { RecipeTreeBuilder } from '../../utils/recipeTreeAlgo';
import { SearchInput } from '../common/SearchInput';

export function RecipeTree() {
  const { data } = useApp();
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>('source');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchText, setSearchText] = useState('');

  const buildTree = useCallback(() => {
    if (targetIds.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: treeNodes, edges: treeEdges } = RecipeTreeBuilder.build(data, targetIds, mode);

    // 转换为 React Flow 节点
    const flowNodes: Node[] = treeNodes.map(node => {
      const item = data.items[node.id];
      const tag = data.tags[node.id];
      const ref = item || tag;

      return {
        id: node.id,
        type: 'default',
        position: {
          x: node.level * 250,
          y: node.branchIndex * 80
        },
        data: {
          label: (
            <div className="recipe-node">
              {item ? '📦' : '🏷️'} {ref?.name || node.id}
            </div>
          )
        }
      };
    });

    // 转换为 React Flow 边
    const flowEdges: Edge[] = treeEdges.map((edge, idx) => ({
      id: `edge-${idx}`,
      source: edge.from,
      target: edge.to,
      type: ConnectionLineType.SmoothStep,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, targetIds, mode, setNodes, setEdges]);

  const addTarget = (itemId: string) => {
    if (!targetIds.includes(itemId)) {
      setTargetIds([...targetIds, itemId]);
    }
  };

  const removeTarget = (itemId: string) => {
    setTargetIds(targetIds.filter(id => id !== itemId));
  };

  const filteredItems = Object.values(data.items).filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 每次目标或模式改变时重新构建树
  useState(() => {
    buildTree();
  });

  return (
    <div className="recipe-tree-container">
      <div className="tree-controls">
        <div className="tree-targets">
          <label>查看目标:</label>
          <div className="target-chips">
            {targetIds.map(id => {
              const item = data.items[id];
              return item ? (
                <div key={id} className="target-chip">
                  📦 {item.name}
                  <button onClick={() => removeTarget(id)}>×</button>
                </div>
              ) : null;
            })}
          </div>
          <div className="target-search">
            <SearchInput placeholder="搜索添加物品..." onSearch={setSearchText} />
            <div className="target-dropdown">
              {filteredItems.slice(0, 10).map(item => (
                <div key={item.id} className="target-option" onClick={() => addTarget(item.id)}>
                  📦 {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tree-mode">
          <label>模式:</label>
          <label>
            <input
              type="radio"
              value="source"
              checked={mode === 'source'}
              onChange={e => setMode(e.target.value as ViewMode)}
            />
            查看获取
          </label>
          <label>
            <input
              type="radio"
              value="usage"
              checked={mode === 'usage'}
              onChange={e => setMode(e.target.value as ViewMode)}
            />
            查看制作
          </label>
        </div>

        <button className="btn-primary" onClick={buildTree}>
          生成配方树
        </button>
      </div>

      <div className="tree-canvas">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        ) : (
          <div className="tree-empty">
            <p>请选择物品并点击"生成配方树"</p>
            <p className="tree-hint">提示：Ctrl+滚轮缩放 | Shift+滚轮平移</p>
          </div>
        )}
      </div>
    </div>
  );
}
