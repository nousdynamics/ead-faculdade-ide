import {
  SUPER_ADMIN_EMAIL,
  isSuperAdminEmail,
  canManageUsers,
  listCmsUsers,
  updateCmsUserAccessLevel,
  formatAccessLevelLabel,
} from "./cms-users.js";

export {
  SUPER_ADMIN_EMAIL,
  isSuperAdminEmail,
  canManageUsers,
  formatAccessLevelLabel,
};

export async function listSiteUsers() {
  const users = await listCmsUsers();
  return users.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.email.split("@")[0] || "—",
    phone: "—",
    access_level: row.access_level,
    created_at: row.created_at,
  }));
}

export async function updateSiteUserAccessLevel(userId, newLevel) {
  return updateCmsUserAccessLevel(userId, newLevel);
}
