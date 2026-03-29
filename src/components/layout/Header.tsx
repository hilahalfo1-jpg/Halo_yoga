"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, LOGO_PATH, SITE_NAME, SOCIAL_INSTAGRAM } from "@/lib/constants";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
import { useSiteImages } from "@/lib/hooks/useSiteImages";
import Button from "@/components/ui/Button";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScrollDirection();
  const isScrolled = scrollY > 50;
  const isHomepage = pathname === "/";
  const { images } = useSiteImages();

  const showSolidHeader = isScrolled || !isHomepage;
  const logoLight = images.logo?.imagePath || LOGO_PATH;
  const logoDark = images.logo_dark?.imagePath || logoLight;
  const logoSrc = showSolidHeader ? logoDark : logoLight;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-300",
          showSolidHeader
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border/50"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile: Hamburger (right side in RTL) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn(
                "md:hidden p-3 rounded-lg transition-colors",
                showSolidHeader
                  ? "text-text hover:bg-surface"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="תפריט"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop: Logo (left in RTL) */}
            <Link href="/" className="hidden md:flex items-center gap-2 flex-shrink-0">
              <Image
                src={logoSrc}
                alt={images.logo?.alt || SITE_NAME}
                width={160}
                height={56}
                className="h-14 w-auto object-contain transition-opacity duration-300"
                priority
              />
            </Link>

            {/* Mobile: Logo (centered) */}
            <Link href="/" className="md:hidden absolute left-1/2 -translate-x-1/2">
              <Image
                src={logoSrc}
                alt={images.logo?.alt || SITE_NAME}
                width={140}
                height={48}
                className="h-11 w-auto object-contain transition-opacity duration-300"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-primary bg-primary/10"
                      : showSolidHeader
                        ? "text-text hover:text-primary hover:bg-surface"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Desktop: CTA */}
              <Link href="/booking" className="hidden md:block">
                <Button size="sm" className={showSolidHeader ? "bg-[#576769] text-white hover:bg-[#475557]" : "bg-primary text-white hover:bg-primary-dark"}>קביעת תור</Button>
              </Link>

              {/* Mobile: Instagram (left side in RTL) */}
              <a
                href={SOCIAL_INSTAGRAM || "https://instagram.com"}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "md:hidden p-3 rounded-lg transition-colors",
                  showSolidHeader
                    ? "text-text hover:bg-surface"
                    : "text-white hover:bg-white/10"
                )}
                aria-label="אינסטגרם"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
