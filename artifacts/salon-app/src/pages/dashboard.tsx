import { useState, useEffect } from "react";
import {
  Users, Receipt, TrendingUp, CalendarDays, Clock,
  Scissors, ShoppingBag, RefreshCw, Crown, Wallet,
  Package, CheckCircle2, XCircle, BadgeAlert, CreditCard,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";

function useStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      setData(await res.json());
    } catch {}
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);
  return { data, loading, refresh };
}

const SERVICE_COLORS = ["#7c3aed", "#9333ea", "#a855f7", "#c084fc", "#ddd6fe"];
const PRODUCT_COLORS = ["#be185d", "#db2777", "#ec4899", "#f472b6", "#fce7f3"];
const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981", scheduled: "#f59e0b", confirmed: "#3b82f6", cancelled: "#ef4444",
};
const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};
const PM_COLORS: Record<string, string> = {
  cash: "#10b981", card: "#7c3aed", upi: "#f59e0b", other: "#94a3b8",
};

const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <strong>{typeof p.value === "number" && (p.dataKey === "revenue" || p.dataKey === "expenses") ? fmt(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: stats, loading, refresh } = useStats();
  const [apptTab, setApptTab] = useState<"today" | "upcoming">("today");
  const [viewInvoiceBill, setViewInvoiceBill] = useState<any>(null);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-60 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="grid grid-cols-5 gap-6">
          <Skeleton className="col-span-3 h-56 rounded-2xl" />
          <Skeleton className="col-span-2 h-56 rounded-2xl" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  const s = stats || {} as any;
  const todayRevenue: number = s.todayRevenue || 0;
  const todayBills: number = s.todayBills || 0;
  const todayCustomers: number = s.todayCustomers || 0;
  const totalCustomers: number = s.totalCustomers || 0;
  const activeMembers: number = s.activeMembers || 0;
  const pendingAppointments: number = s.pendingAppointments || 0;
  const lowStockCount: number = s.lowStockCount || 0;
  const lowStockProducts: any[] = s.lowStockProducts || [];
  const monthRevenue: number = s.monthRevenue || 0;
  const monthExpenses: number = s.monthExpenses || 0;
  const netProfit: number = monthRevenue - monthExpenses;
  const topServices: any[] = s.topServices || [];
  const topProducts: any[] = s.topProducts || [];
  const todayBillsList: any[] = s.todayBillsList || [];
  const todayAppts: any[] = s.todayAppointments || [];
  const upcomingAppts: any[] = s.upcomingAppointments || [];
  const monthlyRevenue: any[] = s.monthlyRevenue || [];
  const staffPerformance: any[] = s.staffPerformance || [];
  const recentCustomers: any[] = s.recentCustomers || [];
  const apptStatusBreakdown: any = s.apptStatusBreakdown || {};
  const paymentBreakdown: any = s.paymentBreakdown || {};

  const apptPieData = Object.entries(apptStatusBreakdown)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number, color: STATUS_COLORS[k] || "#94a3b8" }));

  const paymentPieData = Object.entries(paymentBreakdown)
    .map(([k, v]: [string, any]) => ({
      name: k.toUpperCase(), value: v.amount as number, count: v.count as number,
      color: PM_COLORS[k] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  const apptList = apptTab === "today" ? todayAppts : upcomingAppts;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          {
            label: "Today's Revenue", value: fmt(todayRevenue),
            sub: `${todayBills} bill${todayBills !== 1 ? "s" : ""} · ${todayCustomers} customer${todayCustomers !== 1 ? "s" : ""}`,
            icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100",
          },
          {
            label: "Month Revenue", value: fmt(monthRevenue),
            sub: `Expenses: ${fmt(monthExpenses)} · Net: ${fmt(netProfit)}`,
            icon: Wallet,
            color: netProfit >= 0 ? "text-violet-600" : "text-red-600",
            bg: netProfit >= 0 ? "bg-violet-50" : "bg-red-50",
            border: netProfit >= 0 ? "border-violet-100" : "border-red-100",
          },
          {
            label: "Active Members", value: activeMembers,
            sub: `${totalCustomers} total customers registered`,
            icon: Crown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",
          },
          {
            label: "Pending Appointments", value: pendingAppointments,
            sub: lowStockCount > 0 ? `⚠ ${lowStockCount} product${lowStockCount !== 1 ? "s" : ""} low on stock` : "All stock levels OK",
            icon: CalendarDays, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100",
          },
        ] as const).map((card: any) => (
          <Card key={card.label} className={`rounded-2xl border ${card.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.bg} ${card.color}`}>LIVE</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{card.label}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue vs Expenses Trend  +  Appointment Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue vs Expenses — Last 6 Months
              </h3>
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Expenses</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={monthlyRevenue} margin={{ left: 0, right: 12, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-sky-600" /> Appointments This Month
            </h3>
            {apptPieData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <CalendarDays className="w-9 h-9 opacity-20" />
                <p className="text-xs">No appointments this month</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={apptPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                      {apptPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: string) => [v, name]} contentStyle={{ borderRadius: 10, fontSize: 11, border: "1px solid #e5e7eb" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {apptPieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground capitalize">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Services  +  Top Products ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
              <Scissors className="w-4 h-4 text-secondary" /> Top Services This Month
            </h3>
            {topServices.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Scissors className="w-9 h-9 opacity-20" />
                <p className="text-sm">No service data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topServices.map((svc: any, i: number) => {
                  const pct = Math.round((svc.revenue / (topServices[0]?.revenue || 1)) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: SERVICE_COLORS[i] }}>
                            {i + 1}
                          </span>
                          <span className="font-medium text-foreground truncate">{svc.name}</span>
                        </div>
                        <span className="shrink-0 text-muted-foreground ml-2">
                          {svc.count}× · <span className="font-semibold text-foreground">{fmt(svc.revenue)}</span>
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: SERVICE_COLORS[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-secondary" /> Top Products This Month
            </h3>
            {topProducts.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Package className="w-9 h-9 opacity-20" />
                <p className="text-sm">No product sales yet</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left pb-2.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left pb-2.5 font-medium text-muted-foreground">Product</th>
                    <th className="text-center pb-2.5 font-medium text-muted-foreground">Qty Sold</th>
                    <th className="text-right pb-2.5 font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {topProducts.map((p: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: PRODUCT_COLORS[i] }}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-foreground max-w-[160px] truncate">{p.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{p.count}</td>
                      <td className="py-3 text-right font-semibold text-foreground">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/50">
                    <td colSpan={3} className="pt-2.5 text-xs text-muted-foreground font-medium">Total</td>
                    <td className="pt-2.5 text-right font-bold text-foreground text-sm">
                      {fmt(topProducts.reduce((s: number, p: any) => s + p.revenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Today's Bills  +  Appointments ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Receipt className="w-4 h-4 text-secondary" /> Today's Bills
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  {todayBillsList.length} bill{todayBillsList.length !== 1 ? "s" : ""}
                </span>
                {todayBillsList.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600">{fmt(todayRevenue)}</span>
                )}
              </div>
            </div>
            {todayBillsList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm">No bills today yet</p>
                <p className="text-xs mt-1 opacity-70">Bills created from POS will appear here</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/50">
                      <th className="text-left pb-2.5 font-medium text-muted-foreground">Bill #</th>
                      <th className="text-left pb-2.5 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left pb-2.5 font-medium text-muted-foreground">Time</th>
                      <th className="text-center pb-2.5 font-medium text-muted-foreground">Payment</th>
                      <th className="text-right pb-2.5 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {todayBillsList.map((bill: any) => (
                      <tr key={bill.id || bill._id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                        onClick={() => setViewInvoiceBill(bill)}>
                        <td className="py-3 font-semibold text-primary group-hover:underline">{bill.billNumber}</td>
                        <td className="py-3 text-foreground">{bill.customerName || "Walk-in"}</td>
                        <td className="py-3 text-muted-foreground">
                          {bill.createdAt ? format(new Date(bill.createdAt), "hh:mm a") : "—"}
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                            style={{ backgroundColor: `${PM_COLORS[bill.paymentMethod] || "#94a3b8"}22`, color: PM_COLORS[bill.paymentMethod] || "#94a3b8" }}>
                            {bill.paymentMethod || "other"}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-600">{fmt(bill.finalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/60">
                      <td colSpan={4} className="pt-3 text-xs font-semibold text-muted-foreground">Today's Total</td>
                      <td className="pt-3 text-right font-bold text-emerald-600 text-sm">{fmt(todayRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-secondary" /> Appointments
            </h3>
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
              {(["today", "upcoming"] as const).map(tab => (
                <button key={tab} onClick={() => setApptTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${apptTab === tab ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "today" ? "Today" : "Upcoming (7d)"}
                </button>
              ))}
            </div>
            {apptList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CalendarDays className="w-9 h-9 mx-auto opacity-20 mb-2" />
                <p className="text-xs">No appointments {apptTab === "today" ? "today" : "in the next 7 days"}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {apptList.map((appt: any) => (
                  <div key={appt.id || appt._id} className="p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-semibold text-xs text-foreground truncate">{appt.customerName}</p>
                          <span className={`inline-block shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[appt.status] || "bg-muted text-muted-foreground"}`}>
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{appt.serviceName}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/70">
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{appt.appointmentTime}</span>
                          {apptTab === "upcoming" && appt.appointmentDate && (
                            <span>· {format(parseISO(appt.appointmentDate), "dd MMM")}</span>
                          )}
                          {appt.staffName && <span>· {appt.staffName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {apptList.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {apptList.filter((a: any) => a.status === "completed").length} done
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  {apptList.filter((a: any) => a.status === "cancelled").length} cancelled
                </span>
                <span className="font-medium text-foreground">{apptList.length} total</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Staff Performance  +  Recent Customers  +  Payments / Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Performance */}
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-secondary" /> Staff Performance This Month
            </h3>
            {staffPerformance.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto opacity-20 mb-2" />
                <p className="text-xs">No data yet</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left pb-2.5 font-medium text-muted-foreground">Staff</th>
                    <th className="text-center pb-2.5 font-medium text-muted-foreground">Appts</th>
                    <th className="text-right pb-2.5 font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {staffPerformance.map((st: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {st.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[90px]">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-muted-foreground">{st.appointments}</td>
                      <td className="py-2.5 text-right font-semibold text-foreground">{fmt(st.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-violet-500" /> Recent Customers
            </h3>
            {recentCustomers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto opacity-20 mb-2" />
                <p className="text-xs">No customers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCustomers.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0">
                      {(c.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {c.createdAt ? format(new Date(c.createdAt), "dd MMM") : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods or Low Stock */}
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            {lowStockProducts.length > 0 ? (
              <>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                  <BadgeAlert className="w-4 h-4 text-red-500" /> Low Stock Alerts
                </h3>
                <div className="space-y-2.5">
                  {lowStockProducts.slice(0, 5).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                      <div className="min-w-0">
                        <p className="font-medium text-xs text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-red-500 mt-0.5">
                          Current: <strong>{p.stock}</strong> · Min: {p.minStock}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 ml-2">
                        <Package className="w-4 h-4 text-red-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : paymentPieData.length > 0 ? (
              <>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-secondary" /> Payment Methods This Month
                </h3>
                <div className="space-y-3">
                  {paymentPieData.map((p: any, i: number) => {
                    const maxVal = paymentPieData[0]?.value || 1;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-2 font-medium">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </span>
                          <span className="text-muted-foreground">
                            {p.count} bill{p.count !== 1 ? "s" : ""} · <span className="font-semibold text-foreground">{fmt(p.value)}</span>
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((p.value / maxVal) * 100)}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-secondary" /> Payment Methods
                </h3>
                <div className="py-8 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto opacity-20 mb-2" />
                  <p className="text-xs">No payment data this month</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {viewInvoiceBill && (
        <InvoiceModal bill={viewInvoiceBill} onClose={() => setViewInvoiceBill(null)} />
      )}
    </div>
  );
}
