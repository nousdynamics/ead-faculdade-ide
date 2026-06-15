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

/** Popup — download do guia do curso */
const guideModal = document.getElementById("course-guide-modal");
const guideForm = document.getElementById("course-guide-form");
const guideError = document.getElementById("course-guide-error");

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function showGuideError(message) {
  if (!guideError) return;
  guideError.textContent = message;
  guideError.hidden = !message;
}

function triggerDownload(url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

if (guideModal instanceof HTMLDialogElement && guideForm instanceof HTMLFormElement) {
  document.querySelectorAll("[data-open-guide-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      showGuideError("");
      guideForm.reset();
      const consent = guideForm.querySelector('input[name="consent"]');
      if (consent instanceof HTMLInputElement) consent.checked = true;
      if (!guideModal.dataset.pdfUrl) {
        showGuideError("Guia indisponível no momento.");
      }
      if (typeof guideModal.showModal === "function") guideModal.showModal();
    });
  });

  guideModal.querySelector(".course-guide-modal__close")?.addEventListener("click", () => {
    guideModal.close();
  });

  guideModal.addEventListener("click", (event) => {
    if (event.target === guideModal) guideModal.close();
  });

  guideModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    guideModal.close();
  });

  guideForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showGuideError("");

    const formData = new FormData(guideForm);
    const nome = String(formData.get("nome") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const telefone = String(formData.get("telefone") || "").trim();
    const consent = formData.get("consent") === "on";

    if (!nome || !email || !telefone || !consent) {
      showGuideError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (normalizePhone(telefone).length < 10) {
      showGuideError("Informe um telefone válido.");
      return;
    }

    const slug = guideModal.dataset.courseSlug || "";
    const submitBtn = guideForm.querySelector('[type="submit"]');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/guide-lead/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, consent: true }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível enviar seus dados.");

      const downloadUrl = payload.downloadUrl || guideModal.dataset.pdfUrl || "";
      if (!downloadUrl) throw new Error("Guia indisponível no momento.");

      triggerDownload(downloadUrl);
      guideModal.close();
    } catch (err) {
      showGuideError(err.message || "Não foi possível concluir o download.");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });
}
