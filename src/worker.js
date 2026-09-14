// Worker entry point for Workers Builds (git-connected deploy of this repo).
// Handles /api/google-reviews itself; everything else falls through to the
// static assets binding (the plain HTML/CSS/JS site).

const PLACE_ID = "ChIJPUUzaPCve0gRNIxGLjYTn_4"; // Maple Garden Skincare, Meditation & Wellbeing
const CACHE_SECONDS = 3600; // reviews change rarely; avoids burning API quota per visitor

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/google-reviews" && request.method === "GET") {
      return handleGoogleReviews(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleGoogleReviews(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const apiKey = env.GOOGLE_PLACES_API_KEY;
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

  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
