const ADMIN_PASSWORD_PREFIX = "pick-day:admin-password:";

export function getAdminPassword(adminToken: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(`${ADMIN_PASSWORD_PREFIX}${adminToken}`);
}

export function setAdminPassword(adminToken: string, password: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(`${ADMIN_PASSWORD_PREFIX}${adminToken}`, password);
}

export function clearAdminPassword(adminToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(`${ADMIN_PASSWORD_PREFIX}${adminToken}`);
}
