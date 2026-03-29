import type { Metadata } from "next";
import { Toaster } from "sonner";
import WhatsAppFab from "@/components/layout/WhatsAppFab";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://haloyogamassage.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "HALO | יוגה ועיסוי רפואי",
    template: "%s | HALO - יוגה ועיסוי",
  },
  description:
    "HALO - יוגה ועיסוי רפואי. טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים, ושיקום פציעות.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HALO | יוגה ועיסוי רפואי",
    description:
      "HALO - יוגה ועיסוי רפואי. טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים.",
    locale: "he_IL",
    type: "website",
    url: baseUrl,
    images: [
      {
        url: "/images/logo.png",
        width: 512,
        height: 512,
        alt: "HALO - יוגה ועיסוי רפואי",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "HALO | יוגה ועיסוי רפואי",
    description:
      "HALO - יוגה ועיסוי רפואי. טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים.",
    images: ["/images/logo.png"],
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
