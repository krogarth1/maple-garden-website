/* Live Instagram posts for the homepage carousel.
   Fetches /api/instagram, handled by the Cloudflare Worker (src/worker.js),
   which proxies a Behold JSON feed (behold.so) and caches it at the edge.
   Behold owns the Instagram access token and refreshes it, so there is no
   token for this site to hold or rotate.
   If the request fails, the static fallback slides already in the HTML are
   left untouched. */
(function () {
  var PROFILE_URL = "https://www.instagram.com/AndreaMc_Wellbeing";
  var MAX_CAPTION = 200;
  var MAX_POSTS = 6;

  var carousel = document.getElementById("ig-carousel");
  var track = document.getElementById("ig-track");
  if (!carousel || !track) return;

  var dotsWrap = document.getElementById("ig-dots");
  var prevBtn = document.getElementById("ig-prev");
  var nextBtn = document.getElementById("ig-next");
  var current = 0;
  var timer = null;

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function truncate(text) {
    text = String(text).replace(/\s+/g, " ").trim();
    if (text.length <= MAX_CAPTION) return text;
    var cut = text.slice(0, MAX_CAPTION - 1);
    var lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > MAX_CAPTION * 0.6) cut = cut.slice(0, lastSpace);
    return cut.replace(/[\s,.;:—-]+$/, "") + "…";
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  function postSlide(post) {
    if (!post.image) return "";

    var permalink = post.permalink || PROFILE_URL;
    var caption = truncate(post.caption);
    var date = formatDate(post.timestamp);
    var isVideo = post.mediaType === "VIDEO" || post.isReel;
    // Instagram alt text is often empty; fall back to the caption, then a generic label.
    var alt = post.altText || caption || "Instagram post from Maple Garden";
    var srcset = post.imageSmall
      ? ' srcset="' + escapeHtml(post.imageSmall) + ' 400w, ' + escapeHtml(post.image) + ' 800w" sizes="(max-width: 700px) 100vw, 320px"'
      : "";

    return (
      '<article class="ig-post">' +
      '<a class="ig-post-media" href="' + escapeHtml(permalink) + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' +
      '<img src="' + escapeHtml(post.image) + '"' + srcset + ' alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">' +
      (isVideo
        ? '<span class="ig-post-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>'
        : "") +
      "</a>" +
      '<div class="ig-post-body">' +
      (caption ? '<p class="ig-post-caption">' + escapeHtml(caption) + "</p>" : "") +
      (date ? '<p class="ig-post-date">' + escapeHtml(date) + "</p>" : "") +
      '<a class="ig-post-link" href="' + escapeHtml(permalink) + '" target="_blank" rel="noopener">View on Instagram' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</a>" +
      "</div>" +
      "</article>"
    );
  }

  function updateCarousel() {
    track.style.transform = "translateX(-" + current * 100 + "%)";
    if (dotsWrap) {
      var dots = dotsWrap.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("active", i === current);
      }
    }
  }

  function goTo(index) {
    var count = track.children.length;
    if (!count) return;
    current = (index + count) % count;
    updateCarousel();
  }

  function nextSlide() { goTo(current + 1); }
  function prevSlide() { goTo(current - 1); }

  function restartAutoplay() {
    if (timer) clearInterval(timer);
    timer = setInterval(nextSlide, 7000);
  }

  function initCarousel() {
    var count = track.children.length;
    if (!count) return;
    current = 0;

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      for (var i = 0; i < count; i++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", "Go to post " + (i + 1));
        (function (idx) {
          dot.addEventListener("click", function () {
            goTo(idx);
            restartAutoplay();
          });
        })(i);
        dotsWrap.appendChild(dot);
      }
    }

    var singleSlide = count < 2;
    if (prevBtn) prevBtn.hidden = singleSlide;
    if (nextBtn) nextBtn.hidden = singleSlide;
    if (dotsWrap) dotsWrap.hidden = singleSlide;

    updateCarousel();
    if (!singleSlide) restartAutoplay();
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { prevSlide(); restartAutoplay(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { nextSlide(); restartAutoplay(); });

  carousel.addEventListener("mouseenter", function () { if (timer) clearInterval(timer); });
  carousel.addEventListener("mouseleave", restartAutoplay);
  carousel.addEventListener("focusin", function () { if (timer) clearInterval(timer); });
  carousel.addEventListener("focusout", restartAutoplay);
  carousel.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { prevSlide(); restartAutoplay(); }
    if (e.key === "ArrowRight") { nextSlide(); restartAutoplay(); }
  });

  initCarousel();

  // ---------- Live data ----------
  var handleEl = document.getElementById("ig-handle");

  fetch("/api/instagram")
    .then(function (res) {
      if (!res.ok) throw new Error("Instagram feed request failed: " + res.status);
      return res.json();
    })
    .then(function (feed) {
      if (feed.username && handleEl) {
        handleEl.textContent = "@" + feed.username;
      }

      var slides = (feed.posts || []).slice(0, MAX_POSTS).map(postSlide).filter(Boolean);
      if (!slides.length) return;

      if (timer) clearInterval(timer);
      track.innerHTML = slides.join("");
      initCarousel();
    })
    .catch(function (err) {
      console.warn("Instagram widget: could not load live posts, showing fallback.", err);
    });
})();
