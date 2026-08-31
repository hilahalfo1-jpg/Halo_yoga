import { NextResponse } from "next/server";
import { getWorkingHours } from "@/lib/working-hours";

export const dynamic = "force-dynamic";

// GET weekly working hours derived from active AvailabilityRules (public)
export async function GET() {
  const data = await getWorkingHours();
  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
