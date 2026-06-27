import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, getCurrentUserFromSession, CurrentUser } from "@/contexts/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Customers from "@/pages/customers";
import POS from "@/pages/pos";
import Services from "@/pages/services";
import Staff from "@/pages/staff";
import StaffHistory from "@/pages/staff-history";
import CustomerHistory from "@/pages/customer-history";
import Products from "@/pages/products";
import Memberships from "@/pages/memberships";
import Reports from "@/pages/reports";
import Invoices from "@/pages/invoices";
import Upgradations from "@/pages/upgradations";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/customers" component={Customers} />
        <Route path="/pos" component={POS} />
        <Route path="/services" component={Services} />
        <Route path="/staff" component={Staff} />
        <Route path="/staff/:staffId/history" component={StaffHistory} />
        <Route path="/customers/:customerId/history" component={CustomerHistory} />
        <Route path="/products" component={Products} />
        <Route path="/memberships" component={Memberships} />
        <Route path="/reports" component={Reports} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/upgradations" component={Upgradations} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (sessionStorage.getItem("atsalon_session") === "true") {
      return getCurrentUserFromSession();
    }
    return null;
  });

  const handleLogin = (user: CurrentUser) => setCurrentUser(user);
  const handleLogout = () => {
    sessionStorage.removeItem("atsalon_session");
    sessionStorage.removeItem("atsalon_current_user");
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Login onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider currentUser={currentUser}>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
