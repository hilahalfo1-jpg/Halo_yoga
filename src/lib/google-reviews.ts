import { prisma } from "@/lib/prisma";

const SEARCH_QUERY = "הילה חלפון Halo Yoga Massage עיסוי תאילנדי יוגה";

/**
 * Sync Google Reviews from Places API into the local DB cache.
 * Requires GOOGLE_PLACES_API_KEY env var.
 */
export async function syncGoogleReviews(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("[Google Reviews] GOOGLE_PLACES_API_KEY is not set — skipping sync.");
    return;
  }

  // 1. Find place ID
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", SEARCH_QUERY);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "place_id");
  findUrl.searchParams.set("key", apiKey);

  const findRes = await fetch(findUrl.toString());
  const findData = await findRes.json();

  if (!findData.candidates || findData.candidates.length === 0) {
    console.warn("[Google Reviews] No place found for query:", SEARCH_QUERY);
    return;
  }

  const placeId = findData.candidates[0].place_id;

  // 2. Get place details with reviews
  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set("fields", "reviews");
  detailsUrl.searchParams.set("language", "he");
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl.toString());
  const detailsData = await detailsRes.json();

  const reviews = detailsData.result?.reviews;
  if (!reviews || reviews.length === 0) {
    console.warn("[Google Reviews] No reviews found for place:", placeId);
    return;
  }

  // 3. Upsert each review
  for (const review of reviews) {
    const googleReviewId = `${review.author_name}_${review.time}`;
    await prisma.googleReview.upsert({
      where: { googleReviewId },
      create: {
        googleReviewId,
        authorName: review.author_name || "אנונימי",
        rating: review.rating ?? 5,
        text: review.text || null,
        time: new Date(review.time * 1000), // Google returns Unix timestamp
        profilePhotoUrl: review.profile_photo_url || null,
      },
      update: {
        authorName: review.author_name || "אנונימי",
        rating: review.rating ?? 5,
        text: review.text || null,
        profilePhotoUrl: review.profile_photo_url || null,
      },
    });
  }

  console.log(`[Google Reviews] Synced ${reviews.length} reviews.`);
}

/**
 * Fetch cached Google reviews from DB.
 */
export async function getGoogleReviews() {
  try {
    const reviews = await prisma.googleReview.findMany({
      orderBy: { time: "desc" },
    });
    return reviews.map((r) => ({
      id: r.id,
      googleReviewId: r.googleReviewId,
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      time: r.time.toISOString(),
      profilePhotoUrl: r.profilePhotoUrl,
    }));
  } catch (error) {
    console.warn("[Google Reviews] Failed to fetch from DB:", error);
    return [];
  }
}
