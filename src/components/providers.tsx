"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode, useState } from "react";
import { FCMListener } from "@/components/pwa/fcm-listener";
import { SessionWatcher } from "@/components/session-watcher";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FCMListener />
        <SessionWatcher />
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
