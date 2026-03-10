import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/email";

const SLOT_BUFFER_MINUTES = 15;

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

    let rejectedIds: string[] = [];

    // Auto-reject overlapping PENDING bookings when confirming
    if (status === "CONFIRMED") {
      const bufferMs = SLOT_BUFFER_MINUTES * 60 * 1000;
      const confirmedStart = new Date(booking.startAt.getTime() - bufferMs);
      const confirmedEnd = new Date(booking.endAt.getTime() + bufferMs);

      // Find all overlapping PENDING bookings
      const overlapping = await prisma.booking.findMany({
        where: {
          id: { not: booking.id },
          status: "PENDING",
          startAt: { lt: confirmedEnd },
          endAt: { gt: confirmedStart },
        },
        include: { service: true },
      });

      if (overlapping.length > 0) {
        // Reject all overlapping in a single transaction
        await prisma.booking.updateMany({
          where: { id: { in: overlapping.map((b) => b.id) } },
          data: { status: "REJECTED" },
        });

        rejectedIds = overlapping.map((b) => b.id);

        // Send rejection emails (fire-and-forget)
        for (const ob of overlapping) {
          if (ob.customerEmail) {
            sendBookingRejectedEmail({
              customerName: ob.customerName,
              customerEmail: ob.customerEmail,
              customerPhone: ob.customerPhone,
              serviceName: ob.service.name,
              startAt: ob.startAt,
            }).catch((e) => console.error("[EMAIL_AUTO_REJECT]", e));
          }
        }

        console.log(
          `[AUTO_REJECT] Confirmed ${booking.id} → rejected ${rejectedIds.length} overlapping bookings:`,
          rejectedIds
        );
      }
    }

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

    return NextResponse.json({ data: booking, rejectedIds });
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
