"use client";
import { useState } from "react";
import { useAgents } from "@/hooks/use-agents";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { AgentCard } from "@/components/dashboard/agent-card";
import { SystemMonitor } from "@/components/dashboard/system-monitor";
import { AgentForm } from "@/components/agents/agent-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const { data: agents = [], isLoading, refetch, isFetching } = useAgents();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-300"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 bg-slate-800" />)}
        </div>
      ) : (
        <StatsOverview agents={agents} />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Agent cards */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Agents
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 bg-slate-800" />)}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-700/40 rounded-xl">
              <p className="text-slate-500 text-sm">No agents yet</p>
              <p className="text-slate-600 text-xs mt-1">Create your first trading agent to get started</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            System
          </h2>
          <SystemMonitor />
        </div>
      </div>

      <AgentForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
