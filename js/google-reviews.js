/* Live Google Reviews, powered by the Places API (New).
   Runs on every page (header rating badge) and additionally fills in
   #reviews-summary and the review carousel on index.html.
   If GOOGLE_PLACES_API_KEY isn't set (or the request fails), the static
   fallback content already in the HTML is left untouched. */
(function () {
  var GOOGLE_PLACES_API_KEY = "AIzaSyDh1YcdcoNTHTR1q059H5xivCMrnKL9NNM";
  var PLACE_ID = "ChIJPUUzaPCve0gRNIxGLjYTn_4"; // Maple Garden Skincare, Meditation & Wellbeing
  var PLACE_NAME = "Maple Garden Skincare, Meditation & Wellbeing";

  // Google's documented "search by place ID" link — unlike a bare
  // /maps/place/?q=place_id:... URL, this format resolves reliably when
  // the Google Maps app intercepts the link on a phone, not just on desktop.
  var FALLBACK_MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(PLACE_NAME) +
    "&query_place_id=" +
    PLACE_ID;

  var GOOGLE_LOGO =
    '<svg class="google-g" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18A11.98 11.98 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>';

  function starRow(rating, size, unfilledColor) {
    size = size || 16;
    unfilledColor = unfilledColor || "rgba(255,255,255,0.3)";
    var full = Math.round(rating);
    var svg = '<span class="stars" aria-hidden="true">';
    for (var i = 0; i < 5; i++) {
      svg += '<svg viewBox="0 0 20 20" width="' + size + '" height="' + size + '" fill="' + (i < full ? "#c8a15b" : unfilledColor) + '"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6z"/></svg>';
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
      starRow(review.rating || 5, 16, "rgba(63,77,58,0.2)").replace('class="stars"', 'class="stars" style="margin-bottom:10px;"') +
      "<p>“" + text.replace(/</g, "&lt;") + "”</p>" +
      '<p class="testimonial-name">— ' + author.replace(/</g, "&lt;") + "</p>" +
      "</div>"
    );
  }

  // ---------- Header rating badge (present on every page) ----------
  var headerBadge = document.getElementById("header-rating");
  var headerBodyEl = document.getElementById("header-rating-body");

  function setHeaderBadge(rating, count) {
    if (!headerBodyEl) return;
    headerBodyEl.innerHTML =
      starRow(rating, 11, "rgba(63,77,58,0.25)") +
      '<strong>' + rating.toFixed(1) + "</strong>" +
      '<span class="header-rating-count">(' + count + ")</span>";
  }

  // ---------- Reviews carousel (index.html only) ----------
  var carousel = document.getElementById("reviews-carousel");
  var track = document.getElementById("reviews-grid");
  var dotsWrap = document.getElementById("reviews-dots");
  var prevBtn = document.getElementById("reviews-prev");
  var nextBtn = document.getElementById("reviews-next");
  var current = 0;
  var timer = null;

  function updateCarousel() {
    if (!track) return;
    track.style.transform = "translateX(-" + current * 100 + "%)";
    if (dotsWrap) {
      var dots = dotsWrap.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("active", i === current);
      }
    }
  }

  function goTo(index) {
    var slides = track.children;
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    updateCarousel();
  }

  function nextSlide() { goTo(current + 1); }
  function prevSlide() { goTo(current - 1); }

  function restartAutoplay() {
    if (timer) clearInterval(timer);
    timer = setInterval(nextSlide, 6000);
  }

  function initCarousel() {
    if (!carousel || !track || !track.children.length) return;
    current = 0;
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      for (var i = 0; i < track.children.length; i++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", "Go to review " + (i + 1));
        (function (idx) {
          dot.addEventListener("click", function () {
            goTo(idx);
            restartAutoplay();
          });
        })(i);
        dotsWrap.appendChild(dot);
      }
    }
    updateCarousel();
    restartAutoplay();
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { prevSlide(); restartAutoplay(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { nextSlide(); restartAutoplay(); });
  if (carousel) {
    carousel.addEventListener("mouseenter", function () { if (timer) clearInterval(timer); });
    carousel.addEventListener("mouseleave", restartAutoplay);
    carousel.addEventListener("focusin", function () { if (timer) clearInterval(timer); });
    carousel.addEventListener("focusout", restartAutoplay);
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { prevSlide(); restartAutoplay(); }
      if (e.key === "ArrowRight") { nextSlide(); restartAutoplay(); }
    });
  }

  initCarousel();

  // ---------- Live data ----------
  var seeAllLink = document.getElementById("see-all-reviews-link");
  if (seeAllLink) seeAllLink.href = FALLBACK_MAPS_URL;
  if (headerBadge) headerBadge.href = FALLBACK_MAPS_URL;

  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === "YOUR_API_KEY_HERE") {
    console.info("Google Reviews widget: add a Places API key in js/google-reviews.js to show live reviews. Showing static fallback for now.");
    return;
  }

  var summaryEl = document.getElementById("reviews-summary");

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
      // Google's own generated link for this exact place — the most
      // reliable option for opening the correct location in the mobile app.
      var mapsHref = place.googleMapsUri || FALLBACK_MAPS_URL;
      if (seeAllLink) seeAllLink.href = mapsHref;
      if (headerBadge) headerBadge.href = mapsHref;

      if (place.rating && place.userRatingCount) {
        setHeaderBadge(place.rating, place.userRatingCount);

        if (summaryEl) {
          summaryEl.innerHTML =
            GOOGLE_LOGO +
            starRow(place.rating) +
            '<span class="rating-figure">' + place.rating.toFixed(1) + "</span>" +
            '<span class="rating-count">(' + place.userRatingCount + " Google reviews)</span>";
        }
      }

      if (track && place.reviews && place.reviews.length) {
        track.innerHTML = place.reviews.map(reviewCard).join("");
        initCarousel();
      }
    })
    .catch(function (err) {
      console.warn("Google Reviews widget: could not load live reviews, showing fallback.", err);
    });
})();
