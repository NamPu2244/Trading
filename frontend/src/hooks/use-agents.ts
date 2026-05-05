"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi, keysApi, aiApi, systemApi } from "@/lib/api";
import type { AgentCreate, AgentUpdate } from "@/types";

const QK = {
  agents: ["agents"] as const,
  agent: (id: number) => ["agents", id] as const,
  trades: (id: number) => ["agents", id, "trades"] as const,
  logs: (id: number) => ["agents", id, "logs"] as const,
  keys: ["keys"] as const,
  models: ["ai-models"] as const,
  system: ["system"] as const,
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export function useAgents() {
  return useQuery({ queryKey: QK.agents, queryFn: agentsApi.list, refetchInterval: 10_000 });
}

export function useAgent(id: number) {
  return useQuery({ queryKey: QK.agent(id), queryFn: () => agentsApi.get(id), refetchInterval: 5_000 });
}

export function useAgentTrades(id: number) {
  return useQuery({ queryKey: QK.trades(id), queryFn: () => agentsApi.trades(id), refetchInterval: 10_000 });
}

export function useAgentLogs(id: number) {
  return useQuery({ queryKey: QK.logs(id), queryFn: () => agentsApi.logs(id), refetchInterval: 5_000 });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentCreate) => agentsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.agents }),
  });
}

export function useUpdateAgent(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentUpdate) => agentsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.agents });
      qc.invalidateQueries({ queryKey: QK.agent(id) });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.agents }),
  });
}

export function useSetAgentActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      agentsApi.setActive(id, is_active),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.agents });
      qc.invalidateQueries({ queryKey: QK.agent(id) });
    },
  });
}

export function useRunAgentNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentsApi.runNow(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.agents });
      qc.invalidateQueries({ queryKey: QK.agent(id) });
      qc.invalidateQueries({ queryKey: QK.logs(id) });
    },
  });
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export function useApiKeys() {
  return useQuery({ queryKey: QK.keys, queryFn: keysApi.list });
}

// ─── AI Models ───────────────────────────────────────────────────────────────

export function useAiModels() {
  return useQuery({ queryKey: QK.models, queryFn: aiApi.models, staleTime: Infinity });
}

// ─── System ──────────────────────────────────────────────────────────────────

export function useSystemInfo() {
  return useQuery({ queryKey: QK.system, queryFn: systemApi.info, refetchInterval: 5_000 });
}
