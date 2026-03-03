"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("התחברת בהצלחה");
        router.push("/admin");
        router.refresh();
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">ניהול האתר</h1>
          <p className="text-text-secondary">התחברו כדי לגשת לפאנל הניהול</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text mb-1"
            >
              אימייל
            </label>
            <input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg text-text
                         focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-colors text-left"
              placeholder="admin@healing.co.il"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text mb-1"
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg text-text
                         focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-colors text-left"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium
                       hover:bg-primary-dark transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isLoading ? "מתחבר..." : "התחברות"}
          </button>
        </form>
      </div>
    </div>
  );
}
