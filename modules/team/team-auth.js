// ============================================================
// Team Auth — Permission checker
// ============================================================

import { getCurrentUser, ROLES } from './team-store.js';

export function can(permission) {
  const user = getCurrentUser();
  const role = ROLES[user.role];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

export function guardElement(el, permission) {
  if (!can(permission)) { el.setAttribute('disabled', true); el.style.opacity = '0.4'; el.style.cursor = 'not-allowed'; el.title = 'Bạn không có quyền'; }
}

export function hideIfCannot(el, permission) {
  if (!can(permission)) el.style.display = 'none';
}
