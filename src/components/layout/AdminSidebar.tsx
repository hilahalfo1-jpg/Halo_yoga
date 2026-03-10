"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  Calendar,
  Settings2,
  Clock,
  ImageIcon,
  FileText,
  MessageSquare,
  Star,
  Gift,
  ShieldBan,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOGO_PATH, SITE_NAME } from "@/lib/constants";
import { useSiteImages } from "@/lib/hooks/useSiteImages";

const navItems = [
  { label: "לוח בקרה", href: "/admin", icon: LayoutDashboard },
  { label: "הזמנות", href: "/admin/bookings", icon: Calendar },
  { label: "שירותים", href: "/admin/services", icon: Settings2 },
  { label: "זמינות", href: "/admin/availability", icon: Clock },
  { label: "תמונות", href: "/admin/images", icon: ImageIcon },
  { label: "תוכן האתר", href: "/admin/content", icon: FileText },
  { label: "פניות", href: "/admin/leads", icon: MessageSquare },
  { label: "המלצות", href: "/admin/reviews", icon: Star },
  { label: "גיפט קארד", href: "/admin/gift-cards", icon: Gift },
  { label: "חסומים", href: "/admin/blacklist", icon: ShieldBan },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { images } = useSiteImages();
  const logoSrc = images.logo?.imagePath || LOGO_PATH;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/bookings?status=PENDING")
      .then((r) => r.json())
      .then((r) => setPendingCount(r.data?.length || 0))
      .catch(() => {});
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-64 bg-white border-l border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src={logoSrc}
              alt={images.logo?.alt || SITE_NAME}
              width={80}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-sm font-medium text-text-muted">ניהול</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-text-muted hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/20 text-secondary"
                    : "text-text-secondary hover:bg-surface hover:text-text"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
                {item.href === "/admin/bookings" && pendingCount > 0 && (
                  <span className="mr-auto bg-warning text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error/5 w-full transition-colors"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            התנתקות
          </button>
        </div>
      </aside>
    </>
  );
}
