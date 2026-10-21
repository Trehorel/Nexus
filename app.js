
(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.documentElement.classList.add("js-ready");

  // HEADER COMPACT
  const header = document.querySelector(".site-header");
  let lastCompact = false;

  const updateHeader = () => {
    const compact = window.scrollY > 24;

    if (compact !== lastCompact) {
      header?.classList.toggle("compact", compact);
      lastCompact = compact;
    }
  };

  updateHeader();

  window.addEventListener("scroll", updateHeader, {
    passive: true
  });

  // MENU MOBILE
  const menuToggle = document.querySelector("#menu-toggle");
  const nav = document.querySelector(".nav");

  menuToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  // APPARITION DES ÉLÉMENTS AU SCROLL
  const revealItems = document.querySelectorAll(".reveal");

  if (
    reducedMotion ||
    !("IntersectionObserver" in window)
  ) {
    revealItems.forEach(item => {
      item.classList.add("is-visible");
    });
  } else {
    revealItems.forEach((item, index) => {
      if (index % 4 === 1) item.dataset.delay = "1";
      if (index % 4 === 2) item.dataset.delay = "2";
      if (index % 4 === 3) item.dataset.delay = "3";
    });

    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -35px 0px"
      }
    );

    revealItems.forEach(item => {
      revealObserver.observe(item);
    });
  }

  // COMPTEURS ANIMÉS
  const counters = document.querySelectorAll("[data-count]");

  const animateCount = element => {
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || "";

    if (reducedMotion) {
      element.textContent =
        target.toLocaleString("fr-FR") + suffix;
      return;
    }

    const duration = 1050;
    const start = performance.now();

    const tick = now => {
      const progress = Math.min(
        (now - start) / duration,
        1
      );

      const eased = 1 - Math.pow(1 - progress, 4);

      element.textContent =
        Math.round(target * eased).toLocaleString("fr-FR") +
        suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  if (
    "IntersectionObserver" in window &&
    !reducedMotion
  ) {
    const countObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);

            entry.target
              .closest(".stat-card")
              ?.classList.add("is-visible");

            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.55 }
    );

    counters.forEach(counter => {
      countObserver.observe(counter);
    });
  } else {
    counters.forEach(counter => {
      animateCount(counter);

      counter.closest(".stat-card")
        ?.classList.add("is-visible");
    });
  }

  // EFFET MAGNÉTIQUE DES BOUTONS
  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  if (!reducedMotion && finePointer) {
    document.querySelectorAll(".magnetic").forEach(button => {
      let frame = 0;
      let x = 0;
      let y = 0;

      const render = () => {
        button.style.transform =
          `translate3d(${x}px, ${y}px, 0)`;

        frame = 0;
      };

      button.addEventListener("pointermove", event => {
        const rect = button.getBoundingClientRect();

        x = (
          event.clientX - rect.left - rect.width / 2
        ) * 0.12;

        y = (
          event.clientY - rect.top - rect.height / 2
        ) * 0.16;

        if (!frame) {
          frame = requestAnimationFrame(render);
        }
      });

      button.addEventListener("pointerleave", () => {
        if (frame) {
          cancelAnimationFrame(frame);
        }

        frame = 0;

        button.style.transform =
          "translate3d(0, 0, 0)";
      });
    });
  }
})();
