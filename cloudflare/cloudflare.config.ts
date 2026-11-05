import { bindings, defineConfig } from "cf/config";

// Bucket só entra no deploy depois que o R2 for ativado na conta: um binding para
// bucket inexistente derruba o deploy. Fora de produção o R2 é simulado e sempre existe.
const R2_ACTIVE_IN_ACCOUNT = true;

export default defineConfig(({ mode }) => {
  const useR2 = R2_ACTIVE_IN_ACCOUNT || mode !== "production";

  return {
    accountId: "25e749043ce433036240369c6fd2b981",
    worker: {
      name: "ead-faculdade-ide",
      entrypoint: "./worker/index.js",
      compatibilityDate: "2026-11-01",
      compatibilityFlags: ["nodejs_compat"],
      assets: {
        htmlHandling: "drop-trailing-slash",
        notFoundHandling: "404-page",
        runWorkerFirst: [
          "/api/*",
          "/pos-graduacao/*",
          "/paginas-de-cursos",
          "/paginas-de-cursos/*",
          "/cadastro",
          "/sitemap.xml",
        ],
      },
      // Honra o s-maxage que as páginas já enviam: o D1 fica fora do Brasil.
      cache: { enabled: true },
      observability: { enabled: true, redactQueryString: true },
      env: {
        ASSETS: bindings.assets(),
        DB: bindings.d1({ id: "3d550df8-e81a-4d82-b1af-ec2958a625ba", name: "ead-faculdade-ide" }),
        MEDIA: useR2 && bindings.r2({ name: "ead-faculdade-ide-media" }),
        MEDIA_FALLBACK_URL:
          !useR2 &&
          bindings.text("https://sjokgfvaszczuisavuwb.supabase.co/storage/v1/object/public/cms-media"),
        STORAGE_PROVIDER: bindings.text("cloudflare"),
        CMS_SECRET: bindings.secret(),
      },
    },
  };
});
