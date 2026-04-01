import { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  type Connection, 
  type Edge,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api';
import { useFinancialState } from '../hooks/useData';
import { SectionHeader, Alert, fmtFull } from '../components/ui';
import { Wallet, TrendingUp, Receipt, Info } from 'lucide-react';

// ─── Custom Node Components ──────────────────────────────────────────────────

interface CommonNodeProps {
  children?: React.ReactNode;
  title: string;
  icon: React.ElementType;
  colorClass: string;
  amount: number;
  sub: string;
}

const CommonNode = ({ children, title, icon: Icon, colorClass, amount, sub }: CommonNodeProps) => (
  <div className={`px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-800 min-w-[180px] shadow-2xl transition-all hover:border-slate-600`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
        <Icon size={16} className={colorClass.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</p>
        <p className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{sub}</p>
      </div>
    </div>
    <div className="pt-2 border-t border-slate-800">
      <p className="text-sm font-mono font-bold text-figma-yellow">{fmtFull(amount)}</p>
    </div>
    {children}
  </div>
);

const CashNode = ({ data }: NodeProps) => (
  <CommonNode 
    title="Available Cash" 
    sub="Liquidity" 
    icon={Wallet} 
    colorClass="bg-emerald-400" 
    amount={Number(data.amount)}
  >
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-400 border-2 border-slate-900" />
  </CommonNode>
);

const RevenueNode = ({ data }: NodeProps) => (
  <CommonNode 
    title="Inflow" 
    sub={String(data.name)} 
    icon={TrendingUp} 
    colorClass="bg-blue-400" 
    amount={Number(data.amount)}
  >
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-400 border-2 border-slate-900" />
  </CommonNode>
);

const PayableNode = ({ data }: NodeProps) => (
  <CommonNode 
    title="Outflow" 
    sub={String(data.name)} 
    icon={Receipt} 
    colorClass="bg-red-400" 
    amount={Number(data.amount)}
  >
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-400 border-2 border-slate-900" />
  </CommonNode>
);

const nodeTypes = {
  cash: CashNode,
  revenue: RevenueNode,
  payable: PayableNode,
};

// ─── Main Canvas Component ───────────────────────────────────────────────────

export default function Canvas() {
  const { data: state } = useFinancialState();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [runway, setRunway] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize nodes from financial state
  useEffect(() => {
    if (!state) return;
    
    const initialNodes: Node[] = [
      {
        id: 'cash-static',
        type: 'cash',
        position: { x: 50, y: 150 },
        data: { amount: state.available_cash },
      },
    ];

    state.receivables.forEach((r, i) => {
      initialNodes.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        position: { x: 50, y: 300 + i * 120 },
        data: { name: r.counterparty, amount: r.amount, item_id: r.id },
      });
    });

    state.payables.forEach((p, i) => {
      initialNodes.push({
        id: `pay-${p.id}`,
        type: 'payable',
        position: { x: 500, y: 150 + i * 120 },
        data: { name: p.counterparty, amount: p.amount, item_id: p.id },
      });
    });

    setNodes(initialNodes);
  }, [state, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Trigger simulation when edges change
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const runSim = async () => {
      setLoading(true);
      try {
        const result = await api.runCanvasSimulation({ 
          nodes: nodes.map(n => ({ id: n.id, type: n.type as string, position: n.position, data: n.data })), 
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })) 
        });
        setRunway(result.runway_days);
      } catch (err) {
        console.error('Simulation failed', err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(runSim, 500);
    return () => clearTimeout(timeout);
  }, [edges, nodes]);

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div className="flex justify-between items-end">
        <SectionHeader 
          title="Interactive Scenario Canvas" 
          sub="Connect sources to obligations to manually route cashflow" 
        />
        
        <div className="flex gap-4 mb-2">
          <div className="bg-figma-card px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-xl">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Projected Runway</p>
              <p className="text-2xl font-bold text-figma-yellow font-mono">
                {loading ? '...' : runway !== null ? `${runway} Days` : '--'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-slate-700 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`} />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-figma-sidebar rounded-3xl border border-slate-800 overflow-hidden relative shadow-inner">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="shadow-2xl">
            <Alert variant="info">
              <div className="flex items-center gap-2">
                <Info size={14} />
                <span className="text-xs">Drag from <strong>blue/green</strong> circles to <strong>red</strong> circles.</span>
              </div>
            </Alert>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950/20"
        >
          <Background color="#1e293b" gap={25} size={1} />
          <Controls className="bg-slate-900 border-slate-800 fill-slate-400" />
        </ReactFlow>
      </div>
    </div>
  );
}
