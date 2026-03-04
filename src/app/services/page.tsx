import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServicesGrid from "@/components/home/ServicesGrid";
import ServicesHero from "@/components/services/ServicesHero";
import type { ServiceItem } from "@/types";

export const metadata: Metadata = {
  title: "שירותים",
  description: "עיסוי שוודי, רקמות עמוקות, ספורטאים, רפלקסולוגיה, יוגה פרטית וקבוצתית, שיקום כאבי גב ועוד.",
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

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <Header />
      <main>
        <ServicesHero />

        <ServicesGrid services={services} hideTitle />
      </main>
      <Footer />
    </>
  );
}
