/** Accordion estilo Jet Tabs / Elementor — módulos (abertura instantânea) */
document.querySelectorAll(".jet-toggle__control").forEach((control) => {
  if (control.closest(".course-faq-accordion")) return;

  const item = control.closest(".jet-accordion__item");
  const content = item?.querySelector(".jet-toggle__content");
  if (!item || !content) return;
  content.hidden = true;

  const toggle = () => {
    const open = control.getAttribute("aria-expanded") === "true";
    control.setAttribute("aria-expanded", open ? "false" : "true");
    content.hidden = open;
    item.classList.toggle("active-toggle", !open);
  };

  control.addEventListener("click", toggle);
  control.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
});

/** FAQ — ícones + animação suave */
document.querySelectorAll(".course-faq-accordion .jet-toggle__control").forEach((control) => {
  const item = control.closest(".jet-accordion__item");
  const content = item?.querySelector(".jet-toggle__content");
  if (!item || !content) return;

  content.hidden = false;

  const toggle = () => {
    const isOpen = item.classList.contains("active-toggle");
    item.classList.toggle("active-toggle", !isOpen);
    control.setAttribute("aria-expanded", !isOpen ? "true" : "false");
  };

  control.addEventListener("click", toggle);
  control.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
});

/** Flip-box no hover/focus (touch: click) */
document.querySelectorAll(".elementor-flip-box").forEach((box) => {
  box.addEventListener("click", () => box.classList.toggle("elementor-flip-box--flipped"));
});

/** Mini-currículo — sincroniza aria-expanded no summary */
document.querySelectorAll(".coord-mini-cv").forEach((details) => {
  const summary = details.querySelector("summary");
  if (!summary) return;

  const sync = () => summary.setAttribute("aria-expanded", details.open ? "true" : "false");
  sync();
  details.addEventListener("toggle", sync);
});
