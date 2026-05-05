// ─── Enums ──────────────────────────────────────────────────────────────────

export type AIProvider = "anthropic" | "openai" | "ollama";
export type AgentStatus = "idle" | "running" | "paused" | "error";
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
export type TradeSide = "BUY" | "SELL";
export type TradeStatus = "open" | "closed" | "cancelled" | "paper";
export type LogLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "ai_decision"
  | "ai_thinking"
  | "trade";
export type KeyProvider =
  | "binance"
  | "kraken"
  | "coinbase"
  | "alpaca"
  | "anthropic"
  | "openai"
  | "other";

// ─── Agent ──────────────────────────────────────────────────────────────────

export interface LastDecision {
  action: "BUY" | "SELL" | "HOLD";
  amount_pct: number;
  reason: string;
  confidence: number;
  symbol: string;
  timestamp: string;
}

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  strategy_prompt: string;
  symbols: string[];
  timeframe: Timeframe;
  ai_provider: AIProvider;
  ai_model: string;
  ai_api_key_id: number | null;
  broker: string;
  is_paper_trading: boolean;
  broker_api_key_id: number | null;
  risk_stop_loss_pct: number;
  risk_take_profit_pct: number;
  risk_max_drawdown_pct: number;
  risk_position_size_pct: number;
  status: AgentStatus;
  is_active: boolean;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  last_decision: LastDecision | null;
  last_run_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  strategy_prompt?: string;
  symbols: string[];
  timeframe?: Timeframe;
  ai_provider?: AIProvider;
  ai_model?: string;
  ai_api_key_id?: number | null;
  broker?: string;
  is_paper_trading?: boolean;
  broker_api_key_id?: number | null;
  risk_stop_loss_pct?: number;
  risk_take_profit_pct?: number;
  risk_max_drawdown_pct?: number;
  risk_position_size_pct?: number;
}

export type AgentUpdate = Partial<AgentCreate>;

// ─── API Key ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: number;
  label: string;
  provider: KeyProvider;
  key_masked: string;
  has_secret: boolean;
  created_at: string;
}

export interface ApiKeyCreate {
  label: string;
  provider: KeyProvider;
  key: string;
  secret?: string;
}

// ─── Trade ───────────────────────────────────────────────────────────────────

export interface Trade {
  id: number;
  agent_id: number;
  symbol: string;
  side: TradeSide;
  order_type: string;
  status: TradeStatus;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_value: number;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  ai_reasoning: string | null;
  ai_confidence: number | null;
  broker_order_id: string | null;
  is_paper: boolean;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export interface AgentLog {
  id: number;
  agent_id: number;
  level: LogLevel;
  message: string;
  meta: Record<string, unknown> | null;
  symbol: string | null;
  created_at: string;
}

// ─── Market Data ─────────────────────────────────────────────────────────────

export interface OHLCVCandle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  ema_20: number | null;
  ema_50: number | null;
  atr: number | null;
  price: number | null;
  price_change_pct: number | null;
}

// ─── System ──────────────────────────────────────────────────────────────────

export interface SystemInfo {
  cpu: { percent: number; per_core: number[]; count: number };
  memory: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; percent: number };
}

// ─── WebSocket messages ───────────────────────────────────────────────────────

export interface WsLog {
  type: "log";
  agent_id: number;
  level: LogLevel;
  message: string;
  symbol: string | null;
  meta: Record<string, unknown>;
}

export interface WsAgentStatus {
  type: "agent_status";
  agent_id: number;
  status: AgentStatus;
}

export type WsMessage = WsLog | WsAgentStatus;
