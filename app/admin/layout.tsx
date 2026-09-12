"use client";

import { AdminProvider } from "@/hooks/use-admin";
import { useHydrated } from "@/hooks/use-store";
import { AdminSidebar, AdminMobileTabs } from "@/components/admin/admin-nav";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  return (
    <AdminProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <AdminMobileTabs />
          <div className="flex-1 overflow-x-hidden p-4 sm:p-6">
            {hydrated ? (
              children
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Loading practice data…
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminProvider>
  );
}
