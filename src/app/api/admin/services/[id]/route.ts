import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations";

// PATCH update service
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { id } = params;

    // Check service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const validated = serviceSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // If slug is being changed, check uniqueness
    if (validated.data.slug && validated.data.slug !== existing.slug) {
      const slugExists = await prisma.service.findUnique({
        where: { slug: validated.data.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "slug כבר קיים, יש לבחור ערך ייחודי" },
          { status: 409 }
        );
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(validated.data.name !== undefined && { name: validated.data.name }),
        ...(validated.data.slug !== undefined && { slug: validated.data.slug }),
        ...(validated.data.shortDesc !== undefined && {
          shortDesc: validated.data.shortDesc,
        }),
        ...(validated.data.description !== undefined && {
          description: validated.data.description,
        }),
        ...(validated.data.category !== undefined && {
          category: validated.data.category,
        }),
        ...(validated.data.duration !== undefined && {
          duration: validated.data.duration,
        }),
        ...(validated.data.price !== undefined && {
          price: validated.data.price,
        }),
        ...(validated.data.image !== undefined && {
          image: validated.data.image || null,
        }),
        ...(validated.data.isActive !== undefined && {
          isActive: validated.data.isActive,
        }),
        ...(validated.data.sortOrder !== undefined && {
          sortOrder: validated.data.sortOrder,
        }),
      },
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error("[ADMIN_SERVICES_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE service
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { id } = params;

    // Check service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    // Check for related bookings
    const bookingCount = await prisma.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        {
          error: `לא ניתן למחוק שירות עם ${bookingCount} הזמנות. ניתן לבטל את הפעלתו במקום.`,
        },
        { status: 409 }
      );
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[ADMIN_SERVICES_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
