import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type LockConfig = {
  pin: string;
  modules: string[];
};

export type SubUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  allowedSections: string[];
  moduleLockEnabled: boolean;
};

export type CurrentUser = {
  email: string;
  name: string;
  isMaster: boolean;
  allowedSections: string[];
  moduleLockEnabled: boolean;
};

export type PasswordResetRequest = {
  id: string;
  email: string;
  name: string;
  requestedAt: string;
};

type AuthContextType = {
  currentUser: CurrentUser | null;
  isMasterAdmin: boolean;
  unlockedModules: Set<string>;
  unlockModule: (path: string) => void;
  lockConfig: LockConfig;
  saveLockConfig: (cfg: LockConfig) => void;
  getMasterCredentials: () => { email: string; password: string };
  saveMasterCredentials: (email: string, password: string) => void;
  subUsers: SubUser[];
  addSubUser: (user: Omit<SubUser, "id">) => void;
  updateSubUser: (user: SubUser) => void;
  deleteSubUser: (id: string) => void;
  resetRequests: PasswordResetRequest[];
  dismissResetRequest: (id: string) => void;
  refreshResetRequests: () => void;
};

const MASTER_DEFAULT = { email: "thetouch@gmail.com", password: "thetouch@132231" };
const DEFAULT_LOCKS: LockConfig = { pin: "", modules: [] };

export function getMasterCredentials(): { email: string; password: string } {
  try {
    const raw = localStorage.getItem("atsalon_master_creds");
    if (raw) return JSON.parse(raw);
  } catch {}
  return MASTER_DEFAULT;
}

export function getStoredCredentials() {
  return getMasterCredentials();
}

export function getStoredLocks(): LockConfig {
  try {
    const raw = localStorage.getItem("atsalon_locks");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LOCKS;
}

export function getSubUsers(): SubUser[] {
  try {
    const raw = localStorage.getItem("atsalon_subusers");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveSubUsers(users: SubUser[]) {
  localStorage.setItem("atsalon_subusers", JSON.stringify(users));
}

export function getResetRequests(): PasswordResetRequest[] {
  try {
    const raw = localStorage.getItem("atsalon_reset_requests");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveResetRequests(requests: PasswordResetRequest[]) {
  localStorage.setItem("atsalon_reset_requests", JSON.stringify(requests));
}

export function addResetRequest(email: string): "ok" | "not_found" | "already_pending" {
  const subUsers = getSubUsers();
  const user = subUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return "not_found";

  const existing = getResetRequests();
  if (existing.some(r => r.email.toLowerCase() === email.toLowerCase())) return "already_pending";

  const request: PasswordResetRequest = {
    id: crypto.randomUUID(),
    email: user.email,
    name: user.name,
    requestedAt: new Date().toISOString(),
  };
  saveResetRequests([...existing, request]);
  return "ok";
}

export function getCurrentUserFromSession(): CurrentUser | null {
  try {
    const raw = sessionStorage.getItem("atsalon_current_user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setSessionUser(user: CurrentUser) {
  sessionStorage.setItem("atsalon_current_user", JSON.stringify(user));
  sessionStorage.setItem("atsalon_session", "true");
}

export function clearSession() {
  sessionStorage.removeItem("atsalon_session");
  sessionStorage.removeItem("atsalon_current_user");
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, currentUser }: { children: ReactNode; currentUser: CurrentUser | null }) {
  const [unlockedModules, setUnlockedModules] = useState<Set<string>>(new Set());
  const [lockConfig, setLockConfig] = useState<LockConfig>(() => getStoredLocks());
  const [subUsers, setSubUsers] = useState<SubUser[]>(() => getSubUsers());
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>(() => getResetRequests());

  const unlockModule = (path: string) => {
    setUnlockedModules(prev => new Set([...prev, path]));
  };

  const saveLockConfig = (cfg: LockConfig) => {
    localStorage.setItem("atsalon_locks", JSON.stringify(cfg));
    setLockConfig(cfg);
    setUnlockedModules(new Set());
  };

  const getMasterCreds = () => getMasterCredentials();

  const saveMasterCredentials = (email: string, password: string) => {
    localStorage.setItem("atsalon_master_creds", JSON.stringify({ email, password }));
  };

  const addSubUser = useCallback((user: Omit<SubUser, "id">) => {
    const newUser: SubUser = { ...user, id: crypto.randomUUID() };
    setSubUsers(prev => {
      const updated = [...prev, newUser];
      saveSubUsers(updated);
      return updated;
    });
  }, []);

  const updateSubUser = useCallback((user: SubUser) => {
    setSubUsers(prev => {
      const updated = prev.map(u => u.id === user.id ? user : u);
      saveSubUsers(updated);
      return updated;
    });
  }, []);

  const deleteSubUser = useCallback((id: string) => {
    setSubUsers(prev => {
      const updated = prev.filter(u => u.id !== id);
      saveSubUsers(updated);
      return updated;
    });
  }, []);

  const dismissResetRequest = useCallback((id: string) => {
    setResetRequests(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveResetRequests(updated);
      return updated;
    });
  }, []);

  const refreshResetRequests = useCallback(() => {
    setResetRequests(getResetRequests());
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isMasterAdmin: currentUser?.isMaster ?? false,
      unlockedModules,
      unlockModule,
      lockConfig,
      saveLockConfig,
      getMasterCredentials: getMasterCreds,
      saveMasterCredentials,
      subUsers,
      addSubUser,
      updateSubUser,
      deleteSubUser,
      resetRequests,
      dismissResetRequest,
      refreshResetRequests,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
