"use client";
import type { Agent } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Activity, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { agents: Agent[] }

export function StatsOverview({ agents }: Props) {
  const active     = agents.filter((a) => a.is_active).length;
  const totalPnl   = agents.reduce((s, a) => s + a.total_pnl, 0);
  const totalTrades = agents.reduce((s, a) => s + a.total_trades, 0);
  const avgWinRate = agents.length > 0
    ? agents.reduce((s, a) => s + a.win_rate, 0) / agents.length
    : 0;

  const stats = [
    {
      label: "Total Agents",
      value: agents.length.toString(),
      sub: `${active} active`,
      icon: Bot,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10 border-blue-400/15",
    },
    {
      label: "Active Now",
      value: active.toString(),
      sub: `${agents.length - active} idle`,
      icon: Activity,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-400/10 border-emerald-400/15",
    },
    {
      label: "Total PnL",
      value: totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`,
      sub: `${totalTrades} trades`,
      icon: TrendingUp,
      iconColor: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400",
      iconBg: totalPnl >= 0 ? "bg-emerald-400/10 border-emerald-400/15" : "bg-rose-400/10 border-rose-400/15",
      valueColor: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      label: "Avg Win Rate",
      value: `${avgWinRate.toFixed(1)}%`,
      sub: "across all agents",
      icon: Target,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-400/10 border-violet-400/15",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg, valueColor }) => (
        <Card
          key={label}
          className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <p className={cn("text-[1.75rem] font-light leading-none tabular", valueColor ?? "text-slate-100")}>
                  {value}
                </p>
                <p className="text-xs text-slate-600">{sub}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl border shrink-0", iconBg)}>
                <Icon className={cn("w-4 h-4", iconColor)} strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
