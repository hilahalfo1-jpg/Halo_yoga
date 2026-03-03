import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServicesGrid from "@/components/home/ServicesGrid";
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
        {/* Hero */}
        <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              השירותים שלי
            </h1>
            <p className="text-white/70 text-lg">
              מגוון טיפולים מקצועיים המותאמים לצרכים שלכם
            </p>
          </div>
        </div>

        <ServicesGrid services={services} />
      </main>
      <Footer />
    </>
  );
}
