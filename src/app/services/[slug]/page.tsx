import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Banknote, Users, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatPrice, formatDuration } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

async function getService(slug: string) {
  return prisma.service.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = await getService(params.slug);
  if (!service) return { title: "שירות לא נמצא" };

  return {
    title: service.name,
    description: service.shortDesc,
    openGraph: {
      title: service.name,
      description: service.shortDesc,
      locale: "he_IL",
    },
  };
}


export default async function ServiceDetailPage({ params }: PageProps) {
  const service = await getService(params.slug);

  if (!service || !service.isActive) {
    notFound();
  }

  const audience = service.suitableFor
    ? service.suitableFor.split("\n").filter((line: string) => line.trim())
    : [];

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#3d4a4b] via-[#4a5758] to-[#353d3e] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-20 sm:pt-24 w-full">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-1 text-sm">
                <li>
                  <Link href="/services" className="text-white/70 hover:text-white transition-colors">
                    שירותים
                  </Link>
                </li>
                <li className="text-white/40">/</li>
                <li className="text-white/90">{service.name}</li>
              </ol>
            </nav>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                {service.name}
              </h1>
              <Badge className="bg-white/15 text-white border-white/20">
                {CATEGORY_LABELS[service.category] || service.category}
              </Badge>
            </div>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl">{service.shortDesc}</p>
          </div>
        </div>

        {/* Mobile-only quick info bar: price, duration, CTA above the fold */}
        <div className="lg:hidden bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-text">{formatDuration(service.duration)}</span>
                </div>
                {service.price > 0 && (
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-secondary-dark" />
                    <span className="text-sm font-semibold text-text">{formatPrice(service.price)}</span>
                  </div>
                )}
                {service.price === 0 && (
                  <span className="text-sm font-medium text-primary">צרו קשר למחיר</span>
                )}
              </div>
            </div>
            <Link href={`/booking?service=${service.slug}`}>
              <Button fullWidth size="md">
                קביעת תור לטיפול זה
              </Button>
            </Link>
          </div>
        </div>

        <Section>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-text mb-4">
                    על הטיפול
                  </h2>
                  <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                    {service.description}
                  </p>
                </div>

                {audience.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-text mb-4">
                      למי מתאים?
                    </h2>
                    <ul className="space-y-3">
                      {audience.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-text-secondary">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sidebar -- hidden on mobile (shown as quick bar above) */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="bg-white rounded-xl border border-border p-6 shadow-sm sticky top-24 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">משך הטיפול</p>
                        <p className="font-semibold text-text">
                          {formatDuration(service.duration)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-secondary-dark" />
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">מחיר</p>
                        <p className="font-semibold text-text text-lg">
                          {service.price > 0 ? formatPrice(service.price) : "צרו קשר"}
                        </p>
                      </div>
                    </div>

                    {service.category === "YOGA" && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-info" />
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">סוג</p>
                          <p className="font-semibold text-text">
                            {service.slug === "group-yoga"
                              ? "עד 8 משתתפים"
                              : "שיעור פרטי"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-6">
                    <Link href={`/booking?service=${service.slug}`}>
                      <Button fullWidth size="lg">
                        קביעת תור לטיפול זה
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
