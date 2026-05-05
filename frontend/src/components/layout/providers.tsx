"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalWebSocket } from "@/hooks/use-websocket";
import { useState } from "react";

function WsBootstrap({ children }: { children: React.ReactNode }) {
  useGlobalWebSocket();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WsBootstrap>{children}</WsBootstrap>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
