import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/**
 * Carrega .env e .env.local (local sobrescreve).
 */
export async function loadProjectEnv() {
  // Vercel pull primeiro; .env / .env.local sobrescrevem (secrets locais).
  for (const file of [".env.vercel", ".env.vercel.production", ".env.vercel.dev", ".env", ".env.local"]) {
    try {
      const raw = await readFile(join(ROOT, file), "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    } catch {
      /* arquivo opcional */
    }
  }
}
