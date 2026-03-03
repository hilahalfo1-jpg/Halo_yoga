import type { Metadata } from "next";
import { Toaster } from "sonner";
import WhatsAppFab from "@/components/layout/WhatsAppFab";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HALO | יוגה ועיסוי רפואי",
    template: "%s | HALO - יוגה ועיסוי",
  },
  description:
    "HALO - יוגה ועיסוי רפואי. טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים, ושיקום פציעות.",
  openGraph: {
    title: "HALO | יוגה ועיסוי רפואי",
    description:
      "HALO - יוגה ועיסוי רפואי. טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים.",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-heebo antialiased bg-bg text-text min-h-screen">
        {children}
        <WhatsAppFab />
        <Toaster
          position="top-left"
          toastOptions={{
            style: {
              direction: "rtl",
              fontFamily: "Heebo, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
