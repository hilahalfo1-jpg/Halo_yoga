"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-screen bg-surface flex">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 rounded-lg text-text-muted hover:text-text hover:bg-surface"
              aria-label="פתיחת תפריט"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-text-muted">
              פאנל ניהול
            </h2>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
