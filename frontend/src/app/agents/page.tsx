"use client";
import { useState } from "react";
import Link from "next/link";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";
import { AgentForm } from "@/components/agents/agent-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Trash2, Edit, ChevronRight, Bot, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

const STATUS_COLORS: Record<Agent["status"], string> = {
  idle:    "bg-slate-800 text-slate-400 border-slate-700",
  running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  paused:  "bg-amber-500/10 text-amber-400 border-amber-500/30",
  error:   "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export default function AgentsPage() {
  const { data: agents = [], isLoading } = useAgents();
  const deleteAgent = useDeleteAgent();
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(agent: Agent) {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setDeletingId(agent.id);
    await deleteAgent.mutateAsync(agent.id);
    setDeletingId(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Agents</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your trading profiles</p>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          New Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-slate-800/50" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-700/40 rounded-xl">
          <Bot className="w-8 h-8 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">No agents configured</p>
          <Button
            size="sm"
            className="mt-4 h-8 px-3 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/40 hover:border-slate-600/60 rounded-xl px-4 py-3 transition-colors card-elevated"
            >
              {/* Status dot */}
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                agent.status === "running" ? "bg-emerald-400 animate-pulse" :
                agent.status === "error" ? "bg-rose-500" :
                agent.status === "paused" ? "bg-amber-400" : "bg-slate-600"
              )} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{agent.name}</span>
                  <Badge variant="outline" className={cn("text-xs h-4 px-1.5", STATUS_COLORS[agent.status])}>
                    {agent.status}
                  </Badge>
                  {agent.is_paper_trading && (
                    <Badge variant="outline" className="text-xs h-4 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/30">
                      Paper
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{agent.broker} · {agent.timeframe}</span>
                  <span className="text-xs text-slate-600">{agent.symbols.join(", ")}</span>
                  {agent.error_message && (
                    <span className="flex items-center gap-1 text-xs text-rose-400">
                      <AlertCircle className="w-3 h-3" />
                      {agent.error_message.slice(0, 60)}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
                <div>
                  <p className="text-xs text-slate-600">PnL</p>
                  <p className={cn("text-sm font-semibold",
                    agent.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {agent.total_pnl >= 0 ? "+" : ""}${agent.total_pnl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Trades</p>
                  <p className="text-sm font-semibold text-slate-200">{agent.total_trades}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-slate-200"
                  onClick={() => setEditAgent(agent)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-rose-400"
                  onClick={() => handleDelete(agent)}
                  disabled={deletingId === agent.id || agent.is_active}
                >
                  {deletingId === agent.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </Button>
                <Link href={`/agents/${agent.id}`}>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-200">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <AgentForm open={showCreate} onClose={() => setShowCreate(false)} />
      {editAgent && (
        <AgentForm open agent={editAgent} onClose={() => setEditAgent(null)} />
      )}
    </div>
  );
}
