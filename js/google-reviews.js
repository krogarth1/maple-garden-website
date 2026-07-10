/* Live Google Reviews widget, powered by the Places API (New).
   Fills in #reviews-summary and #reviews-grid on index.html.
   If GOOGLE_PLACES_API_KEY isn't set (or the request fails), the static
   fallback testimonials already in the HTML are left untouched. */
(function () {
  var GOOGLE_PLACES_API_KEY = "AIzaSyDh1YcdcoNTHTR1q059H5xivCMrnKL9NNM";
  var PLACE_ID = "ChIJPUUzaPCve0gRNIxGLjYTn_4"; // Maple Garden Skincare, Meditation & Wellbeing

  var summaryEl = document.getElementById("reviews-summary");
  var gridEl = document.getElementById("reviews-grid");
  if (!summaryEl || !gridEl) return;

  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === "YOUR_API_KEY_HERE") {
    console.info("Google Reviews widget: add a Places API key in js/google-reviews.js to show live reviews. Showing static fallback for now.");
    return;
  }

  function starRow(rating) {
    var full = Math.round(rating);
    var svg = '<span class="stars" aria-hidden="true">';
    for (var i = 0; i < 5; i++) {
      svg += '<svg viewBox="0 0 20 20" width="16" height="16" fill="' + (i < full ? "#c8a15b" : "rgba(255,255,255,0.3)") + '"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6z"/></svg>';
    }
    svg += "</span>";
    return svg;
  }

  function reviewCard(review) {
    var author = (review.authorAttribution && review.authorAttribution.displayName) || "Google user";
    var text = (review.text && review.text.text) || "";
    if (text.length > 260) text = text.slice(0, 257).trim() + "…";
    return (
      '<div class="testimonial">' +
      starRow(review.rating || 5).replace('class="stars"', 'class="stars" style="margin-bottom:10px;"') +
      "<p>“" + text.replace(/</g, "&lt;") + "”</p>" +
      '<p class="testimonial-name">— ' + author.replace(/</g, "&lt;") + "</p>" +
      "</div>"
    );
  }

  var url = "https://places.googleapis.com/v1/places/" + PLACE_ID;

  fetch(url, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri"
    }
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Places API request failed: " + res.status);
      return res.json();
    })
    .then(function (place) {
      if (place.rating && place.userRatingCount) {
        summaryEl.innerHTML =
          starRow(place.rating) +
          '<span class="rating-figure">' + place.rating.toFixed(1) + "</span>" +
          '<span class="rating-count">(' + place.userRatingCount + " Google reviews)</span>";
      }

      if (place.reviews && place.reviews.length) {
        gridEl.innerHTML = place.reviews.slice(0, 3).map(reviewCard).join("");
      }
    })
    .catch(function (err) {
      console.warn("Google Reviews widget: could not load live reviews, showing fallback.", err);
    });
})();
