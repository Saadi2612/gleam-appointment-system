import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { DemoBadge } from "@/components/demo-badge";
import { DemoControlBar } from "@/components/demo-control-bar";
import { GuidedTourProvider } from "@/components/guided-tour";
import { TriageAssistant } from "@/components/triage/triage-assistant";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gleam Dental Care — Book an appointment",
  description:
    "Real-time online booking for Atlantic Dentistry at Atlantic Beach and Bartram Park. Demo build.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background">
        <Providers>
          <Suspense>
            <GuidedTourProvider>
              <SiteHeader />
              <main className="flex flex-1 flex-col">{children}</main>
              <TriageAssistant />
              <DemoBadge />
              <DemoControlBar />
            </GuidedTourProvider>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
