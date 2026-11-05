// Garante que o Worker nunca grave no Supabase, mesmo com variável errada no ambiente.
export function createClient() {
  throw new Error("Supabase não está disponível no Worker.");
}
