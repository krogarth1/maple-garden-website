// Cloudflare Pages Function — proxies the Google Places API (New) "place
// details" request server-side so GOOGLE_PLACES_API_KEY never reaches the
// browser. Set GOOGLE_PLACES_API_KEY as a secret in the Cloudflare Pages
// dashboard (Settings -> Environment variables) for this to work.
//
// Route: GET /api/google-reviews

const PLACE_ID = "ChIJPUUzaPCve0gRNIxGLjYTn_4"; // Maple Garden Skincare, Meditation & Wellbeing
const CACHE_SECONDS = 3600; // reviews change rarely; avoids burning API quota per visitor

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const apiKey = context.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const placesRes = await fetch("https://places.googleapis.com/v1/places/" + PLACE_ID, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri"
    }
  });

  if (!placesRes.ok) {
    return new Response(JSON.stringify({ error: "Places API request failed" }), {
      status: placesRes.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const data = await placesRes.json();

  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + CACHE_SECONDS
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
