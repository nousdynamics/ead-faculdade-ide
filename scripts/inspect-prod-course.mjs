const slug = process.argv[2] || "gestao-de-pessoas";
const host = process.argv[3] || "ead-faculdade-ide.vercel.app";
const url = `https://${host}/pos-graduacao/${slug}`;
const res = await fetch(url);
const html = await res.text();

console.log("url", url);
console.log("status", res.status, "len", html.length);
console.log("has rd-form-course.js", html.includes("rd-form-course.js"));
console.log("has course-investment-modal", html.includes("course-investment-modal"));
console.log("has data-open-investment-modal", html.includes("data-open-investment-modal"));

const modalMatch = html.match(/id="course-investment-modal"[^>]*data-rd-form-id="([^"]*)"/);
console.log("investment form id", modalMatch?.[1] || "(none)");

const ctaMatches = [...html.matchAll(/<(a|button)[^>]*class="[^"]*course-investment__cta[^"]*"[^>]*>/g)];
console.log("investment CTAs:");
for (const m of ctaMatches) console.log(" ", m[0].slice(0, 200));
