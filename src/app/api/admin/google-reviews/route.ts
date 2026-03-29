import { NextResponse } from "next/server";
import { getGoogleReviews, syncGoogleReviews } from "@/lib/google-reviews";

// GET — return cached Google reviews from DB
export async function GET() {
  try {
    const reviews = await getGoogleReviews();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("[Google Reviews API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google reviews" },
      { status: 500 }
    );
  }
}

// POST — trigger sync from Google Places API, then return updated list
export async function POST() {
  try {
    await syncGoogleReviews();
    const reviews = await getGoogleReviews();
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("[Google Reviews API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to sync Google reviews" },
      { status: 500 }
    );
  }
}
