"use client";
import { useState } from "react";
import Link from "next/link";
import type { Agent } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play, Square, Zap, Bot, AlertCircle, Clock,
  TrendingUp, TrendingDown, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetAgentActive, useRunAgentNow } from "@/hooks/use-agents";

const STATUS_CFG: Record<Agent["status"], { dot: string; label: string; badge: string }> = {
  idle:    { dot: "bg-slate-500",                     label: "Idle",    badge: "bg-slate-800/80 text-slate-400 border-slate-600/40" },
  running: { dot: "bg-emerald-400 status-dot-running", label: "Running", badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/25" },
  paused:  { dot: "bg-amber-400",                     label: "Paused",  badge: "bg-amber-400/10 text-amber-400 border-amber-400/25" },
  error:   { dot: "bg-rose-500",                      label: "Error",   badge: "bg-rose-500/10 text-rose-400 border-rose-500/25" },
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude", openai: "GPT", ollama: "Local",
};

export function AgentCard({ agent }: { agent: Agent }) {
  const { mutate: setActive, isPending: toggling } = useSetAgentActive();
  const { mutate: runNow,   isPending: running   } = useRunAgentNow();
  const [justRan, setJustRan] = useState(false);
  const status   = STATUS_CFG[agent.status];
  const pnlPos   = agent.total_pnl >= 0;

  function handleToggle() { setActive({ id: agent.id, is_active: !agent.is_active }); }
  function handleRunNow() {
    runNow(agent.id, {
      onSuccess: () => { setJustRan(true); setTimeout(() => setJustRan(false), 3000); },
    });
  }

  return (
    <Card className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated card-hover">
      <CardContent className="p-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", status.dot)} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-100 truncate">{agent.name}</p>
              {agent.description && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{agent.description}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] h-5 px-2 shrink-0 font-medium rounded-md", status.badge)}>
            {status.label}
          </Badge>
        </div>

        {/* ── Badges ── */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] h-5 px-2 bg-slate-800/60 text-slate-400 border-slate-600/40 rounded-md font-medium">
            <Bot className="w-3 h-3 mr-1" />
            {PROVIDER_LABELS[agent.ai_provider] ?? agent.ai_provider}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-5 px-2 bg-slate-800/60 text-slate-400 border-slate-600/40 rounded-md font-medium">
            {agent.timeframe}
          </Badge>
          {agent.is_paper_trading && (
            <Badge variant="outline" className="text-[10px] h-5 px-2 bg-blue-400/8 text-blue-400 border-blue-400/20 rounded-md font-medium">
              Paper
            </Badge>
          )}
          {agent.symbols.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] h-5 px-2 bg-slate-800/60 text-slate-400 border-slate-600/40 rounded-md font-mono">
              {s}
            </Badge>
          ))}
          {agent.symbols.length > 2 && (
            <Badge variant="outline" className="text-[10px] h-5 px-2 bg-slate-800/60 text-slate-500 border-slate-600/40 rounded-md">
              +{agent.symbols.length - 2}
            </Badge>
          )}
        </div>

        {/* ── PnL Stats ── */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-700/30">
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">PnL</p>
            <p className={cn("text-sm font-semibold flex items-center gap-0.5 tabular",
              pnlPos ? "text-emerald-400" : "text-rose-400"
            )}>
              {pnlPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pnlPos ? "+" : ""}${agent.total_pnl.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Trades</p>
            <p className="text-sm font-semibold text-slate-200 tabular">{agent.total_trades}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Win</p>
            <p className="text-sm font-semibold text-slate-200 tabular">{agent.win_rate.toFixed(1)}%</p>
          </div>
        </div>

        {/* ── Last AI Decision ── */}
        {agent.last_decision && (
          <div className="bg-slate-800/50 rounded-xl p-3 space-y-2 border border-slate-700/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Last Decision
              </span>
              <Badge
                variant="outline"
                className={cn("text-[10px] h-4 px-1.5 font-semibold rounded",
                  agent.last_decision.action === "BUY"  ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/8" :
                  agent.last_decision.action === "SELL" ? "text-rose-400 border-rose-400/25 bg-rose-400/8" :
                                                          "text-slate-400 border-slate-600/40 bg-slate-800"
                )}
              >
                {agent.last_decision.action}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {agent.last_decision.reason}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">{agent.last_decision.symbol}</span>
              <span className="text-[10px] text-slate-600 tabular">
                {(agent.last_decision.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {agent.error_message && (
          <div className="flex items-start gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-300 line-clamp-2 leading-relaxed">{agent.error_message}</p>
          </div>
        )}

        {/* ── Last run ── */}
        {agent.last_run_at && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Clock className="w-3 h-3" />
            <span>Last run {new Date(agent.last_run_at).toLocaleTimeString()}</span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 pt-1">
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 px-3 text-xs gap-1.5 rounded-lg font-medium transition-all",
                  agent.is_active
                    ? "bg-slate-800 border-slate-600/50 text-slate-300 hover:bg-slate-700"
                    : "bg-emerald-400/10 text-emerald-400 border-emerald-400/25 hover:bg-emerald-400/15"
                )}
                onClick={handleToggle}
                disabled={toggling}
              >
                {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> :
                  agent.is_active ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {agent.is_active ? "Stop" : "Start"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{agent.is_active ? "Stop agent" : "Start agent"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs gap-1.5 rounded-lg font-medium border-slate-600/50 bg-slate-800 text-slate-300 hover:bg-slate-700"
                onClick={handleRunNow}
                disabled={running || !agent.is_active}
              >
                {running ? <Loader2 className="w-3 h-3 animate-spin" /> :
                  <Zap className={cn("w-3 h-3", justRan && "text-amber-400")} />}
                Run Now
              </Button>
            </TooltipTrigger>
            <TooltipContent>Trigger one cycle immediately</TooltipContent>
          </Tooltip>

          <Link href={`/agents/${agent.id}`} className="ml-auto">
            <Button
              size="sm" variant="ghost"
              className="h-7 px-2 text-slate-500 hover:text-slate-300 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
