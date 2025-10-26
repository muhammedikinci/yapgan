import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Sidebar from '../components/Sidebar';
import { apiService } from '../services/api';

const Graph = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getGraph();

      if (response.nodes.length === 0) {
        setError('No notes to display. Create some notes with [[links]] first!');
        setLoading(false);
        return;
      }

      // Convert to ReactFlow format
      const flowNodes: Node[] = response.nodes.map((node, index) => ({
        id: node.id,
        data: { label: node.title },
        position: calculatePosition(index, response.nodes.length),
        style: {
          background: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: '600',
        },
      }));

      const flowEdges: Edge[] = response.links.map((link) => ({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#60a5fa', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#60a5fa',
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      console.error('Error loading graph:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple circular layout
  const calculatePosition = (index: number, total: number) => {
    const radius = 300;
    const angle = (index / total) * 2 * Math.PI;
    return {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    };
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    navigate(`/my/notes/${node.id}`);
  }, [navigate]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-background-dark/10 dark:border-background-light/10 p-6">
          <h1 className="text-4xl font-bold text-background-dark dark:text-background-light">
            Note Graph
          </h1>
          <p className="text-background-dark/60 dark:text-background-light/60 mt-1">
            Visualize connections between your notes. Click a node to open the note.
          </p>
        </header>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-background-dark dark:text-background-light">
              Loading graph...
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-background-light dark:bg-background-dark/60 rounded-xl p-8 text-center border border-primary/10 dark:border-primary/20 max-w-md">
              <div className="text-6xl mb-4">🕸️</div>
              <p className="text-background-dark/70 dark:text-background-light/70 mb-4">
                {error}
              </p>
              <button
                onClick={loadGraph}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && nodes.length > 0 && (
          <div className="flex-1 bg-background-light dark:bg-background-dark/60">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
            >
              <Background />
              <Controls />
              <MiniMap
                nodeColor="#10b981"
                maskColor="rgba(0, 0, 0, 0.2)"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
            </ReactFlow>
          </div>
        )}
      </main>
    </div>
  );
};

export default Graph;
