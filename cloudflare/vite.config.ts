import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

const stub = (file: string) => fileURLToPath(new URL(`./worker/stubs/${file}`, import.meta.url));

export default defineConfig({
  // Gerado por scripts/build-assets.mjs (npm run assets).
  publicDir: "build/public",
  resolve: {
    alias: {
      "@vercel/blob": stub("vercel-blob.js"),
      "@supabase/supabase-js": stub("supabase.js"),
    },
  },
  plugins: [cloudflare()],
});
