"use client";
import { useEffect, useRef } from "react";
import { useAgentStore } from "@/store/agents";
import type { WsMessage, AgentLog, LogLevel } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useGlobalWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { updateStatus, appendLog, appendThinking, clearThinking } = useAgentStore();

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(`${WS_BASE}/ws/global`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.info("[WS] Global connected");
        // Keep-alive ping every 20s
        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 20_000);
        ws.addEventListener("close", () => clearInterval(ping));
      };

      ws.onmessage = (ev) => {
        try {
          const msg: WsMessage = JSON.parse(ev.data);
          if (msg.type === "agent_status") {
            updateStatus(msg.agent_id, msg.status);
          } else if (msg.type === "log") {
            if (msg.level === "ai_thinking") {
              appendThinking(msg.agent_id, msg.message);
            } else {
              // Flush thinking buffer on a non-thinking message
              clearThinking(msg.agent_id);
              appendLog({
                id: Date.now(),
                agent_id: msg.agent_id,
                level: msg.level as LogLevel,
                message: msg.message,
                meta: msg.meta ?? null,
                symbol: msg.symbol,
                created_at: new Date().toISOString(),
              });
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        console.info("[WS] Global disconnected — reconnecting in 3s");
        reconnectTimer = setTimeout(connect, 3_000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [updateStatus, appendLog, appendThinking, clearThinking]);
}
