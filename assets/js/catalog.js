// catalog.js — carrega cursos publicados do CMS e monta o grid da home
(function () {
  var grid = document.getElementById("courseGrid");
  if (!grid) return;

  var catalogSection = grid.closest(".catalog");
  var prefilterNivel = catalogSection && catalogSection.dataset.prefilterNivel;

  var selNivel = document.getElementById("f-nivel");
  var selArea = document.getElementById("f-area");
  var selStatus = document.getElementById("f-status");
  var empty = grid.querySelector(".course-grid__empty");

  var BTN_ICON =
    '<svg viewBox="0 0 320 320" fill="none" aria-hidden="true"><path d="M182.56 230.773 173.134 221.173 227.64 166.667H66.667V153.333H227.64L173.134 98.827 182.56 89.227 253.334 160 182.56 230.773Z" fill="#2B325C"/></svg>';

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillSelect(select, placeholder, values) {
    if (!select) return;
    select.innerHTML = "";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);
    values.forEach(function (value) {
      var opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
  }

  function renderCard(course) {
    var article = document.createElement("article");
    article.className = "course-card";
    article.dataset.nivel = course.nivel;
    article.dataset.area = course.area;
    article.dataset.status = course.status;
    article.innerHTML =
      '<img class="course-card__img" src="' +
      esc(course.imagem) +
      '" alt="' +
      esc(course.titulo) +
      '" loading="lazy">' +
      '<div class="course-card__body">' +
      '<span class="course-card__tag">' +
      esc(course.nivel || "Curso") +
      "</span>" +
      '<h3 class="course-card__title">' +
      esc(course.titulo) +
      "</h3>" +
      '<a class="course-card__btn" href="' +
      esc(course.url) +
      '">Conhecer o curso ' +
      BTN_ICON +
      "</a>" +
      "</div>";
    return article;
  }

  function render(payload) {
    grid.querySelectorAll(".course-card").forEach(function (card) {
      card.remove();
    });

    fillSelect(selNivel, "Selecione o nível do curso", payload.filters.niveis);
    fillSelect(selArea, "Selecione uma área de interesse:", payload.filters.areas);
    fillSelect(selStatus, "Selecione o momento do curso:", payload.filters.statuses);

    if (prefilterNivel && selNivel) {
      selNivel.value = prefilterNivel;
    }

    payload.courses.forEach(function (course) {
      grid.insertBefore(renderCard(course), empty);
    });

    if (empty) {
      if (payload.courses.length === 0) {
        empty.textContent = "Nenhum curso publicado no momento.";
        empty.hidden = false;
      } else {
        empty.textContent = "Nenhum curso encontrado para os filtros selecionados.";
        empty.hidden = true;
      }
    }

    grid.dispatchEvent(new CustomEvent("catalog:ready"));
  }

  function showError() {
    if (empty) {
      empty.textContent = "Não foi possível carregar os cursos. Tente novamente em instantes.";
      empty.hidden = false;
    }
  }

  fetch("/api/catalog")
    .then(function (res) {
      if (!res.ok) throw new Error("catalog fetch failed");
      return res.json();
    })
    .then(render)
    .catch(showError);
})();
