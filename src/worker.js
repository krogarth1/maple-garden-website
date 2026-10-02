// Worker entry point for Workers Builds (git-connected deploy of this repo).
// Handles /api/google-reviews and /api/instagram itself; everything else falls
// through to the static assets binding (the plain HTML/CSS/JS site).

const PLACE_ID = "ChIJPUUzaPCve0gRNIxGLjYTn_4"; // Maple Garden Skincare, Meditation & Wellbeing
const CACHE_SECONDS = 3600; // reviews change rarely; avoids burning API quota per visitor

// Behold's free tier only refreshes its copy of the feed once a day, so a long
// edge cache costs no freshness. It also decouples Behold's monthly view quota
// from our traffic: the Worker fetches a few times a day regardless of visitors.
const INSTAGRAM_CACHE_SECONDS = 21600; // 6 hours

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/google-reviews" && request.method === "GET") {
      return handleGoogleReviews(request, env, ctx);
    }

    if (url.pathname === "/api/instagram" && request.method === "GET") {
      return handleInstagram(request, env, ctx);
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

async function handleInstagram(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Accepts either the bare feed ID or the full https://feeds.behold.so/<ID>
  // URL Behold displays; the ID is the last path segment either way.
  const feedId = (env.BEHOLD_FEED_ID || "")
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .split("/")
    .pop();
  if (!feedId) {
    return new Response(JSON.stringify({ error: "BEHOLD_FEED_ID not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const beholdRes = await fetch("https://feeds.behold.so/" + feedId);

  if (!beholdRes.ok) {
    return new Response(JSON.stringify({ error: "Behold feed request failed" }), {
      status: beholdRes.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const data = await beholdRes.json();

  const response = new Response(JSON.stringify(trimFeed(data)), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + INSTAGRAM_CACHE_SECONDS
    }
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}

// Keep only the fields the carousel renders, so the browser payload stays small.
function trimFeed(data) {
  const posts = Array.isArray(data.posts) ? data.posts : [];

  return {
    username: data.username || null,
    posts: posts.map((post) => {
      const sizes = post.sizes || {};
      // Behold re-hosts the sizes images, so unlike Instagram's own signed
      // mediaUrl they don't expire out from under our 6-hour cache. For video
      // posts thumbnailUrl is the only field guaranteed to be a still image.
      const isVideo = post.mediaType === "VIDEO" || post.isReel;
      const fromSizes = pickSize(sizes, ["medium", "large", "small", "full"]);
      return {
        permalink: post.permalink || null,
        // prunedCaption drops the hashtag block, which reads better as body copy.
        caption: post.prunedCaption || post.caption || "",
        timestamp: post.timestamp || null,
        mediaType: post.mediaType || "IMAGE",
        isReel: Boolean(post.isReel),
        altText: post.altText || "",
        image: (isVideo ? post.thumbnailUrl || fromSizes : fromSizes || post.thumbnailUrl) || post.mediaUrl || null,
        imageSmall: isVideo ? null : pickSize(sizes, ["small", "medium"])
      };
    })
  };
}

function pickSize(sizes, order) {
  for (const key of order) {
    if (sizes[key] && sizes[key].mediaUrl) return sizes[key].mediaUrl;
  }
  return null;
}
