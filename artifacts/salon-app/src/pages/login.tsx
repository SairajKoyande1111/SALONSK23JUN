import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import {
  getMasterCredentials,
  getSubUsers,
  setSessionUser,
  CurrentUser,
  addResetRequest,
} from "@/contexts/auth";

interface Props {
  onLogin: (user: CurrentUser) => void;
}

type View = "login" | "forgot" | "forgot_success";

export default function Login({ onLogin }: Props) {
  const [view, setView] = useState<View>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

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

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    setTimeout(() => {
      const result = addResetRequest(forgotEmail.trim());
      if (result === "not_found") {
        setForgotError("No account found with this email address.");
      } else if (result === "already_pending") {
        setForgotError("A reset request for this email is already pending. Please contact the admin.");
      } else {
        setView("forgot_success");
      }
      setForgotLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-widest">AT SMART SALON</h1>
          <p className="text-white/50 text-xs tracking-widest uppercase mt-1">Salon Management Software</p>
        </div>

        {view === "login" && (
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-muted-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView("forgot"); setForgotEmail(email); setForgotError(""); }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
        )}

        {view === "forgot" && (
          <div className="bg-card rounded-3xl shadow-2xl p-8">
            <button
              type="button"
              onClick={() => setView("login")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight">Forgot Password?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">We'll send a reset request to the admin</p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Your Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Enter your registered email"
                    value={forgotEmail}
                    onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs leading-relaxed">
                Your request will be queued for the <strong>Master Admin</strong>. Once they reset your password, you'll be able to log in with your new credentials.
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {forgotLoading ? "Sending request..." : "Send Reset Request"}
              </button>
            </form>
          </div>
        )}

        {view === "forgot_success" && (
          <div className="bg-card rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Request Sent!</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Your password reset request has been queued for the <strong className="text-foreground">Master Admin</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Please contact the admin and try logging in again once they've reset your password.
            </p>
            <button
              onClick={() => { setView("login"); setPassword(""); setForgotEmail(""); }}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
