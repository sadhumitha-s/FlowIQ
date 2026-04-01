import { SectionHeader, Skeleton } from '../components/ui';
import { usePaymentCards } from '../hooks/useData';

export default function PaymentCards() {
  const { data: cards, loading } = usePaymentCards();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionHeader title="Payment Cards" sub="Manage your connected corporate cards" />
        <button className="px-4 py-2 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm hover:bg-yellow-300 transition-colors shadow-lg active:scale-95 transition-all">
          + Add Card
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards?.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-700">
              <p className="text-slate-500">No payment cards connected.</p>
            </div>
          )}
          {cards?.map((card) => (
            <div key={card.id} className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-2xl relative overflow-hidden text-white transition-all hover:border-figma-yellow/30 hover:-translate-y-1">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-figma-yellow/5 rounded-full blur-3xl group-hover:bg-figma-yellow/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-8">
                <span className="font-bold tracking-widest uppercase text-xs opacity-60">{card.brand || 'Card'}</span>
                <div className="w-10 h-6 bg-slate-700/50 rounded flex items-center justify-center border border-white/5">
                  <span className="text-xs">••••</span>
                </div>
              </div>
              
              <div className="font-mono text-xl tracking-[0.25em] mb-4 text-slate-100 flex items-center gap-2">
                <span className="opacity-30">•••• •••• ••••</span>
                <span className="text-figma-yellow font-bold drop-shadow-sm">{card.last4 || '0000'}</span>
              </div>
              
              <div className="flex justify-between items-end mt-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Expires</p>
                  <p className="text-xs font-mono text-slate-300">{card.expiry || '12/28'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Limit</p>
                  <p className="text-sm font-bold text-white font-mono">₹{(card.spending_limit || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
