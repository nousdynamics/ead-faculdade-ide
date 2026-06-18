/**
 * Utilitários para embeds RD Station — extrai o ID do formulário e monta o HTML seguro.
 */

export function parseRdEmbedCode(raw = "") {
  const code = String(raw || "").trim();
  if (!code) {
    return { formId: "", mountHtml: "" };
  }

  let formId = "";

  const rdCall = code.match(/RDStationForms\s*\(\s*['"]([^'"]+)['"]/i);
  if (rdCall) formId = rdCall[1].trim();

  const divMatch = code.match(/<div[^>]*\bid=["']([^"']+)["'][^>]*>\s*<\/div>/i);
  if (divMatch) formId = divMatch[1].trim();

  if (!formId) {
    return { formId: "", mountHtml: "" };
  }

  return {
    formId,
    mountHtml: `<div role="main" id="${formId}"></div>`,
  };
}

export function courseHasRdForm(course, key) {
  const embed = course?.formularios?.[key] || "";
  return Boolean(parseRdEmbedCode(embed).formId);
}
