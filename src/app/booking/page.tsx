import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import BookingWizard from "@/components/booking/BookingWizard";
import Spinner from "@/components/ui/Spinner";
import type { ServiceItem } from "@/types";

export const metadata: Metadata = {
  title: "קביעת תור",
  description: "קבעו תור לעיסוי רפואי או שיעור יוגה בקלות ובמהירות.",
};

async function getServices(): Promise<ServiceItem[]> {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return services.map((s) => ({
    ...s,
    category: s.category as ServiceItem["category"],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export default async function BookingPage() {
  const services = await getServices();

  return (
    <>
      <Header />
      <main>
        <div className="relative h-[30vh] min-h-[220px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              קביעת תור
            </h1>
            <p className="text-white/70 text-lg">
              בחרו שירות, תאריך ושעה — ואנחנו נדאג לשאר
            </p>
          </div>
        </div>

        <Section>
          <Suspense fallback={<div className="flex justify-center py-12"><Spinner label="טוען..." /></div>}>
            <BookingWizard services={services} />
          </Suspense>
        </Section>
      </main>
      <Footer />
    </>
  );
}
