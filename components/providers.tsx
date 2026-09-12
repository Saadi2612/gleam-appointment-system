"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "./i18n-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <Toaster position="top-center" richColors closeButton />
    </I18nProvider>
  );
}
