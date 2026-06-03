import { useState } from "react";
import {
  Lock, Settings as SettingsIcon, Shield, Key,
  Eye, EyeOff, CheckCircle2, X, LayoutDashboard,
  MonitorCheck, CalendarDays, Users, FileText, Sparkles, Package,
  Briefcase, Tag, BarChart3, UserPlus, Trash2, Pencil, UserCog,
  ChevronDown, ChevronUp, ShieldCheck, ToggleLeft, ToggleRight,
  KeyRound, Bell, CheckCheck,
} from "lucide-react";
import { useAuth, SubUser } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

const ALL_SECTIONS = [
  { path: "/",             label: "Dashboard",     icon: LayoutDashboard },
  { path: "/pos",          label: "POS / New Bill", icon: MonitorCheck },
  { path: "/appointments", label: "Appointments",  icon: CalendarDays },
  { path: "/customers",    label: "Customers",     icon: Users },
  { path: "/invoices",     label: "Invoices",      icon: FileText },
  { path: "/services",     label: "Services",      icon: Sparkles },
  { path: "/products",     label: "Products",      icon: Package },
  { path: "/staff",        label: "Staff",         icon: Briefcase },
  { path: "/memberships",  label: "Memberships",   icon: Tag },
  { path: "/reports",      label: "Reports",       icon: BarChart3 },
];

const LOCKABLE_MODULES = ALL_SECTIONS;

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

type UserFormData = {
  name: string;
  email: string;
  password: string;
  allowedSections: string[];
  moduleLockEnabled: boolean;
};

function UserFormModal({
  initial,
  onSave,
  onClose,
  existingEmails,
}: {
  initial?: SubUser;
  onSave: (data: UserFormData) => void;
  onClose: () => void;
  existingEmails: string[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPass, setShowPass] = useState(false);
  const [allowedSections, setAllowedSections] = useState<string[]>(initial?.allowedSections ?? ["/"]);
  const [moduleLockEnabled, setModuleLockEnabled] = useState(initial?.moduleLockEnabled ?? false);
  const [error, setError] = useState("");

  const toggleSection = (path: string) => {
    setAllowedSections(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.includes("@")) { setError("Enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (allowedSections.length === 0) { setError("Allow at least one section."); return; }
    const lowerEmail = email.trim().toLowerCase();
    if (!initial && existingEmails.map(e => e.toLowerCase()).includes(lowerEmail)) {
      setError("A user with this email already exists.");
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), password, allowedSections, moduleLockEnabled });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl w-full max-w-lg border border-border/50 max-h-[90vh] flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="px-6 py-5 border-b border-border/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-bold text-base text-foreground">{initial ? "Edit User" : "Add New User"}</h2>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                placeholder="e.g. priya@salon.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                Password {initial && <span className="normal-case font-normal text-muted-foreground">(leave as-is or change)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="w-full pr-10 p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allowed Sections</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAllowedSections(ALL_SECTIONS.map(s => s.path))}
                  className="text-xs text-primary font-semibold hover:underline">All</button>
                <span className="text-muted-foreground text-xs">·</span>
                <button type="button" onClick={() => setAllowedSections([])}
                  className="text-xs text-muted-foreground font-semibold hover:underline">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SECTIONS.map(sec => {
                const Icon = sec.icon;
                const checked = allowedSections.includes(sec.path);
                return (
                  <button
                    key={sec.path}
                    type="button"
                    onClick={() => toggleSection(sec.path)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                      checked
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${checked ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium truncate">{sec.label}</span>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Module Lock</p>
                <p className="text-xs text-muted-foreground">Apply PIN lock to this user's sessions</p>
              </div>
            </div>
            <Toggle enabled={moduleLockEnabled} onToggle={() => setModuleLockEnabled(v => !v)} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            {initial ? "Save Changes" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  userName,
  userEmail,
  onSave,
  onClose,
}: {
  userName: string;
  userEmail: string;
  onSave: (newPassword: string) => void;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    onSave(newPassword);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm border border-border/50" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="px-6 py-5 border-b border-border/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">Reset Password</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{userName} · {userEmail}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoFocus
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(""); }}
                className="w-full pr-10 p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">The user can log in with this new password immediately.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Reset & Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const {
    lockConfig, saveLockConfig,
    saveMasterCredentials, getMasterCredentials,
    subUsers, addSubUser, updateSubUser, deleteSubUser,
    resetRequests, dismissResetRequest,
  } = useAuth();
  const { toast } = useToast();

  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminPassVisible, setAdminPassVisible] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [activeTab, setActiveTab] = useState<"locks" | "credentials" | "users">("locks");

  const [pin, setPin] = useState(lockConfig.pin);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState("");
  const [lockedModules, setLockedModules] = useState<string[]>(lockConfig.modules);

  const [newEmail, setNewEmail] = useState(getMasterCredentials().email);
  const [newPassword, setNewPassword] = useState(getMasterCredentials().password);
  const [passVisible, setPassVisible] = useState(false);
  const [credSaved, setCredSaved] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<SubUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [resettingRequest, setResettingRequest] = useState<{ id: string; name: string; email: string } | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim() === ADMIN_USER && adminPass === ADMIN_PASS) {
      setAdminLoggedIn(true);
      setAdminError("");
    } else {
      setAdminError("Invalid admin credentials.");
    }
  };

  const toggleModule = (path: string) => {
    if (!pin && !lockedModules.includes(path)) {
      setPinError("Set a 6-digit PIN first before locking any module.");
      return;
    }
    setLockedModules(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
    setPinError("");
  };

  const handleSaveLocks = () => {
    if (lockedModules.length > 0 && (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin))) {
      setPinError("PIN must be exactly 6 digits.");
      return;
    }
    saveLockConfig({ pin, modules: lockedModules });
    toast({ title: "Lock settings saved", description: "Module locks updated successfully." });
    setPinError("");
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes("@")) { toast({ title: "Invalid email", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" }); return; }
    saveMasterCredentials(newEmail, newPassword);
    setCredSaved(true);
    setTimeout(() => setCredSaved(false), 2000);
    toast({ title: "Master credentials updated", description: "New credentials will apply on next login." });
  };

  const handleAddUser = (data: UserFormData) => {
    addSubUser(data);
    setShowAddUser(false);
    toast({ title: "User added", description: `${data.name} can now log in.` });
  };

  const handleUpdateUser = (data: UserFormData) => {
    if (!editingUser) return;
    updateSubUser({ ...editingUser, ...data });
    setEditingUser(null);
    toast({ title: "User updated", description: `${data.name}'s settings saved.` });
  };

  const handleDeleteUser = (user: SubUser) => {
    if (!confirm(`Delete user "${user.name}"? They will lose access immediately.`)) return;
    deleteSubUser(user.id);
    toast({ title: "User removed", description: `${user.name} has been deleted.` });
  };

  const handleResetPassword = (newPass: string) => {
    if (!resettingRequest) return;
    const user = subUsers.find(u => u.email.toLowerCase() === resettingRequest.email.toLowerCase());
    if (user) {
      updateSubUser({ ...user, password: newPass });
      dismissResetRequest(resettingRequest.id);
      setResettingRequest(null);
      toast({
        title: "Password reset",
        description: `${resettingRequest.name}'s password has been updated. Request dismissed.`,
      });
    }
  };

  const handleDismissRequest = (id: string, name: string) => {
    if (!confirm(`Dismiss reset request from "${name}" without changing their password?`)) return;
    dismissResetRequest(id);
    toast({ title: "Request dismissed", description: `Reset request from ${name} dismissed.` });
  };

  if (!adminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Settings Access</h1>
            <p className="text-sm text-muted-foreground mt-1">Admin credentials required</p>
          </div>

          <div className="bg-card rounded-3xl p-8 shadow-xl border border-border/50">
            {adminError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                {adminError}
              </div>
            )}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Username</label>
                <input required autoFocus placeholder="Enter admin username"
                  value={adminUser} onChange={e => { setAdminUser(e.target.value); setAdminError(""); }}
                  className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input required type={adminPassVisible ? "text" : "password"} placeholder="Enter admin password"
                    value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminError(""); }}
                    className="w-full pr-10 p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                  <button type="button" onClick={() => setAdminPassVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {adminPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit"
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Access Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage security, access control and users</p>
        </div>
        <button onClick={() => setAdminLoggedIn(false)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors border border-border">
          <X className="w-3.5 h-3.5" /> Exit Settings
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border/50">
        {[
          { key: "locks", label: "Module Lock", icon: Lock },
          { key: "credentials", label: "Master Credentials", icon: Key },
          {
            key: "users",
            label: "User Management",
            icon: Users,
            badge: resetRequests.length > 0 ? resetRequests.length : null,
          },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {"badge" in tab && tab.badge ? (
                <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTab === "locks" && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-base text-foreground">Module Lock</h2>
            <span className="text-xs text-muted-foreground ml-auto">{lockedModules.length} locked</span>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Lock PIN <span className="text-muted-foreground font-normal">(6 digits, required to unlock any module)</span>
              </label>
              <div className="relative w-48">
                <input
                  type={pinVisible ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Set 6-digit PIN"
                  value={pin}
                  onChange={e => { setPinError(""); setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
                  className={`w-full pr-10 p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none text-sm font-mono tracking-widest ${pinError ? "border-red-400 focus:ring-red-200" : "border-border focus:ring-primary/20"}`}
                />
                <button type="button" onClick={() => setPinVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {pinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pinError && <p className="text-red-500 text-xs mt-1">{pinError}</p>}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground mb-3">Modules</p>
              {LOCKABLE_MODULES.map(mod => {
                const isLocked = lockedModules.includes(mod.path);
                const Icon = mod.icon;
                return (
                  <div key={mod.path} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLocked ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isLocked ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">{mod.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-primary mr-2" />}
                    <Toggle enabled={isLocked} onToggle={() => toggleModule(mod.path)} />
                  </div>
                );
              })}
            </div>

            <button onClick={handleSaveLocks}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Save Lock Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === "credentials" && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-base text-foreground">Master Admin Credentials</h2>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Master
            </span>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-5">
              These are the login credentials for the Master Admin account. Changes take effect on next login.
            </p>
            <form onSubmit={handleSaveCredentials} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Login Email</label>
                <input required type="email" placeholder="Enter new email"
                  value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Login Password</label>
                <div className="relative">
                  <input required type={passVisible ? "text" : "password"} placeholder="Enter new password"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full pr-10 p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                  <button type="button" onClick={() => setPassVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {passVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <button type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20">
                {credSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : "Update Credentials"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-5">

          {resetRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-3 border-b border-amber-200">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">Password Reset Requests</p>
                  <p className="text-xs text-amber-600">{resetRequests.length} pending request{resetRequests.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="divide-y divide-amber-200">
                {resetRequests.map(req => {
                  const requestedAt = new Date(req.requestedAt);
                  const timeAgo = (() => {
                    const diffMs = Date.now() - requestedAt.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins < 1) return "Just now";
                    if (diffMins < 60) return `${diffMins}m ago`;
                    const diffHrs = Math.floor(diffMins / 60);
                    if (diffHrs < 24) return `${diffHrs}h ago`;
                    return `${Math.floor(diffHrs / 24)}d ago`;
                  })();

                  return (
                    <div key={req.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                        {req.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-900">{req.name}</p>
                        <p className="text-xs text-amber-600 truncate">{req.email} · {timeAgo}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setResettingRequest({ id: req.id, name: req.name, email: req.email })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </button>
                        <button
                          onClick={() => handleDismissRequest(req.id, req.name)}
                          className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors text-amber-500 hover:text-amber-700"
                          title="Dismiss without resetting"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground">Sub-Users</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{subUsers.length} user{subUsers.length !== 1 ? "s" : ""} added</p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-border/50 bg-muted/30 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Master Admin</span>
              <span className="ml-auto text-xs text-muted-foreground">{getMasterCredentials().email}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Full Access</span>
            </div>

            {subUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <UserPlus className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">No sub-users yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">Add users and control which sections they can access and whether PIN lock applies to them.</p>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Add First User
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {subUsers.map(user => {
                  const isExpanded = expandedUser === user.id;
                  const hasPendingReset = resetRequests.some(r => r.email.toLowerCase() === user.email.toLowerCase());
                  return (
                    <div key={user.id}>
                      <div className="px-6 py-4 flex items-center gap-4">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                            {user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          {hasPendingReset && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-card" title="Password reset requested" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{user.name}</p>
                            {hasPendingReset && (
                              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">Reset Requested</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {user.allowedSections.length}/{ALL_SECTIONS.length} sections
                          </span>
                          {user.moduleLockEnabled && (
                            <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              <Lock className="w-3 h-3" /> Lock On
                            </span>
                          )}
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-4 bg-muted/20">
                          <div className="pt-3 border-t border-border/50">
                            <div className="flex items-center gap-4 mb-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allowed Sections</p>
                              <div className="flex items-center gap-1.5">
                                {user.moduleLockEnabled
                                  ? <span className="flex items-center gap-1 text-xs text-primary font-medium"><ToggleRight className="w-4 h-4" /> Module Lock: On</span>
                                  : <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium"><ToggleLeft className="w-4 h-4" /> Module Lock: Off</span>
                                }
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {ALL_SECTIONS.map(sec => {
                                const allowed = user.allowedSections.includes(sec.path);
                                const Icon = sec.icon;
                                return (
                                  <span key={sec.path}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                      allowed
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground line-through opacity-50"
                                    }`}>
                                    <Icon className="w-3 h-3" /> {sec.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddUser && (
        <UserFormModal
          onSave={handleAddUser}
          onClose={() => setShowAddUser(false)}
          existingEmails={[getMasterCredentials().email, ...subUsers.map(u => u.email)]}
        />
      )}

      {editingUser && (
        <UserFormModal
          initial={editingUser}
          onSave={handleUpdateUser}
          onClose={() => setEditingUser(null)}
          existingEmails={[getMasterCredentials().email, ...subUsers.filter(u => u.id !== editingUser.id).map(u => u.email)]}
        />
      )}

      {resettingRequest && (
        <ResetPasswordModal
          userName={resettingRequest.name}
          userEmail={resettingRequest.email}
          onSave={handleResetPassword}
          onClose={() => setResettingRequest(null)}
        />
      )}
    </div>
  );
}
