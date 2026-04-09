const ACCESS_PASSWORD_PREFIX = "pick-day:access-password:";

export function getProtectedSchedulePassword(token: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(`${ACCESS_PASSWORD_PREFIX}${token}`);
}

export function setProtectedSchedulePassword(token: string, password: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(`${ACCESS_PASSWORD_PREFIX}${token}`, password);
}

export function clearProtectedSchedulePassword(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(`${ACCESS_PASSWORD_PREFIX}${token}`);
}
