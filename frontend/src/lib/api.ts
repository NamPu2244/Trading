import axios from "axios";
import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  ApiKey,
  ApiKeyCreate,
  Trade,
  AgentLog,
  OHLCVCandle,
  Indicators,
  SystemInfo,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const http = axios.create({ baseURL: BASE, timeout: 15_000 });

// ─── Agents ──────────────────────────────────────────────────────────────────

export const agentsApi = {
  list: () => http.get<Agent[]>("/api/agents").then((r) => r.data),
  get: (id: number) => http.get<Agent>(`/api/agents/${id}`).then((r) => r.data),
  create: (body: AgentCreate) => http.post<Agent>("/api/agents", body).then((r) => r.data),
  update: (id: number, body: AgentUpdate) =>
    http.patch<Agent>(`/api/agents/${id}`, body).then((r) => r.data),
  delete: (id: number) => http.delete(`/api/agents/${id}`),
  setActive: (id: number, is_active: boolean) =>
    http.post<Agent>(`/api/agents/${id}/status`, { is_active }).then((r) => r.data),
  runNow: (id: number) => http.post<Agent>(`/api/agents/${id}/run`).then((r) => r.data),
  trades: (id: number, limit = 50) =>
    http.get<Trade[]>(`/api/agents/${id}/trades`, { params: { limit } }).then((r) => r.data),
  logs: (id: number, limit = 100) =>
    http.get<AgentLog[]>(`/api/agents/${id}/logs`, { params: { limit } }).then((r) => r.data),
};

// ─── API Keys ────────────────────────────────────────────────────────────────

export const keysApi = {
  list: () => http.get<ApiKey[]>("/api/keys").then((r) => r.data),
  create: (body: ApiKeyCreate) => http.post<ApiKey>("/api/keys", body).then((r) => r.data),
  delete: (id: number) => http.delete(`/api/keys/${id}`),
};

// ─── Market Data ─────────────────────────────────────────────────────────────

export const marketApi = {
  ohlcv: (exchange: string, symbol: string, timeframe: string, limit = 200) =>
    http
      .get<OHLCVCandle[]>("/api/market/ohlcv", {
        params: { exchange, symbol, timeframe, limit },
      })
      .then((r) => r.data),

  indicators: (exchange: string, symbol: string, timeframe: string) =>
    http
      .get<Indicators>("/api/market/indicators", { params: { exchange, symbol, timeframe } })
      .then((r) => r.data),
};

// ─── Trades ──────────────────────────────────────────────────────────────────

export const tradesApi = {
  list: (agent_id?: number, limit = 100) =>
    http.get<Trade[]>("/api/trades", { params: { agent_id, limit } }).then((r) => r.data),
  close: (id: number, exit_price?: number) =>
    http
      .post<Trade>(`/api/trades/${id}/close`, null, { params: { exit_price } })
      .then((r) => r.data),
};

// ─── AI Engine ───────────────────────────────────────────────────────────────

export const aiApi = {
  models: () =>
    http
      .get<Record<string, Array<{ id: string; name: string }>>>("/api/ai/models")
      .then((r) => r.data),
};

// ─── System ──────────────────────────────────────────────────────────────────

export const systemApi = {
  info: () => http.get<SystemInfo>("/api/system/info").then((r) => r.data),
};
