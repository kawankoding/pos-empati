interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "cashier";
}

interface SessionEntry {
  user: AuthUser;
  createdAt: number;
}

const authStore = new Map<number, SessionEntry>();

export function registerSession(webContentsId: number, user: AuthUser): void {
  authStore.set(webContentsId, { user, createdAt: Date.now() });
}

export function getSession(webContentsId: number): SessionEntry | null {
  return authStore.get(webContentsId) ?? null;
}

export function removeSession(webContentsId: number): void {
  authStore.delete(webContentsId);
}

export function requireAuth(webContentsId: number): SessionEntry {
  const session = authStore.get(webContentsId);
  if (!session) {
    throw new Error("Not authenticated. Please log in first.");
  }
  return session;
}

export function requireAdmin(webContentsId: number): SessionEntry {
  const session = requireAuth(webContentsId);
  if (session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return session;
}

export function hasSession(webContentsId: number): boolean {
  return authStore.has(webContentsId);
}
