import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Coffee, ShoppingBag, Smartphone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const SPENDING_DATA = [
  { name: 'Online', value: 45, color: '#FFF27A' },
  { name: 'Card', value: 30, color: '#FFFFFF' },
  { name: 'Cash', value: 25, color: '#FB5D5D' },
];

const INCOME_OUTCOME_DATA = [
  { month: 'Jan', income: 4000, outcome: 2400 },
  { month: 'Feb', income: 3000, outcome: 1398 },
  { month: 'Mar', income: 2000, outcome: 9800 },
  { month: 'Apr', income: 2780, outcome: 3908 },
  { month: 'May', income: 8030, outcome: 4800, active: true },
  { month: 'Jun', income: 2390, outcome: 3800 },
];

const TRANSACTIONS = [
  { id: 1, name: 'Starbucks', category: 'Coffee', icon: Coffee, amount: -4.50, date: 'Today, 08:24 AM' },
  { id: 2, name: 'Apple Store', category: 'Electronics', icon: Smartphone, amount: -999.00, date: 'Today, 10:45 AM' },
  { id: 3, name: 'Zara', category: 'Shopping', icon: ShoppingBag, amount: -120.50, date: 'Yesterday' },
  { id: 4, name: 'Salary', category: 'Income', icon: ArrowDownLeft, amount: 4500.00, date: 'May 01, 2024' },
];

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* Column 1: Balance & Goals */}
      <div className="space-y-6 flex flex-col">
        {/* Total Balance Card */}
        <div className="bg-figma-card rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
          <p className="text-slate-400 font-medium mb-2">Total Balance</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-8">
            $80,300<span className="text-slate-500">.00</span>
          </h2>
          
          <div className="flex gap-4 mt-auto">
            <button className="flex-1 bg-figma-yellow hover:bg-yellow-300 text-figma-bg font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              <ArrowDownLeft size={18} />
              Deposit
            </button>
            <button className="flex-1 bg-transparent border border-slate-600 hover:border-slate-400 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              <ArrowUpRight size={18} />
              Transfer
            </button>
          </div>
        </div>

        {/* Financial Goals */}
        <div className="bg-figma-card rounded-3xl p-6 flex-1 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Financial Goals</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-white font-medium">New Car</p>
                  <p className="text-xs text-slate-400">$20,000 / $35,000</p>
                </div>
                <span className="text-figma-yellow font-bold text-sm">57%</span>
              </div>
              <div className="w-full h-3 bg-figma-bg rounded-full overflow-hidden">
                <div className="h-full bg-figma-yellow rounded-full transition-all duration-1000" style={{ width: '57%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-white font-medium">Vacation</p>
                  <p className="text-xs text-slate-400">$3,500 / $5,000</p>
                </div>
                <span className="text-figma-coral font-bold text-sm">70%</span>
              </div>
              <div className="w-full h-3 bg-figma-bg rounded-full overflow-hidden">
                <div className="h-full bg-figma-coral rounded-full transition-all duration-1000" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-white font-medium">Emergency Fund</p>
                  <p className="text-xs text-slate-400">$10,000 / $10,000</p>
                </div>
                <span className="text-white font-bold text-sm">100%</span>
              </div>
              <div className="w-full h-3 bg-figma-bg rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Charts Area */}
      <div className="xl:col-span-2 space-y-6 flex flex-col">
        
        {/* Top Row inside Col 2: Spendings & Income vs Outcome */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-72">
          
          {/* Spendings Analysis (Donut) */}
          <div className="bg-figma-card rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">Spendings</h3>
            <div className="flex-1 flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SPENDING_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {SPENDING_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#26292E', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-white">100%</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {SPENDING_DATA.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-xs text-slate-300">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Income vs Outcome */}
          <div className="bg-figma-card rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Cash Flow</h3>
            <div className="flex-1 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={INCOME_OUTCOME_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#26292E', border: 'none', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="income" radius={[4, 4, 4, 4]} barSize={14}>
                    {INCOME_OUTCOME_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.active ? '#FFF27A' : '#475569'} />
                    ))}
                  </Bar>
                  <Bar dataKey="outcome" radius={[4, 4, 4, 4]} barSize={14}>
                    {INCOME_OUTCOME_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.active ? '#FB5D5D' : '#334155'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Recent Transactions List */}
        <div className="bg-figma-card rounded-3xl p-6 shadow-sm flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button className="text-sm font-medium text-figma-yellow hover:text-yellow-300 transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700/50 flex items-center justify-center text-slate-300">
                    <tx.icon size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{tx.name}</p>
                    <p className="text-xs text-slate-400">{tx.date}</p>
                  </div>
                </div>
                <div className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
