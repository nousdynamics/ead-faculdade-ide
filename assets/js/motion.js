(function () {
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var STAGGER_GROUPS = [
    [".course-modules", ".course-modules__card"],
    [".professores .jet-listing-grid__items", ".jet-listing-grid__item"],
    [".testimonials-section__grid", ".testimonial-card"],
    ["#courseGrid", ".course-card"],
    [".benefits", ".benefits__cell"],
    [".reviews-track", ".review-card"],
    [".course-investment__inner", ".course-investment__benefits, .course-investment__pricing"],
    [".course-faq__list", ".course-faq__item"],
  ];

  var SECTION_SELECTORS = [
    "main > section.hero",
    ".catalog-page__hero .container > *",
    ".catalog--page .catalog__intro",
    ".catalog__intro",
    "main > section.testimonials .testimonials__head",
    "main > section.testimonials .reviews-summary",
    ".not-found > *",
    ".site-footer__main > *",
  ];

  var LIFT_SELECTORS = ".course-card, .course-modules__list li, .testimonial-card, .review-card, .jet-listing-grid__item";

  var observer;
  var observed = new WeakSet();

  function addReveal(el, delay) {
    if (!el || observed.has(el)) return;
    el.classList.add("motion-reveal");
    if (typeof delay === "number") {
      el.style.setProperty("--motion-delay", delay + "s");
    }
    observed.add(el);
    if (observer) observer.observe(el);
  }

  function revealNow(el) {
    if (!el) return;
    el.classList.add("motion-reveal", "is-visible");
    observed.add(el);
  }

  function setupStagger(container, childSelector, step) {
    if (!container) return;
    var children = container.querySelectorAll(childSelector);
    children.forEach(function (child, index) {
      if (child.classList.contains("is-hidden")) return;
      addReveal(child, index * (step || 0.07));
    });
  }

  function sectionHasStagger(section) {
    return Boolean(
      section.querySelector(
        ".course-modules, .professores, .course-investment, .course-faq, .testimonials-section"
      )
    );
  }

  function setupCourseSections() {
    document.querySelectorAll(".elementor-13 > .e-parent").forEach(function (section) {
      if (sectionHasStagger(section)) {
        STAGGER_GROUPS.forEach(function (pair) {
          var container = section.querySelector(pair[0]);
          if (container) setupStagger(container, pair[1]);
        });
        return;
      }
      addReveal(section);
    });
  }

  function setupHome() {
    SECTION_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        addReveal(el);
      });
    });

    STAGGER_GROUPS.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (container) {
        setupStagger(container, pair[1]);
      });
    });

    var hero = document.querySelector(".hero");
    if (hero) hero.classList.add("motion-hero");
  }

  function setupLift() {
    document.querySelectorAll(LIFT_SELECTORS).forEach(function (el) {
      el.classList.add("motion-lift");
    });
  }

  function setupHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupPageEnter() {
    var body = document.body;
    if (!body.classList.contains("site-layout")) return;

    body.classList.add("is-motion-entering");
    requestAnimationFrame(function () {
      body.classList.add("is-motion-ready");
    });

    window.setTimeout(function () {
      body.classList.remove("is-motion-entering");
    }, 650);
  }

  function setupObserver() {
    if (REDUCED) {
      document.documentElement.classList.add("motion-reduced");
      document.querySelectorAll(".motion-reveal").forEach(revealNow);
      return;
    }

    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    document.querySelectorAll(".motion-reveal:not(.is-visible)").forEach(function (el) {
      observer.observe(el);
    });
  }

  function init() {
    if (REDUCED) {
      document.documentElement.classList.add("motion-reduced");
    }

    setupPageEnter();
    setupLift();
    setupHeaderScroll();

    if (document.querySelector(".elementor-13")) {
      setupCourseSections();
      document.querySelectorAll(".course-faq").forEach(function (section) {
        var title = section.querySelector(".course-faq__title");
        if (title) addReveal(title);
        setupStagger(section.querySelector(".course-faq__list"), ".course-faq__item");
      });
      document.querySelectorAll(".course-investment").forEach(function (section) {
        var title = section.querySelector(".course-investment__title");
        if (title) addReveal(title);
        setupStagger(section.querySelector(".course-investment__inner"), ".course-investment__benefits, .course-investment__pricing");
      });
    } else {
      setupHome();
    }

    setupObserver();
  }

  function refreshStagger(containerSelector, childSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    container.querySelectorAll(childSelector).forEach(function (child) {
      child.classList.remove("motion-reveal", "is-visible");
      child.style.removeProperty("--motion-delay");
      observed.delete(child);
    });
    setupStagger(container, childSelector, 0.05);
    if (observer) {
      container.querySelectorAll(childSelector + ":not(.is-hidden)").forEach(function (child) {
        if (!child.classList.contains("is-visible")) observer.observe(child);
      });
    }
  }

  window.SiteMotion = {
    refreshCourseGrid: function () {
      refreshStagger("#courseGrid", ".course-card:not(.is-hidden)");
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
