"use client";
import { useSystemInfo } from "@/hooks/use-agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

function GaugeBar({ value }: { value: number }) {
  const color = value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export function SystemMonitor() {
  const { data, isLoading } = useSystemInfo();

  if (isLoading || !data) {
    return (
      <Card className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 bg-slate-800 rounded animate-pulse" />
              <div className="h-1.5 w-full bg-slate-800 rounded-full animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows = [
    {
      icon: Cpu,
      label: "CPU",
      value: data.cpu.percent,
      detail: `${data.cpu.count} cores`,
    },
    {
      icon: MemoryStick,
      label: "Memory",
      value: data.memory.percent,
      detail: `${data.memory.used_gb.toFixed(1)} / ${data.memory.total_gb.toFixed(1)} GB`,
    },
    {
      icon: HardDrive,
      label: "Disk",
      value: data.disk.percent,
      detail: `${data.disk.used_gb.toFixed(0)} / ${data.disk.total_gb.toFixed(0)} GB`,
    },
  ];

  return (
    <Card className="bg-slate-900/80 border-slate-700/40 rounded-xl card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          System Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                <span className="text-xs font-medium text-slate-400">{label}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-600">{detail}</span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular w-9 text-right",
                    value > 80 ? "text-rose-400" : value > 60 ? "text-amber-400" : "text-emerald-400"
                  )}
                >
                  {value.toFixed(0)}%
                </span>
              </div>
            </div>
            <GaugeBar value={value} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
