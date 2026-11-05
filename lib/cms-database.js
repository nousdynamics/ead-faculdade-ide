import { getStorageProvider } from "./storage-provider.js";
import * as d1 from "./cloudflare/d1-storage.js";
import * as supabase from "./supabase/cms-storage.js";

const isD1 = () => getStorageProvider() === "cloudflare";

/** true quando coleções, usuários e leads ficam em banco (D1 ou Supabase), não em Blob/arquivo. */
export function usesCmsDatabase() {
  return isD1() || getStorageProvider() === "supabase";
}

export function readCmsCollection(name) {
  return isD1() ? d1.readD1Collection(name) : supabase.readSupabaseCollection(name);
}

/** Todas as coleções numa consulta só, ou null se o banco ativo não oferece isso. */
export async function readAllCmsCollections() {
  return isD1() ? d1.readAllD1Collections() : null;
}

export function writeCmsCollection(name, payload) {
  return isD1() ? d1.writeD1Collection(name, payload) : supabase.writeSupabaseCollection(name, payload);
}

export function readCmsUserByEmail(email) {
  return isD1() ? d1.readD1CmsUserByEmail(email) : supabase.readSupabaseCmsUserByEmail(email);
}

export function listCmsUserRows() {
  return isD1() ? d1.listD1CmsUsers() : supabase.listSupabaseCmsUsers();
}

export function insertCmsUser(user) {
  return isD1() ? d1.insertD1CmsUser(user) : supabase.insertSupabaseCmsUser(user);
}

export function updateCmsUser(id, changes) {
  return isD1() ? d1.updateD1CmsUser(id, changes) : supabase.updateSupabaseCmsUser(id, changes);
}

export function insertGuideLead(lead) {
  return isD1() ? d1.insertD1GuideLead(lead) : supabase.insertSupabaseGuideLead(lead);
}
