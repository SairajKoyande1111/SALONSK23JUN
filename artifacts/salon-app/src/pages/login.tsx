import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
  getMasterCredentials,
  getSubUsers,
  setSessionUser,
  CurrentUser,
} from "@/contexts/auth";

interface Props {
  onLogin: (user: CurrentUser) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const masterCreds = getMasterCredentials();

      if (email.trim() === masterCreds.email && password === masterCreds.password) {
        const user: CurrentUser = {
          email: masterCreds.email,
          name: "Master Admin",
          isMaster: true,
          allowedSections: ["*"],
          moduleLockEnabled: true,
        };
        setSessionUser(user);
        onLogin(user);
        setLoading(false);
        return;
      }

      const subUsers = getSubUsers();
      const matched = subUsers.find(
        u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (matched) {
        const user: CurrentUser = {
          email: matched.email,
          name: matched.name,
          isMaster: false,
          allowedSections: matched.allowedSections,
          moduleLockEnabled: matched.moduleLockEnabled,
        };
        setSessionUser(user);
        onLogin(user);
        setLoading(false);
        return;
      }

      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-widest" style={{ fontFamily: "'Poppins', sans-serif" }}>AT SMART SALON</h1>
          <p className="text-white/50 text-xs tracking-widest uppercase mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Salon Management Software</p>
        </div>

        <div className="bg-card rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to access your dashboard</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
