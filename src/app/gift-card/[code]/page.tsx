import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GiftCardView from "./GiftCardView";

interface Props {
  params: { code: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const giftCard = await prisma.giftCard.findUnique({
    where: { code: params.code },
  });

  // PENDING orders are not public — the link is shared only after approval
  if (!giftCard || giftCard.status === "PENDING") {
    return { title: "גיפט קארד - HALO" };
  }

  return {
    title: `גיפט קארד עבור ${giftCard.recipientName} - HALO`,
    description: `${giftCard.serviceName} - ${giftCard.message}`,
  };
}

export default async function GiftCardPage({ params }: Props) {
  const giftCard = await prisma.giftCard.findUnique({
    where: { code: params.code },
  });

  // PENDING orders are not public — the link is shared only after approval
  if (!giftCard || giftCard.status === "PENDING") notFound();

  const isExpired =
    !giftCard.isRedeemed &&
    !!giftCard.expiresAt &&
    giftCard.expiresAt < new Date();

  return (
    <GiftCardView
      recipientName={giftCard.recipientName}
      senderName={giftCard.senderName}
      serviceName={giftCard.serviceName}
      message={giftCard.message}
      isRedeemed={giftCard.isRedeemed}
      template={giftCard.template}
      isExpired={isExpired}
      expiresAt={giftCard.expiresAt?.toISOString() ?? null}
    />
  );
}
