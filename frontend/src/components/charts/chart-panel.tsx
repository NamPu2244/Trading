"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { marketApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import type { Trade, Timeframe } from "@/types";

// Dynamic import — Lightweight Charts accesses the DOM, can't run on server
const CandlestickChart = dynamic(
  () => import("./candlestick-chart").then((m) => ({ default: m.CandlestickChart })),
  { ssr: false, loading: () => <Skeleton className="h-[460px] w-full bg-slate-800" /> }
);

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const EXCHANGES = ["binance", "kraken", "bybit", "okx"];

interface Props {
  defaultSymbol?: string;
  defaultTimeframe?: Timeframe;
  defaultExchange?: string;
  trades?: Trade[];
}

export function ChartPanel({
  defaultSymbol = "BTC/USDT",
  defaultTimeframe = "1h",
  defaultExchange = "binance",
  trades = [],
}: Props) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [exchange, setExchange] = useState(defaultExchange);

  const { data: candles = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ohlcv", exchange, symbol, timeframe],
    queryFn: () => marketApi.ohlcv(exchange, symbol, timeframe, 300),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Filter trades to only show ones for this symbol
  const chartTrades = trades.filter(
    (t) => t.symbol.replace("/", "") === symbol.replace("/", "")
  );

  const currentPrice = candles.length > 0
    ? candles[candles.length - 1].close
    : null;

  const priceChange = candles.length > 1
    ? ((candles[candles.length - 1].close - candles[candles.length - 2].close)
      / candles[candles.length - 2].close) * 100
    : null;

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Symbol input */}
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 w-28 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-mono"
          placeholder="BTC/USDT"
        />

        {/* Exchange */}
        <Select value={exchange} onValueChange={(v) => setExchange(v ?? exchange)}>
          <SelectTrigger className="bg-slate-800 border-slate-700/50 h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700/50">
            {EXCHANGES.map((ex) => (
              <SelectItem key={ex} value={ex} className="text-xs capitalize">{ex}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Timeframe pills */}
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                tf === timeframe
                  ? "bg-slate-700/80 text-slate-100 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-300 ml-auto"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>

        {/* Price display */}
        {currentPrice !== null && (
          <div className="flex items-center gap-2 text-sm ml-2">
            <span className="text-slate-100 font-mono font-semibold">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
            </span>
            {priceChange !== null && (
              <span className={priceChange >= 0 ? "text-emerald-400 text-xs" : "text-rose-400 text-xs"}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-[460px] w-full bg-slate-800/60 rounded-xl" />
      ) : candles.length === 0 ? (
        <div className="h-[460px] flex items-center justify-center border border-slate-800 rounded-lg">
          <p className="text-slate-600 text-sm">No data available for {symbol}</p>
        </div>
      ) : (
        <CandlestickChart
          candles={candles}
          trades={chartTrades}
          height={420}
          showEMA
          showVolume
        />
      )}

      {/* Stats row below chart */}
      {candles.length > 0 && (() => {
        const last = candles[candles.length - 1];
        const dayCandles = candles.slice(-24);
        const high24 = Math.max(...dayCandles.map((c) => c.high));
        const low24 = Math.min(...dayCandles.map((c) => c.low));
        const vol24 = dayCandles.reduce((s, c) => s + c.volume, 0);

        return (
          <div className="grid grid-cols-4 gap-3 text-xs">
            {[
              { label: "24h High", value: `$${high24.toFixed(4)}`, color: "text-emerald-400" },
              { label: "24h Low", value: `$${low24.toFixed(4)}`, color: "text-rose-400" },
              { label: "24h Volume", value: vol24.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: "text-slate-300" },
              { label: "Candles", value: `${candles.length}`, color: "text-slate-300" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/80 border border-slate-700/40 rounded-xl card-elevated p-2.5">
                <p className="text-slate-600">{label}</p>
                <p className={`font-mono font-medium mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
