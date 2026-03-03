import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import CancelBookingClient from "./CancelBookingClient";

export const metadata: Metadata = {
  title: "ביטול תור",
};

interface PageProps {
  params: { token: string };
}

export default async function CancelBookingPage({ params }: PageProps) {
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: params.token },
    include: { service: true },
  });

  if (!booking) {
    notFound();
  }

  return (
    <>
      <Header />
      <main>
        <Section>
          <CancelBookingClient
            booking={{
              id: booking.id,
              cancelToken: booking.cancelToken,
              status: booking.status,
              customerName: booking.customerName,
              startAt: booking.startAt.toISOString(),
              endAt: booking.endAt.toISOString(),
              serviceName: booking.service.name,
            }}
          />
        </Section>
      </main>
      <Footer />
    </>
  );
}
