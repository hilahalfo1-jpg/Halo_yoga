import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/email";

// PATCH — update booking status or admin notes
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, adminNotes } = body;

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "CANCELLED") data.cancelledAt = new Date();
    }
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data,
      include: { service: true },
    });

    // Send email notification on status change (fire-and-forget)
    if (status && booking.customerEmail) {
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: booking.service.name,
        startAt: booking.startAt,
        cancelToken: booking.cancelToken,
      };

      if (status === "CONFIRMED") {
        sendBookingApprovedEmail(emailData).catch((e) =>
          console.error("[EMAIL_APPROVED]", e)
        );
      } else if (status === "REJECTED" || status === "CANCELLED") {
        sendBookingRejectedEmail(emailData).catch((e) =>
          console.error("[EMAIL_REJECTED]", e)
        );
      }
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("[ADMIN_BOOKING_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_BOOKING_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
