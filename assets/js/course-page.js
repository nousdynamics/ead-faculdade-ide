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

/** Flip-box dos professores — clique só em dispositivos sem hover (touch) */
if (window.matchMedia("(hover: none)").matches) {
  document.querySelectorAll(".professores .elementor-flip-box").forEach((box) => {
    box.addEventListener("click", () => box.classList.toggle("elementor-flip-box--flipped"));
  });
}

/** Mini-currículo — sincroniza aria-expanded no summary */
document.querySelectorAll(".coord-mini-cv").forEach((details) => {
  const summary = details.querySelector("summary");
  if (!summary) return;

  const sync = () => summary.setAttribute("aria-expanded", details.open ? "true" : "false");
  sync();
  details.addEventListener("toggle", sync);
});
