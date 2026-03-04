"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, LOGO_PATH, SITE_NAME, CONTACT_PHONE } from "@/lib/constants";
import { useSiteImages } from "@/lib/hooks/useSiteImages";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { images } = useSiteImages();
  const logoSrc = images.logo?.imagePath || LOGO_PATH;

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl md:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Image
                  src={logoSrc}
                  alt={images.logo?.alt || SITE_NAME}
                  width={100}
                  height={34}
                  className="h-8 w-auto object-contain"
                />
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                  aria-label="סגירת תפריט"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "block px-4 py-3 rounded-lg text-base font-medium transition-colors",
                          pathname === link.href
                            ? "text-primary bg-primary/10"
                            : "text-text hover:bg-surface"
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-border space-y-3">
                <Link href="/booking" onClick={onClose}>
                  <Button fullWidth>קביעת תור</Button>
                </Link>
                <a
                  href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {CONTACT_PHONE}
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
