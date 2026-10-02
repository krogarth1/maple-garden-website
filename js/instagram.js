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
  var held = false; // hovered or focused: hold the current slide
  var inView = true;
  var SLIDE_MS = 7000;
  var VIDEO_START_MS = 8000; // give up on a video that hasn't started by then
  // Respect the OS "reduce motion" setting: video posts stay as still images.
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

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
      // The video sits over the still image and stays hidden until it is
      // actually playing, so a slow or expired video just leaves the image.
      // data-src rather than src: nothing downloads until the slide is shown.
      (isVideo && post.video && !reduceMotion
        ? '<video class="ig-post-video" data-src="' + escapeHtml(post.video) + '" muted playsinline preload="none" hidden></video>'
        : "") +
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
    restartAutoplay();
  }

  function nextSlide() { goTo(current + 1); }
  function prevSlide() { goTo(current - 1); }

  function activeVideo() {
    var slide = track.children[current];
    return slide ? slide.querySelector("video:not([data-failed])") : null;
  }

  function failVideo(video) {
    if (video.hasAttribute("data-failed")) return;
    video.setAttribute("data-failed", "");
    clearTimeout(video._startTimer);
    video.pause();
    video.hidden = true;
    video.parentNode.classList.remove("is-playing");
    video.removeAttribute("src");
    if (video === track.children[current].querySelector("video")) restartAutoplay();
  }

  function playVideo(video) {
    if (!video.getAttribute("src")) {
      video.src = video.getAttribute("data-src");
      video.muted = true; // required for autoplay; set as a property to be sure
      video.addEventListener("playing", function () {
        clearTimeout(video._startTimer);
        video.hidden = false;
        video.parentNode.classList.add("is-playing");
      });
      video.addEventListener("error", function () { failVideo(video); });
      video.addEventListener("ended", function () {
        // Move on once the clip finishes, unless the visitor is holding this slide.
        if (held || track.children.length < 2) {
          video.currentTime = 0;
          video.play();
        } else {
          nextSlide();
        }
      });
    }
    if (video.paused) {
      clearTimeout(video._startTimer);
      video._startTimer = setTimeout(function () { failVideo(video); }, VIDEO_START_MS);
      var played = video.play();
      if (played && played.catch) {
        played.catch(function (err) {
          // AbortError just means we paused it again before it started.
          if (err && err.name !== "AbortError") failVideo(video);
        });
      }
    }
  }

  // Decides what happens on the current slide: a video post plays and advances
  // when it ends; anything else gets the usual timed advance.
  function restartAutoplay() {
    clearTimeout(timer);
    timer = null;

    var active = activeVideo();
    var videos = track.querySelectorAll("video");
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v === active && inView) continue;
      clearTimeout(v._startTimer);
      if (!v.paused) v.pause();
      if (v !== active && v.currentTime) v.currentTime = 0;
    }

    if (active) {
      if (inView) playVideo(active);
      return;
    }
    if (!held && track.children.length > 1) timer = setTimeout(nextSlide, SLIDE_MS);
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
    restartAutoplay();
  }

  if (prevBtn) prevBtn.addEventListener("click", prevSlide);
  if (nextBtn) nextBtn.addEventListener("click", nextSlide);

  function hold(on) {
    held = on;
    restartAutoplay();
  }
  carousel.addEventListener("mouseenter", function () { hold(true); });
  carousel.addEventListener("mouseleave", function () { hold(false); });
  carousel.addEventListener("focusin", function () { hold(true); });
  carousel.addEventListener("focusout", function () { hold(false); });

  // Only play video while the carousel is on screen, so it isn't using
  // mobile data for a section nobody is looking at.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      restartAutoplay();
    }, { threshold: 0.25 }).observe(carousel);
  }
  carousel.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "ArrowRight") nextSlide();
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

      clearTimeout(timer);
      track.innerHTML = slides.join("");
      initCarousel();
    })
    .catch(function (err) {
      console.warn("Instagram widget: could not load live posts, showing fallback.", err);
    });
})();
