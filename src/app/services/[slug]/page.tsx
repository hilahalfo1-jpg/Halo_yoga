import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Banknote, ArrowRight, Users, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatPrice, formatDuration } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

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
        <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לשירותים
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                {service.name}
              </h1>
              <Badge className="bg-white/15 text-white border-white/20">
                {CATEGORY_LABELS[service.category] || service.category}
              </Badge>
            </div>
            <p className="text-white/70 text-lg">{service.shortDesc}</p>
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

              {/* Sidebar */}
              <div className="lg:col-span-1">
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
                          {formatPrice(service.price)}
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
