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
