/** FAQ — acessibilidade + accordion (uma pergunta aberta por vez) */
document.querySelectorAll(".course-faq__list").forEach((list) => {
  list.querySelectorAll(".course-faq__item").forEach((details) => {
    const summary = details.querySelector("summary");
    if (!summary) return;

    const sync = () => summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    sync();
    details.addEventListener("toggle", sync);
  });

  list.addEventListener(
    "toggle",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      list.querySelectorAll(".course-faq__item[open]").forEach((item) => {
        if (item !== target) item.open = false;
      });
    },
    true,
  );
});

/** Flip-box dos professores — clique só em dispositivos sem hover (touch).
 * Delegado no document p/ funcionar também nos clones do carrossel. */
if (window.matchMedia("(hover: none)").matches) {
  document.addEventListener("click", (event) => {
    const box = event.target instanceof Element && event.target.closest(".professores .elementor-flip-box");
    if (box) box.classList.toggle("elementor-flip-box--flipped");
  });
}

/** Professores — carrossel infinito com autoplay (1 card a cada 2s).
 * Clona os itens p/ dar a volta sem "pulo"; pausa no hover/foco. */
document.querySelectorAll(".professores .jet-listing-grid").forEach((viewport) => {
  const track = viewport.querySelector(".jet-listing-grid__items");
  if (!track) return;

  const originals = Array.from(track.children);
  const overflows = () => track.scrollWidth > viewport.clientWidth + 1;
  if (originals.length < 2 || !overflows()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  viewport.classList.add("is-carousel");
  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  let index = 0;
  let paused = false;

  const stepSize = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 12;
    return originals[0].getBoundingClientRect().width + gap;
  };

  const apply = (animate) => {
    track.style.transition = animate ? "transform 0.6s ease" : "none";
    track.style.transform = `translateX(-${index * stepSize()}px)`;
  };

  viewport.addEventListener("mouseenter", () => { paused = true; });
  viewport.addEventListener("mouseleave", () => { paused = false; });
  viewport.addEventListener("focusin", () => { paused = true; });
  viewport.addEventListener("focusout", () => { paused = false; });

  window.addEventListener("resize", () => apply(false));

  setInterval(() => {
    if (paused || document.hidden) return;
    index += 1;
    apply(true);
    if (index >= originals.length) {
      // terminou a volta: reancora no início sem animação
      track.addEventListener(
        "transitionend",
        () => {
          index = 0;
          apply(false);
        },
        { once: true },
      );
    }
  }, 2000);
});

/** Mini-currículo — sincroniza aria-expanded no summary */
document.querySelectorAll(".coord-mini-cv").forEach((details) => {
  const summary = details.querySelector("summary");
  if (!summary) return;

  const sync = () => summary.setAttribute("aria-expanded", details.open ? "true" : "false");
  sync();
  details.addEventListener("toggle", sync);
});

/** Popup — opções de parcelamento */
const installmentsModal = document.getElementById("course-installments-modal");
if (installmentsModal instanceof HTMLDialogElement) {
  document.querySelectorAll("[data-open-installments]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (typeof installmentsModal.showModal === "function") {
        installmentsModal.showModal();
      }
    });
  });

  installmentsModal.querySelector(".course-installments-modal__close")?.addEventListener("click", () => {
    installmentsModal.close();
  });

  installmentsModal.addEventListener("click", (event) => {
    if (event.target === installmentsModal) installmentsModal.close();
  });

  installmentsModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    installmentsModal.close();
  });
}
