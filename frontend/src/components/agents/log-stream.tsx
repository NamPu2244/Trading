"use client";
import { useEffect, useRef } from "react";
import { useAgentStore } from "@/store/agents";
import { useAgentLogs } from "@/hooks/use-agents";
import { cn } from "@/lib/utils";
import type { LogLevel } from "@/types";

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug:       "text-slate-600",
  info:        "text-slate-400",
  warning:     "text-amber-400",
  error:       "text-rose-400",
  ai_decision: "text-blue-300 font-semibold",
  ai_thinking: "text-violet-300 italic",
  trade:       "text-emerald-300 font-semibold",
};

const LEVEL_TAG: Record<LogLevel, string> = {
  debug:       "DBG",
  info:        "INF",
  warning:     "WRN",
  error:       "ERR",
  ai_decision: " AI",
  ai_thinking: "THK",
  trade:       "TRD",
};

const LEVEL_TAG_STYLES: Record<LogLevel, string> = {
  debug:       "bg-slate-800 text-slate-600",
  info:        "bg-slate-800 text-slate-500",
  warning:     "bg-amber-400/10 text-amber-400",
  error:       "bg-rose-500/10 text-rose-400",
  ai_decision: "bg-blue-400/10 text-blue-300",
  ai_thinking: "bg-violet-400/10 text-violet-300",
  trade:       "bg-emerald-400/10 text-emerald-300",
};

interface Props { agentId: number; maxHeight?: string }

export function LogStream({ agentId, maxHeight = "420px" }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: historicalLogs } = useAgentLogs(agentId);
  const liveLogs     = useAgentStore((s) => s.liveLogs.filter((l) => l.agent_id === agentId));
  const thinkingBuf  = useAgentStore((s) => s.thinkingBuffers[agentId]);

  const historicalIds = new Set((historicalLogs ?? []).map((l) => l.id));
  const newLiveLogs   = liveLogs.filter((l) => !historicalIds.has(l.id));
  const allLogs       = [...(historicalLogs ?? []), ...newLiveLogs];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allLogs.length, thinkingBuf]);

  return (
    <div
      className="bg-[oklch(0.075_0.015_252)] rounded-xl border border-slate-700/40 font-mono text-[11px] leading-relaxed overflow-y-auto"
      style={{ maxHeight }}
    >
      {/* Header bar */}
      <div className="sticky top-0 flex items-center gap-2 px-4 py-2 bg-slate-900/90 border-b border-slate-700/40 backdrop-blur-sm z-10">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 ml-1">
          Agent Log — {allLogs.length} entries
        </span>
      </div>

      <div className="p-4 space-y-0.5">
        {allLogs.length === 0 && !thinkingBuf && (
          <p className="text-slate-600 italic py-4 text-center">
            Waiting for agent activity…
          </p>
        )}

        {allLogs.map((log) => (
          <div key={`${log.id}-${log.created_at}`} className="flex gap-3 py-0.5 hover:bg-slate-800/20 rounded px-1 -mx-1 group">
            <span className="text-slate-700 shrink-0 tabular w-16 group-hover:text-slate-600">
              {new Date(log.created_at).toLocaleTimeString("en", { hour12: false })}
            </span>
            <span className={cn("shrink-0 px-1.5 rounded text-[9px] font-bold uppercase my-auto", LEVEL_TAG_STYLES[log.level])}>
              {LEVEL_TAG[log.level]}
            </span>
            {log.symbol && (
              <span className="text-slate-600 shrink-0 font-mono">[{log.symbol}]</span>
            )}
            <span className={cn(LEVEL_STYLES[log.level], "break-all")}>
              {log.message}
            </span>
          </div>
        ))}

        {/* Live thinking stream */}
        {thinkingBuf && (
          <div className="flex gap-3 py-0.5 px-1 -mx-1">
            <span className="text-slate-700 shrink-0 tabular w-16">
              {new Date().toLocaleTimeString("en", { hour12: false })}
            </span>
            <span className="shrink-0 px-1.5 rounded text-[9px] font-bold uppercase my-auto bg-violet-400/10 text-violet-300">
              THK
            </span>
            <span className="text-violet-300 italic break-all">{thinkingBuf}</span>
            <span className="text-violet-400 animate-pulse ml-0.5">▋</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
