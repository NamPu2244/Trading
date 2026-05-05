"use client";
import { useQuery } from "@tanstack/react-query";
import { tradesApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Trade } from "@/types";

function StatusBadge({ status }: { status: Trade["status"] }) {
  const map = {
    open:      "text-blue-400 border-blue-500/30 bg-blue-500/10",
    closed:    "text-slate-400 border-slate-700 bg-slate-800",
    cancelled: "text-slate-600 border-slate-700/40 bg-slate-900",
    paper:     "text-purple-400 border-purple-500/30 bg-purple-500/10",
  };
  return (
    <Badge variant="outline" className={cn("text-xs h-4 px-1.5", map[status])}>
      {status}
    </Badge>
  );
}

export default function TradesPage() {
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["all-trades"],
    queryFn: () => tradesApi.list(undefined, 200),
    refetchInterval: 10_000,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Trade History</h1>
        <p className="text-xs text-slate-500 mt-0.5">{trades.length} trades total</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 bg-slate-800" />)}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex items-center justify-center py-20 border border-dashed border-slate-700/40 rounded-xl">
          <p className="text-slate-600 text-sm">No trades recorded yet</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl card-elevated overflow-hidden">
          <div className="grid grid-cols-8 gap-2 px-4 py-2.5 border-b border-slate-700/40 text-xs font-medium text-slate-500">
            <span>Status</span><span>Side</span><span>Symbol</span>
            <span>Entry</span><span>Exit</span><span>Qty</span>
            <span>PnL</span><span>Time</span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {trades.map((t) => (
              <div key={t.id} className="grid grid-cols-8 gap-2 px-4 py-2.5 hover:bg-slate-800/30 text-xs">
                <StatusBadge status={t.status} />
                <span className={t.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                  {t.side}
                </span>
                <span className="text-slate-300">{t.symbol}</span>
                <span className="text-slate-400">${t.entry_price.toFixed(4)}</span>
                <span className="text-slate-500">{t.exit_price ? `$${t.exit_price.toFixed(4)}` : "—"}</span>
                <span className="text-slate-400">{t.quantity.toFixed(4)}</span>
                <span className={cn(
                  "font-medium",
                  t.pnl === null ? "text-slate-600" :
                  t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {t.pnl === null ? "—" : `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(4)}`}
                </span>
                <span className="text-slate-600">{new Date(t.opened_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
