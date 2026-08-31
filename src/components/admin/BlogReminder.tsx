"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lightbulb, ArrowLeft } from "lucide-react";

interface BlogPost {
  isPublished: boolean;
  publishedAt: string | null;
}

// Stores the local date the banner was dismissed — hidden for that day only
const DISMISS_KEY = "blogReminderDismissedOn";

const todayStr = () => new Date().toDateString();

export default function BlogReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;

    // Dismissed today (any tab/session) — don't nag again until tomorrow
    try {
      if (localStorage.getItem(DISMISS_KEY) === todayStr()) return;
    } catch {
      // localStorage unavailable — fall through and show normally
    }

    (async () => {
      try {
        const res = await fetch("/api/admin/blog");
        if (!res.ok) return;
        const json = await res.json();
        const posts: BlogPost[] = json.data ?? [];

        const publishedDates = posts
          .filter((p) => p.isPublished && p.publishedAt)
          .map((p) => new Date(p.publishedAt as string).getTime());

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Show if no published post, or the latest published post is older than 7 days
        const latest = publishedDates.length ? Math.max(...publishedDates) : null;
        const shouldShow = latest === null || latest < sevenDaysAgo;

        if (active) setShow(shouldShow);
      } catch {
        // Non-critical nudge — fail silently
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayStr());
    } catch {
      // Non-critical — hide for this render anyway
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
      <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center flex-shrink-0">
        <Lightbulb className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 text-right">
        <h3 className="text-sm font-semibold text-text">💡 זמן לפוסט חדש בבלוג</h3>
        <p className="text-sm text-text-muted mt-1">
          לא פרסמת פוסט בשבוע האחרון. פוסט חדש מושך לקוחות ומשפר את הדירוג בגוגל.
          שווה גם להעלות אותו לעמוד העסק שלך בגוגל.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline"
          >
            לכתיבת פוסט
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-text-muted hover:text-text underline-offset-2 hover:underline"
          >
            נזכרתי, אל תציגי היום
          </button>
        </div>
      </div>
    </div>
  );
}
