"use client";
import { useState } from "react";
import { useApiKeys } from "@/hooks/use-agents";
import { keysApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Key, Loader2, ShieldCheck } from "lucide-react";
import type { KeyProvider } from "@/types";

const PROVIDERS: { value: KeyProvider; label: string; needsSecret: boolean }[] = [
  { value: "binance",   label: "Binance",   needsSecret: true },
  { value: "kraken",    label: "Kraken",    needsSecret: true },
  { value: "coinbase",  label: "Coinbase",  needsSecret: true },
  { value: "alpaca",    label: "Alpaca",    needsSecret: true },
  { value: "anthropic", label: "Anthropic", needsSecret: false },
  { value: "openai",    label: "OpenAI",    needsSecret: false },
  { value: "other",     label: "Other",     needsSecret: false },
];

export default function KeysPage() {
  const qc = useQueryClient();
  const { data: keys = [], isLoading } = useApiKeys();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", provider: "binance" as KeyProvider, key: "", secret: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const needsSecret = PROVIDERS.find((p) => p.value === form.provider)?.needsSecret ?? false;

  async function handleSave() {
    setSaving(true);
    await keysApi.create({ label: form.label, provider: form.provider, key: form.key, secret: form.secret || undefined });
    qc.invalidateQueries({ queryKey: ["keys"] });
    setShowAdd(false);
    setForm({ label: "", provider: "binance", key: "", secret: "" });
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this API key?")) return;
    setDeletingId(id);
    await keysApi.delete(id);
    qc.invalidateQueries({ queryKey: ["keys"] });
    setDeletingId(null);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">API Keys</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Encrypted with AES-256 and stored securely in your local database
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Add Key
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/40 rounded-lg px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs text-slate-400">
          All keys are encrypted with Fernet (AES-128) before being stored.
          Keys are never logged or transmitted in plaintext.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-slate-800" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-700/40 rounded-xl">
          <Key className="w-8 h-8 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">No API keys saved yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/40 rounded-xl card-elevated px-4 py-3">
              <div className="p-2 rounded-lg bg-slate-800">
                <Key className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{k.label}</span>
                  <Badge variant="outline" className="text-xs h-4 px-1.5 bg-slate-800 text-slate-400 border-slate-700 capitalize">
                    {k.provider}
                  </Badge>
                  {k.has_secret && (
                    <Badge variant="outline" className="text-xs h-4 px-1.5 bg-slate-800 text-slate-500 border-slate-700">
                      +secret
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{k.key_masked}</p>
              </div>
              <span className="text-xs text-slate-600">{new Date(k.created_at).toLocaleDateString()}</span>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-slate-500 hover:text-rose-400"
                onClick={() => handleDelete(k.id)}
                disabled={deletingId === k.id}
              >
                {deletingId === k.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="bg-slate-900 border-slate-700/50 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Label</Label>
              <Input
                value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. My Binance Account"
                className="bg-slate-800 border-slate-700 h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v as KeyProvider }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">API Key</Label>
              <Input
                type="password" value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="Paste your API key"
                className="bg-slate-800 border-slate-700 h-8 text-sm font-mono"
              />
            </div>
            {needsSecret && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Secret Key</Label>
                <Input
                  type="password" value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  placeholder="Paste your secret key"
                  className="bg-slate-800 border-slate-700 h-8 text-sm font-mono"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-white"
              onClick={handleSave}
              disabled={saving || !form.label || !form.key}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save Encrypted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
