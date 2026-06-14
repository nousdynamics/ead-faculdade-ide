/** Accordion estilo Jet Tabs / Elementor */
document.querySelectorAll(".jet-toggle__control").forEach((control) => {
  const item = control.closest(".jet-accordion__item");
  const content = item?.querySelector(".jet-toggle__content");
  if (!item || !content) return;
  content.hidden = true;
  control.addEventListener("click", () => {
    const open = control.getAttribute("aria-expanded") === "true";
    control.setAttribute("aria-expanded", open ? "false" : "true");
    content.hidden = open;
    item.classList.toggle("active-toggle", !open);
  });
});

/** Flip-box no hover/focus (touch: click) */
document.querySelectorAll(".elementor-flip-box").forEach((box) => {
  box.addEventListener("click", () => box.classList.toggle("elementor-flip-box--flipped"));
});
