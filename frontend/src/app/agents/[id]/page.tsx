"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useAgent, useAgentTrades, useSetAgentActive, useRunAgentNow } from "@/hooks/use-agents";
import { LogStream } from "@/components/agents/log-stream";
import { AgentForm } from "@/components/agents/agent-form";
import { ChartPanel } from "@/components/charts/chart-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Play, Square, Zap, Edit, Bot, TrendingUp, TrendingDown,
  Loader2, AlertCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trade } from "@/types";

function PnlBadge({ pnl, pct }: { pnl: number | null; pct: number | null }) {
  if (pnl === null) return <span className="text-slate-600 text-xs">—</span>;
  const pos = pnl >= 0;
  return (
    <span className={cn("text-xs font-medium", pos ? "text-emerald-400" : "text-rose-400")}>
      {pos ? "+" : ""}${pnl.toFixed(4)} ({pos ? "+" : ""}{(pct ?? 0).toFixed(2)}%)
    </span>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="grid grid-cols-6 gap-3 px-4 py-2.5 hover:bg-slate-800/50 rounded-lg text-xs">
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn("text-xs h-4 px-1",
            trade.side === "BUY"
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              : "text-rose-400 border-rose-500/30 bg-rose-500/10"
          )}
        >
          {trade.side}
        </Badge>
      </div>
      <span className="text-slate-300">{trade.symbol}</span>
      <span className="text-slate-400">${trade.entry_price.toFixed(4)}</span>
      <span className="text-slate-400">{trade.quantity.toFixed(6)}</span>
      <PnlBadge pnl={trade.pnl} pct={trade.pnl_pct} />
      <span className="text-slate-600 truncate">
        {trade.ai_reasoning?.slice(0, 40) ?? "—"}
      </span>
    </div>
  );
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agentId = Number(id);
  const { data: agent, isLoading } = useAgent(agentId);
  const { data: trades = [] } = useAgentTrades(agentId);
  const setActive = useSetAgentActive();
  const runNow = useRunAgentNow();
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-32 bg-slate-800" />
        <Skeleton className="h-64 bg-slate-800" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-8 h-8 text-slate-600 mb-3" />
        <p className="text-slate-500">Agent not found</p>
        <Link href="/agents" className="mt-4">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-400">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
          </Button>
        </Link>
      </div>
    );
  }

  const isRunning = agent.status === "running";
  const pnlPos = agent.total_pnl >= 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/agents">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-100">{agent.name}</h1>
              <Badge
                variant="outline"
                className={cn("text-xs",
                  agent.status === "running" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                  agent.status === "error" ? "text-rose-400 border-rose-500/30 bg-rose-500/10" :
                  "text-slate-400 border-slate-700 bg-slate-800"
                )}
              >
                {agent.status}
              </Badge>
              {agent.is_paper_trading && (
                <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30 bg-blue-500/10">
                  Paper
                </Badge>
              )}
            </div>
            {agent.description && (
              <p className="text-xs text-slate-500 mt-0.5">{agent.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="h-8 px-3 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            onClick={() => setShowEdit(true)}
          >
            <Edit className="w-3 h-3 mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline" size="sm"
            className="h-8 px-3 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            onClick={() => runNow.mutate(agentId)}
            disabled={runNow.isPending || !agent.is_active}
          >
            {runNow.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Zap className="w-3 h-3 mr-1.5" />}
            Run Now
          </Button>
          <Button
            size="sm"
            className={cn("h-8 px-3 text-xs gap-1.5",
              agent.is_active
                ? "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-emerald-500 hover:bg-emerald-400 text-white"
            )}
            onClick={() => setActive.mutate({ id: agent.id, is_active: !agent.is_active })}
            disabled={setActive.isPending}
          >
            {setActive.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : agent.is_active ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Start</>
            }
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total PnL",
            value: (
              <span className={cn("flex items-center gap-1", pnlPos ? "text-emerald-400" : "text-rose-400")}>
                {pnlPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {pnlPos ? "+" : ""}${agent.total_pnl.toFixed(2)}
              </span>
            ),
          },
          { label: "Total Trades", value: agent.total_trades },
          { label: "Win Rate", value: `${agent.win_rate.toFixed(1)}%` },
          {
            label: "Last Run",
            value: agent.last_run_at
              ? new Date(agent.last_run_at).toLocaleTimeString()
              : "Never",
          },
        ].map(({ label, value }) => (
          <Card key={label} className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-base font-semibold text-slate-100">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error */}
      {agent.error_message && (
        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-400">{agent.error_message}</p>
        </div>
      )}

      {/* Last Decision */}
      {agent.last_decision && (
        <Card className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Last AI Decision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn("text-sm px-3 py-0.5",
                  agent.last_decision.action === "BUY"
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : agent.last_decision.action === "SELL"
                    ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
                    : "text-slate-400 border-slate-600 bg-slate-800"
                )}
              >
                {agent.last_decision.action}
              </Badge>
              <span className="text-sm text-slate-400">{agent.last_decision.symbol}</span>
              <span className="text-sm text-slate-500">
                {agent.last_decision.amount_pct.toFixed(1)}% position
              </span>
              <span className="text-xs text-slate-600 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(agent.last_decision.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-slate-300">{agent.last_decision.reason}</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-slate-800 rounded-full flex-1">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${agent.last_decision.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">
                {(agent.last_decision.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="chart">
        <TabsList className="bg-slate-900/80 border border-slate-700/40 rounded-xl">
          <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Live Logs</TabsTrigger>
          <TabsTrigger value="trades" className="text-xs">Trade History</TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <ChartPanel
            defaultSymbol={agent.symbols[0] ?? "BTC/USDT"}
            defaultTimeframe={agent.timeframe}
            defaultExchange={agent.broker}
            trades={trades}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogStream agentId={agentId} maxHeight="500px" />
        </TabsContent>

        <TabsContent value="trades" className="mt-4">
          {trades.length === 0 ? (
            <div className="flex items-center justify-center py-12 border border-dashed border-slate-700/40 rounded-xl">
              <p className="text-slate-600 text-sm">No trades yet</p>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl card-elevated overflow-hidden">
              <div className="grid grid-cols-6 gap-3 px-4 py-2 border-b border-slate-700/40 text-xs text-slate-500 font-medium">
                <span>Side</span>
                <span>Symbol</span>
                <span>Entry Price</span>
                <span>Quantity</span>
                <span>PnL</span>
                <span>Reason</span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {trades.map((t) => <TradeRow key={t.id} trade={t} />)}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["AI Provider", agent.ai_provider],
                  ["AI Model", agent.ai_model],
                  ["Broker", agent.broker],
                  ["Timeframe", agent.timeframe],
                  ["Symbols", agent.symbols.join(", ")],
                  ["Mode", agent.is_paper_trading ? "Paper Trading" : "Live"],
                  ["Stop Loss", `${agent.risk_stop_loss_pct}%`],
                  ["Take Profit", `${agent.risk_take_profit_pct}%`],
                  ["Max Drawdown", `${agent.risk_max_drawdown_pct}%`],
                  ["Position Size", `${agent.risk_position_size_pct}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-slate-200 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1.5">Strategy Prompt</p>
                <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
                  {agent.strategy_prompt}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showEdit && (
        <AgentForm open agent={agent} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
