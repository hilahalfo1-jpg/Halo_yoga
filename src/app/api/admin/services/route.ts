import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations";

// GET all services (admin)
export async function GET() {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const services = await prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("[ADMIN_SERVICES_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST create service
export async function POST(req: Request) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const validated = serviceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.service.findUnique({
      where: { slug: validated.data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "slug כבר קיים, יש לבחור ערך ייחודי" },
        { status: 409 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name: validated.data.name,
        slug: validated.data.slug,
        shortDesc: validated.data.shortDesc,
        description: validated.data.description,
        category: validated.data.category,
        duration: validated.data.duration,
        price: validated.data.price,
        image: validated.data.image || null,
        suitableFor: validated.data.suitableFor || null,
        isActive: validated.data.isActive,
        sortOrder: validated.data.sortOrder,
      },
    });

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_SERVICES_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
