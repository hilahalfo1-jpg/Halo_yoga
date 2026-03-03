"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  MessageSquare,
  Star,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { formatTime } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/lib/constants";

interface DashboardData {
  stats: {
    todayBookings: number;
    weekBookings: number;
    newLeads: number;
    pendingReviews: number;
  };
  todayBookingsList: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    customerName: string;
    service: { name: string };
  }>;
  recentLeads: Array<{
    id: string;
    name: string;
    phone: string;
    subject: string | null;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען לוח בקרה..." />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: "הזמנות היום",
      value: data.stats.todayBookings,
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-primary/20",
    },
    {
      label: "הזמנות השבוע",
      value: data.stats.weekBookings,
      icon: TrendingUp,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "פניות חדשות",
      value: data.stats.newLeads,
      icon: MessageSquare,
      color: "text-warning",
      bg: "bg-warning/10",
      href: "/admin/leads",
    },
    {
      label: "המלצות ממתינות",
      value: data.stats.pendingReviews,
      icon: Star,
      color: "text-secondary",
      bg: "bg-secondary/10",
      href: "/admin/reviews",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text">לוח בקרה</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <Card key={stat.label} className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
                <p className="text-sm text-text-muted">{stat.label}</p>
              </div>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's bookings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <Clock className="h-5 w-5 text-text-muted" />
              הזמנות היום
            </h2>
            <Link
              href="/admin/bookings"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              הכל
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {data.todayBookingsList.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              אין הזמנות להיום
            </p>
          ) : (
            <div className="space-y-3">
              {data.todayBookingsList.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-text-muted" dir="ltr">
                      {formatTime(booking.startAt)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {booking.customerName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {booking.service.name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={BOOKING_STATUS_COLORS[booking.status]}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent leads */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-text-muted" />
              פניות אחרונות
            </h2>
            <Link
              href="/admin/leads"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              הכל
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              אין פניות
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text">
                      {lead.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {lead.subject || "כללי"} · {lead.phone}
                    </p>
                  </div>
                  <Badge className={LEAD_STATUS_COLORS[lead.status]}>
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
