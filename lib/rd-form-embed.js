/**
 * Utilitários para embeds RD Station — extrai o ID do formulário e monta o HTML seguro.
 */

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFormId(code) {
  const rdCall = code.match(/RDStationForms\s*\(\s*['"]([^'"]+)['"]/i);
  if (rdCall?.[1]) return rdCall[1].trim();

  const mainDiv = code.match(/<div[^>]*\brole\s*=\s*["']main["'][^>]*\bid\s*=\s*["']([^"']+)["']/i);
  if (mainDiv?.[1]) return mainDiv[1].trim();

  const mainDivAlt = code.match(/<div[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*\brole\s*=\s*["']main["']/i);
  if (mainDivAlt?.[1]) return mainDivAlt[1].trim();

  const rdFormId = code.match(/\bid\s*=\s*["'](rd-form-[^"']+)["']/i);
  if (rdFormId?.[1]) return rdFormId[1].trim();

  const anyId = code.match(/\bid\s*=\s*["']([^"']+)["']/i);
  if (anyId?.[1]) return anyId[1].trim();

  return "";
}

export function parseRdEmbedCode(raw = "") {
  const code = decodeHtmlEntities(String(raw || "").trim());
  if (!code) {
    return { formId: "", mountHtml: "" };
  }

  const formId = extractFormId(code);
  if (!formId) {
    return { formId: "", mountHtml: "" };
  }

  return {
    formId,
    mountHtml: `<div role="main" id="${formId}"></div>`,
  };
}

export function hasConfiguredRdEmbed(raw = "") {
  const code = decodeHtmlEntities(String(raw || "").trim());
  if (!code) return false;
  if (parseRdEmbedCode(code).formId) return true;
  return /RDStationForms|rdstation-forms|role\s*=\s*["']main["']/i.test(code);
}

export function courseHasRdForm(course, key) {
  const embed = course?.formularios?.[key] || "";
  return hasConfiguredRdEmbed(embed);
}
