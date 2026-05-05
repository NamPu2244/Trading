"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  LineChart,
  Key,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents",    label: "Agents",    icon: Bot },
  { href: "/trades",    label: "Trades",    icon: LineChart },
  { href: "/keys",      label: "API Keys",  icon: Key },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 min-h-screen shrink-0 bg-[oklch(0.11_0.018_252)] border-r border-slate-700/30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-slate-700/30">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 shadow-[0_0_12px_oklch(0.765_0.177_160/15%)]">
          <Zap className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-[13px] font-semibold text-slate-100 tracking-tight leading-none">
            Trading AI
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Multi-agent platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-slate-800/80 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-emerald-400" : "")}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
              {active && (
                <span className="ml-auto w-1 h-4 rounded-full bg-emerald-400 opacity-80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot-running" />
          <span className="text-[11px] text-slate-500 font-medium">System Online · v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}
