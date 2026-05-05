import { create } from "zustand";
import type { Agent, WsMessage, AgentLog } from "@/types";

interface AgentStore {
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  upsertAgent: (agent: Agent) => void;
  removeAgent: (id: number) => void;
  updateStatus: (id: number, status: Agent["status"]) => void;

  // Real-time log feed (last 500 messages across all agents)
  liveLogs: AgentLog[];
  appendLog: (log: AgentLog) => void;
  clearLogs: (agentId?: number) => void;

  // Current "AI thinking" buffer per agent (streaming text)
  thinkingBuffers: Record<number, string>;
  appendThinking: (agentId: number, chunk: string) => void;
  clearThinking: (agentId: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  setAgents: (agents) => set({ agents }),
  upsertAgent: (agent) =>
    set((s) => {
      const idx = s.agents.findIndex((a) => a.id === agent.id);
      if (idx === -1) return { agents: [agent, ...s.agents] };
      const next = [...s.agents];
      next[idx] = agent;
      return { agents: next };
    }),
  removeAgent: (id) =>
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  updateStatus: (id, status) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  liveLogs: [],
  appendLog: (log) =>
    set((s) => ({
      liveLogs: [log, ...s.liveLogs].slice(0, 500),
    })),
  clearLogs: (agentId) =>
    set((s) => ({
      liveLogs: agentId
        ? s.liveLogs.filter((l) => l.agent_id !== agentId)
        : [],
    })),

  thinkingBuffers: {},
  appendThinking: (agentId, chunk) =>
    set((s) => ({
      thinkingBuffers: {
        ...s.thinkingBuffers,
        [agentId]: (s.thinkingBuffers[agentId] ?? "") + chunk,
      },
    })),
  clearThinking: (agentId) =>
    set((s) => {
      const next = { ...s.thinkingBuffers };
      delete next[agentId];
      return { thinkingBuffers: next };
    }),
}));
