"use client";
import { useState } from "react";
import type { Agent, AgentCreate, Timeframe, AIProvider } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, X, Plus } from "lucide-react";
import { useCreateAgent, useUpdateAgent, useApiKeys, useAiModels } from "@/hooks/use-agents";
import { cn } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic (Cloud)" },
  { value: "openai", label: "OpenAI (Cloud)" },
  { value: "ollama", label: "Ollama (Local)" },
];
const BROKERS = ["binance", "kraken", "bybit", "okx", "coinbasepro", "bitfinex"];

interface Props {
  open: boolean;
  onClose: () => void;
  agent?: Agent;
}

const DEFAULTS: AgentCreate = {
  name: "",
  description: "",
  strategy_prompt:
    "Analyze the provided OHLCV data and technical indicators. " +
    "Return a JSON trading decision with action (BUY/SELL/HOLD), amount_pct (0-100), and reason.",
  symbols: ["BTC/USDT"],
  timeframe: "1h",
  ai_provider: "anthropic",
  ai_model: "claude-sonnet-4-6",
  broker: "binance",
  is_paper_trading: true,
  risk_stop_loss_pct: 2,
  risk_take_profit_pct: 4,
  risk_max_drawdown_pct: 10,
  risk_position_size_pct: 10,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</p>
      <Separator className="bg-slate-700/50" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

export function AgentForm({ open, onClose, agent }: Props) {
  const isEdit = !!agent;
  const [form, setForm] = useState<AgentCreate>(
    agent
      ? {
          name: agent.name,
          description: agent.description ?? "",
          strategy_prompt: agent.strategy_prompt,
          symbols: agent.symbols,
          timeframe: agent.timeframe,
          ai_provider: agent.ai_provider,
          ai_model: agent.ai_model,
          ai_api_key_id: agent.ai_api_key_id ?? undefined,
          broker: agent.broker,
          is_paper_trading: agent.is_paper_trading,
          broker_api_key_id: agent.broker_api_key_id ?? undefined,

          risk_stop_loss_pct: agent.risk_stop_loss_pct,
          risk_take_profit_pct: agent.risk_take_profit_pct,
          risk_max_drawdown_pct: agent.risk_max_drawdown_pct,
          risk_position_size_pct: agent.risk_position_size_pct,
        }
      : DEFAULTS
  );
  const [symbolInput, setSymbolInput] = useState("");

  const { data: keys = [] } = useApiKeys();
  const { data: models = {} } = useAiModels();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent(agent?.id ?? 0);

  const providerModels: Array<{ id: string; name: string }> = (form.ai_provider ? models[form.ai_provider] : undefined) ?? [];

  function set<K extends keyof AgentCreate>(key: K, value: AgentCreate[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSymbol() {
    const s = symbolInput.trim().toUpperCase();
    if (s && !form.symbols.includes(s)) {
      set("symbols", [...form.symbols, s]);
    }
    setSymbolInput("");
  }

  function removeSymbol(s: string) {
    set("symbols", form.symbols.filter((sym) => sym !== s));
  }

  async function handleSubmit() {
    const payload = { ...form };
    if (isEdit) {
      await updateAgent.mutateAsync(payload);
    } else {
      await createAgent.mutateAsync(payload);
    }
    onClose();
  }

  const pending = createAgent.isPending || updateAgent.isPending;
  const error = createAgent.error?.message ?? updateAgent.error?.message;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700/50 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? `Edit Agent — ${agent.name}` : "Create New Agent"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Basic ─────────────────────────────────────────────────── */}
          <SectionTitle>Identity</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. BTC Momentum"
                className="bg-slate-800 border-slate-700/60 text-sm h-8"
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional"
                className="bg-slate-800 border-slate-700/60 text-sm h-8"
              />
            </Field>
          </div>

          {/* ── Strategy ──────────────────────────────────────────────── */}
          <SectionTitle>Strategy</SectionTitle>
          <Field label="Strategy Prompt">
            <textarea
              value={form.strategy_prompt}
              onChange={(e) => set("strategy_prompt", e.target.value)}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {/* Symbols */}
            <Field label="Trading Symbols">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSymbol())}
                    placeholder="BTC/USDT"
                    className="bg-slate-800 border-slate-700/60 text-sm h-8"
                  />
                  <Button
                    type="button" size="icon" variant="outline"
                    className="h-8 w-8 border-slate-700/60 bg-slate-800 hover:bg-slate-700 rounded-lg"
                    onClick={addSymbol}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.symbols.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs bg-slate-800 border-slate-700/60 gap-1 pr-1">
                      {s}
                      <button onClick={() => removeSymbol(s)}>
                        <X className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="Timeframe">
              <Select value={form.timeframe} onValueChange={(v) => set("timeframe", v as Timeframe)}>
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf} className="text-sm">{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ── AI ────────────────────────────────────────────────────── */}
          <SectionTitle>AI Configuration</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider">
              <Select value={form.ai_provider} onValueChange={(v) => {
                set("ai_provider", v as AIProvider);
                const firstModel = (models[v as AIProvider] ?? [])[0]?.id;
                if (firstModel) set("ai_model", firstModel);
              }}>
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Model">
              <Select value={(form.ai_model ?? undefined) as string} onValueChange={(v) => set("ai_model", v ?? undefined)}>
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  {providerModels.length > 0 ? (
                    providerModels.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-sm">{m.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={form.ai_model} className="text-sm">{form.ai_model}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="AI API Key (optional)">
              <Select
                value={form.ai_api_key_id?.toString() ?? "env"}
                onValueChange={(v) => set("ai_api_key_id", v === "env" ? undefined : Number(v))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  <SelectItem value="env" className="text-sm">Use environment variable</SelectItem>
                  {keys.filter((k) => ["anthropic", "openai"].includes(k.provider)).map((k) => (
                    <SelectItem key={k.id} value={k.id.toString()} className="text-sm">
                      {k.label} ({k.key_masked})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ── Broker ────────────────────────────────────────────────── */}
          <SectionTitle>Broker</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exchange">
              <Select value={(form.broker ?? undefined) as string} onValueChange={(v) => set("broker", v ?? undefined)}>
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  {BROKERS.map((b) => (
                    <SelectItem key={b} value={b} className="text-sm capitalize">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Mode">
              <Select
                value={form.is_paper_trading ? "paper" : "live"}
                onValueChange={(v) => set("is_paper_trading", v === "paper")}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700/60">
                  <SelectItem value="paper" className="text-sm">Paper Trading (Safe)</SelectItem>
                  <SelectItem value="live" className="text-sm">Live Trading</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {!form.is_paper_trading && (
              <Field label="Broker API Key">
                <Select
                  value={form.broker_api_key_id?.toString() ?? "none"}
                  onValueChange={(v) => set("broker_api_key_id", v === "none" ? undefined : Number(v))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700/60 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700/60">
                    <SelectItem value="none" className="text-sm">Select a key...</SelectItem>
                    {keys.filter((k) => !["anthropic", "openai"].includes(k.provider)).map((k) => (
                      <SelectItem key={k.id} value={k.id.toString()} className="text-sm">
                        {k.label} ({k.key_masked})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {/* ── Risk ──────────────────────────────────────────────────── */}
          <SectionTitle>Risk Management</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "risk_stop_loss_pct" as const, label: "Stop Loss %" },
              { key: "risk_take_profit_pct" as const, label: "Take Profit %" },
              { key: "risk_max_drawdown_pct" as const, label: "Max Drawdown %" },
              { key: "risk_position_size_pct" as const, label: "Position Size %" },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="100"
                  value={form[key]}
                  onChange={(e) => set(key, parseFloat(e.target.value))}
                  className="bg-slate-800 border-slate-700/60 text-sm h-8"
                />
              </Field>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg"
            onClick={handleSubmit}
            disabled={pending || !form.name || form.symbols.length === 0}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {isEdit ? "Save Changes" : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
