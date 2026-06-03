import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { PinModal } from "./PinModal";

const MODULE_NAMES: Record<string, string> = {
  "/":             "Dashboard",
  "/dashboard":    "Dashboard",
  "/pos":          "POS / New Bill",
  "/appointments": "Appointments",
  "/customers":    "Customers",
  "/invoices":     "Invoices",
  "/services":     "Services",
  "/products":     "Products",
  "/staff":        "Staff",
  "/memberships":  "Memberships",
  "/reports":      "Reports",
};

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { lockConfig, unlockedModules, unlockModule, currentUser, isMasterAdmin } = useAuth();
  const isPosPage = location === "/pos";

  const basePath = location.split("/").slice(0, 2).join("/") || "/";

  useEffect(() => {
    if (!isMasterAdmin && currentUser) {
      const allowed = currentUser.allowedSections;
      if (!allowed.includes(basePath) && basePath !== "/settings") {
        navigate("/");
      }
    }
  }, [basePath, isMasterAdmin, currentUser, navigate]);

  const pinLockActive = currentUser?.moduleLockEnabled ?? isMasterAdmin;
  const isLocked = pinLockActive && lockConfig.modules.includes(basePath) && !unlockedModules.has(basePath);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {!isPosPage && <Sidebar />}
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>

      {isLocked && lockConfig.pin && (
        <PinModal
          moduleName={MODULE_NAMES[basePath] || "this module"}
          correctPin={lockConfig.pin}
          onSuccess={() => unlockModule(basePath)}
          onCancel={() => navigate("/")}
        />
      )}
    </div>
  );
}
