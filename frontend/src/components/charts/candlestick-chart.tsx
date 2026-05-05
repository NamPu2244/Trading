"use client";
import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type SeriesType,
} from "lightweight-charts";
import type { OHLCVCandle, Trade } from "@/types";

// ── Dark theme matching our zinc palette ──────────────────────────────────────
const CHART_THEME = {
  layout: {
    background: { color: "#09090b" },       // zinc-950
    textColor: "#71717a",                   // zinc-500
  },
  grid: {
    vertLines: { color: "#18181b" },        // zinc-900
    horzLines: { color: "#18181b" },
  },
  crosshair: {
    vertLine: { color: "#52525b", labelBackgroundColor: "#27272a" },
    horzLine: { color: "#52525b", labelBackgroundColor: "#27272a" },
  },
  timeScale: {
    borderColor: "#27272a",                 // zinc-800
    timeVisible: true,
    secondsVisible: false,
  },
  rightPriceScale: { borderColor: "#27272a" },
};

// ── Candle colors ─────────────────────────────────────────────────────────────
const CANDLE_OPTS = {
  upColor: "#10b981",         // emerald-500
  downColor: "#f43f5e",       // rose-500
  borderUpColor: "#10b981",
  borderDownColor: "#f43f5e",
  wickUpColor: "#10b981",
  wickDownColor: "#f43f5e",
};

// ── Volume colors ─────────────────────────────────────────────────────────────
function volColor(candle: OHLCVCandle): string {
  return candle.close >= candle.open
    ? "rgba(16,185,129,0.3)"   // emerald, semi-transparent
    : "rgba(244,63,94,0.3)";   // rose
}

// ── Trade marker builder ──────────────────────────────────────────────────────
function buildMarkers(trades: Trade[]): SeriesMarker<Time>[] {
  return trades
    .filter((t) => t.entry_price > 0)
    .map((t) => ({
      time: Math.floor(new Date(t.opened_at).getTime() / 1000) as Time,
      position: t.side === "BUY" ? "belowBar" : "aboveBar",
      color: t.side === "BUY" ? "#10b981" : "#f43f5e",
      shape: t.side === "BUY" ? "arrowUp" : "arrowDown",
      text: `${t.side} ${t.quantity.toFixed(4)}`,
      size: 1.5,
    }));
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  candles: OHLCVCandle[];
  trades?: Trade[];
  showEMA?: boolean;
  showVolume?: boolean;
  height?: number;
}

export function CandlestickChart({
  candles,
  trades = [],
  showEMA = true,
  showVolume = true,
  height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);

  // ── Init chart once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...CHART_THEME,
      width: containerRef.current.clientWidth,
      height,
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    // Candlestick series (main pane)
    const cSeries = chart.addSeries(CandlestickSeries, CANDLE_OPTS);
    candleSeriesRef.current = cSeries;

    // Volume series (overlay in same pane, scaled separately)
    if (showVolume) {
      const vSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = vSeries;
    }

    // EMA overlays
    if (showEMA) {
      ema20Ref.current = chart.addSeries(LineSeries, {
        color: "#60a5fa",   // blue-400
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      ema50Ref.current = chart.addSeries(LineSeries, {
        color: "#f59e0b",   // amber-400
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    // ResizeObserver for responsive width
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) chart.applyOptions({ width: w });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20Ref.current = null;
      ema50Ref.current = null;
      markersRef.current = null;
    };
  }, [height, showEMA, showVolume]);

  // ── Update data when candles change ────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Deduplicate and sort by time
    const seen = new Set<number>();
    const sorted = [...candles]
      .filter((c) => { if (seen.has(c.ts)) return false; seen.add(c.ts); return true; })
      .sort((a, b) => a.ts - b.ts);

    const candleData: CandlestickData<Time>[] = sorted.map((c) => ({
      time: Math.floor(c.ts / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(candleData);

    // Volume
    if (volumeSeriesRef.current) {
      const volData: HistogramData<Time>[] = sorted.map((c) => ({
        time: Math.floor(c.ts / 1000) as Time,
        value: c.volume,
        color: volColor(c),
      }));
      volumeSeriesRef.current.setData(volData);
    }

    // EMA calculation
    if (showEMA && ema20Ref.current && ema50Ref.current) {
      const closes = sorted.map((c) => c.close);

      function ema(data: number[], period: number): LineData<Time>[] {
        const k = 2 / (period + 1);
        const result: LineData<Time>[] = [];
        let val = data[0];
        for (let i = 0; i < data.length; i++) {
          if (i === 0) { val = data[0]; }
          else { val = data[i] * k + val * (1 - k); }
          if (i >= period - 1) {
            result.push({
              time: Math.floor(sorted[i].ts / 1000) as Time,
              value: val,
            });
          }
        }
        return result;
      }

      ema20Ref.current.setData(ema(closes, 20));
      ema50Ref.current.setData(ema(closes, 50));
    }

    // Fit content after data load
    chartRef.current?.timeScale().fitContent();
  }, [candles, showEMA]);

  // ── Update trade markers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Clean up previous markers plugin
    if (markersRef.current) {
      markersRef.current.detach?.();
      markersRef.current = null;
    }

    if (trades.length === 0) return;

    const markers = buildMarkers(trades);
    if (markers.length === 0) return;

    // Cast to any to avoid v5 generic type variance issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markersRef.current = createSeriesMarkers(candleSeriesRef.current as any, markers);
  }, [trades]);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-zinc-800">
      <div ref={containerRef} style={{ height }} />
      {/* Legend */}
      {showEMA && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-950 border-t border-zinc-800">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-4 h-0.5 bg-blue-400 inline-block" />
            EMA 20
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-4 h-0.5 bg-amber-400 inline-block" />
            EMA 50
          </span>
          {trades.length > 0 && (
            <>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="text-emerald-400">▲</span> BUY
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="text-rose-400">▼</span> SELL
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
