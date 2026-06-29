import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, Users, Receipt, Scissors, CalendarDays, Clock,
  RefreshCw, Crown, Package, Bell, CheckCircle2, XCircle,
  AlertCircle, Wallet, Search, IndianRupee, Phone,
  ChevronRight, UserCheck, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";
const fmtRs = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const STATUS_CFG: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
  scheduled: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",  dot: "bg-amber-400",  label: "Scheduled" },
  confirmed:  { bg: "bg-blue-50",   text: "text-blue-700",    ring: "ring-blue-200",   dot: "bg-blue-400",   label: "Confirmed"  },
  completed:  { bg: "bg-emerald-50",text: "text-emerald-700", ring: "ring-emerald-200",dot: "bg-emerald-500",label: "Completed"  },
  cancelled:  { bg: "bg-red-50",    text: "text-red-600",     ring: "ring-red-200",    dot: "bg-red-400",    label: "Cancelled"  },
};

const PM_COLORS: Record<string, string> = { cash:"#10b981", card:"#7c3aed", upi:"#f59e0b", other:"#94a3b8" };

type ApptFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "scheduled" | "confirmed" | "completed" | "cancelled";

function useStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/dashboard/stats`);
      setData(await r.json());
    } catch {}
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);
  return { data, loading, refresh };
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function KPICard({ label, value, sub, icon: Icon, accent, accentText, pulse }:
  { label: string; value: string | number; sub?: string; icon: any; accent: string; accentText: string; pulse?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${accentText}`} />
        </div>
        {pulse && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accent} ${accentText} flex items-center gap-1`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> LIVE
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, loading, refresh } = useStats();
  const [apptFilter, setApptFilter] = useState<ApptFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [apptSearch, setApptSearch] = useState("");
  const [viewInvoiceBill, setViewInvoiceBill] = useState<any>(null);

  const s = stats || {};
  const todayRevenue: number = s.todayRevenue || 0;
  const todayBills: number = s.todayBills || 0;
  const todayCustomers: number = s.todayCustomers || 0;
  const activeMembers: number = s.activeMembers || 0;
  const pendingAppts: number = s.pendingAppointments || 0;
  const lowStockCount: number = s.lowStockCount || 0;
  const lowStockProducts: any[] = s.lowStockProducts || [];
  const monthRevenue: number = s.monthRevenue || 0;
  const monthExpenses: number = s.monthExpenses || 0;
  const netProfit: number = monthRevenue - monthExpenses;
  const todayBillsList: any[] = s.todayBillsList || [];
  const todayAppts: any[] = s.todayAppointments || [];
  const monthAppts: any[] = s.monthAppointments || [];
  const weekAppts: any[] = s.weekAppointments || [];
  const upcomingAppts: any[] = s.upcomingAppointments || [];
  const staffPerformance: any[] = s.staffPerformance || [];
  const monthlyRevenue: any[] = s.monthlyRevenue || [];

  const todayServicesCount = todayBillsList.reduce((sum: number, b: any) =>
    sum + (b.items || []).filter((i: any) => i.type === "service").length, 0);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const todayReminderAppts = useMemo(() =>
    todayAppts
      .filter(a => a.status === "scheduled" || a.status === "confirmed")
      .sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || "")),
    [todayAppts]);

  const filteredAppts = useMemo(() => {
    let list: any[] = [];
    if (apptFilter === "today") list = todayAppts;
    else if (apptFilter === "week") list = weekAppts;
    else if (apptFilter === "month") list = monthAppts;
    else list = [...monthAppts, ...upcomingAppts.filter(a => !monthAppts.find(m => m.id === a.id))];

    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    if (apptSearch.trim()) {
      const q = apptSearch.toLowerCase();
      list = list.filter(a =>
        (a.customerName || "").toLowerCase().includes(q) ||
        (a.serviceName || "").toLowerCase().includes(q) ||
        (a.staffName || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const da = a.appointmentDate || "";
      const db = b.appointmentDate || "";
      if (da !== db) return da.localeCompare(db);
      return (a.appointmentTime || "").localeCompare(b.appointmentTime || "");
    });
  }, [apptFilter, statusFilter, apptSearch, todayAppts, weekAppts, monthAppts, upcomingAppts]);

  const groupedAppts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const a of filteredAppts) {
      const d = a.appointmentDate || "Unknown";
      if (!groups[d]) groups[d] = [];
      groups[d].push(a);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAppts]);

  const formatApptDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      if (isToday(d)) return "Today";
      if (isTomorrow(d)) return "Tomorrow";
      return format(d, "EEEE, dd MMM yyyy");
    } catch { return dateStr; }
  };

  const isApptDateToday = (dateStr: string) => dateStr === todayStr;
  const isApptSoon = (appt: any) => {
    if (appt.appointmentDate !== todayStr) return false;
    if (!appt.appointmentTime) return false;
    const [h, m] = appt.appointmentTime.split(":").map(Number);
    const apptMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return apptMinutes - nowMinutes <= 60 && apptMinutes >= nowMinutes;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-xl w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-80 bg-gray-100 rounded-2xl" />
          <div className="h-80 bg-gray-100 rounded-2xl" />
        </div>
        <div className="h-72 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-52 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:bg-gray-50 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <a href="/billing"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Receipt className="w-3.5 h-3.5" /> New Bill
          </a>
        </div>
      </div>

      {/* ── TODAY'S KPI Row (5 cards) ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Today's Revenue" value={fmtRs(todayRevenue)}
          sub={`${todayBills} bill${todayBills !== 1 ? "s" : ""}`}
          icon={IndianRupee} accent="bg-emerald-100" accentText="text-emerald-700" pulse />
        <KPICard label="Customers Visited" value={todayCustomers}
          sub="unique today"
          icon={UserCheck} accent="bg-violet-100" accentText="text-violet-700" pulse />
        <KPICard label="Services Done" value={todayServicesCount}
          sub="from today's bills"
          icon={Scissors} accent="bg-pink-100" accentText="text-pink-700" pulse />
        <KPICard label="Today's Appointments" value={todayAppts.length}
          sub={`${todayReminderAppts.length} pending`}
          icon={CalendarDays} accent="bg-sky-100" accentText="text-sky-700" pulse />
        <KPICard label="Active Members" value={activeMembers}
          sub="membership holders"
          icon={Crown} accent="bg-amber-100" accentText="text-amber-700" />
      </div>

      {/* ── APPOINTMENTS — PRIMARY FOCUS ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Monthly appointment list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Appointments
              </h2>
              <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-full">
                {filteredAppts.length} showing
              </span>
            </div>

            {/* Time filter tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
              {(["today", "week", "month", "all"] as ApptFilter[]).map(f => {
                const cnt = f === "today" ? todayAppts.length : f === "week" ? weekAppts.length : f === "month" ? monthAppts.length : monthAppts.length;
                const lbl = f === "today" ? "Today" : f === "week" ? "This Week" : f === "month" ? "This Month" : "All";
                return (
                  <button key={f} onClick={() => setApptFilter(f)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${apptFilter === f ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}>
                    {lbl} <span className="opacity-60">({cnt})</span>
                  </button>
                );
              })}
            </div>

            {/* Status filter + Search */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={apptSearch}
                  onChange={e => setApptSearch(e.target.value)}
                  placeholder="Search customer / service / staff..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "scheduled", "confirmed", "completed", "cancelled"] as StatusFilter[]).map(st => (
                  <button key={st} onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all capitalize ${
                      statusFilter === st
                        ? st === "all" ? "bg-primary text-white" : `${STATUS_CFG[st]?.bg || "bg-gray-100"} ${STATUS_CFG[st]?.text || "text-gray-700"} ring-1 ${STATUS_CFG[st]?.ring || ""}`
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {st === "all" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Appointment list */}
          <div className="overflow-y-auto max-h-[480px]">
            {filteredAppts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm font-medium">No appointments found</p>
                <p className="text-xs mt-1 opacity-60">Try adjusting the filter or search</p>
              </div>
            ) : (
              groupedAppts.map(([dateStr, appts]) => (
                <div key={dateStr}>
                  <div className={`sticky top-0 z-10 px-5 py-2 flex items-center justify-between border-b border-gray-100 ${isApptDateToday(dateStr) ? "bg-violet-50" : "bg-gray-50"}`}>
                    <span className={`text-xs font-bold ${isApptDateToday(dateStr) ? "text-violet-700" : "text-gray-600"}`}>
                      {isApptDateToday(dateStr) && <span className="mr-1.5">📅</span>}{formatApptDate(dateStr)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{appts.length} booking{appts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {appts.map((appt: any) => (
                      <div key={appt.id || appt._id}
                        className={`px-5 py-3 hover:bg-gray-50 transition-colors group ${isApptSoon(appt) ? "bg-amber-50/50" : ""}`}>
                        <div className="flex items-center gap-3">
                          {/* Time */}
                          <div className="text-center min-w-[52px]">
                            <p className="text-xs font-bold text-gray-800">
                              {appt.appointmentTime
                                ? (() => {
                                    const [h, m] = (appt.appointmentTime || "00:00").split(":").map(Number);
                                    const ampm = h >= 12 ? "PM" : "AM";
                                    const h12 = h % 12 || 12;
                                    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                                  })()
                                : "—"}
                            </p>
                            {isApptSoon(appt) && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded-full">SOON</span>
                            )}
                          </div>
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {(appt.customerName || "?").charAt(0).toUpperCase()}
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-gray-900 truncate">{appt.customerName || "Walk-in"}</p>
                              <StatusBadge status={appt.status} />
                              {isApptSoon(appt) && (
                                <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                                  <Bell className="w-2.5 h-2.5" /> Reminder
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{appt.serviceName || "Service not specified"}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {appt.staffName && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />{appt.staffName}
                                </span>
                              )}
                              {appt.customerPhone && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />{appt.customerPhone}
                                </span>
                              )}
                              {appt.duration && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />{appt.duration} min
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Notes */}
                          {appt.notes && (
                            <div className="max-w-[100px] hidden md:block">
                              <p className="text-[10px] text-gray-400 italic truncate" title={appt.notes}>{appt.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
            <div className="flex gap-4">
              {(["scheduled","confirmed","completed","cancelled"] as const).map(st => {
                const cnt = filteredAppts.filter((a: any) => a.status === st).length;
                const cfg = STATUS_CFG[st];
                return cnt > 0 ? (
                  <span key={st} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="capitalize">{st} ({cnt})</span>
                  </span>
                ) : null;
              })}
            </div>
            <a href="/appointments" className="flex items-center gap-1 text-primary font-semibold hover:underline text-xs">
              Manage All <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* RIGHT: Today's Reminders + Quick Stats */}
        <div className="flex flex-col gap-4">
          {/* Today's Reminders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Today's Reminders
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${todayReminderAppts.length > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                {todayReminderAppts.length} pending
              </span>
            </div>
            {todayReminderAppts.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto opacity-20 mb-2 text-emerald-500" />
                <p className="text-xs font-medium text-gray-500">All caught up!</p>
                <p className="text-[11px] mt-1 opacity-70">No pending appointments today</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {todayReminderAppts.map((appt: any) => {
                  const soon = isApptSoon(appt);
                  return (
                    <div key={appt.id || appt._id}
                      className={`p-3.5 ${soon ? "bg-amber-50" : "hover:bg-gray-50"} transition-colors`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 ${soon ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"}`}>
                          {(appt.customerName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{appt.customerName || "Walk-in"}</p>
                            {soon && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />SOON</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">{appt.serviceName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${soon ? "text-amber-600" : "text-gray-500"}`}>
                              <Clock className="w-2.5 h-2.5" />
                              {appt.appointmentTime
                                ? (() => {
                                    const [h, m] = (appt.appointmentTime || "00:00").split(":").map(Number);
                                    const ampm = h >= 12 ? "PM" : "AM";
                                    const h12 = h % 12 || 12;
                                    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                                  })()
                                : "—"}
                            </span>
                            {appt.staffName && (
                              <span className="text-[10px] text-gray-400 truncate">{appt.staffName}</span>
                            )}
                          </div>
                          {appt.customerPhone && (
                            <a href={`tel:${appt.customerPhone}`}
                              className="mt-1 text-[10px] text-primary font-semibold flex items-center gap-0.5 hover:underline w-fit">
                              <Phone className="w-2.5 h-2.5" />{appt.customerPhone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Quick Stats</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-violet-500" />Month Revenue</span>
                <span className="text-xs font-bold text-gray-900">{fmtRs(monthRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-2"><TrendingUp className={`w-3.5 h-3.5 ${netProfit >= 0 ? "text-emerald-500" : "text-red-400"}`} />Net Profit</span>
                <span className={`text-xs font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtRs(netProfit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-sky-500" />Pending Appts</span>
                <span className="text-xs font-bold text-gray-900">{pendingAppts}</span>
              </div>
              {lowStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-500 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />Low Stock</span>
                  <span className="text-xs font-bold text-red-600">{lowStockCount} item{lowStockCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TODAY'S BILLS ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-secondary" /> Today's Bills
          </h2>
          <div className="flex items-center gap-3">
            {todayBillsList.length > 0 && (
              <span className="text-sm font-bold text-emerald-600">{fmtRs(todayRevenue)}</span>
            )}
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold">
              {todayBillsList.length} bill{todayBillsList.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {todayBillsList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto opacity-20 mb-3" />
            <p className="text-sm font-medium">No bills today yet</p>
            <p className="text-xs mt-1 opacity-70">Bills created from POS will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Bill #</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500">Customer</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500">Time</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 hidden sm:table-cell">Services</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500">Payment</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayBillsList.map((bill: any) => (
                  <tr key={bill.id || bill._id}
                    onClick={() => setViewInvoiceBill(bill)}
                    className="hover:bg-gray-50 cursor-pointer group transition-colors">
                    <td className="px-5 py-3.5 font-bold text-primary group-hover:underline">{bill.billNumber}</td>
                    <td className="px-3 py-3.5 font-medium text-gray-800">{bill.customerName || "Walk-in"}</td>
                    <td className="px-3 py-3.5 text-gray-500">
                      {bill.createdAt ? format(new Date(bill.createdAt), "hh:mm a") : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-gray-400 hidden sm:table-cell">
                      {(bill.items || []).filter((i: any) => i.type === "service").map((i: any) => i.name).join(", ").slice(0, 40) || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                        style={{ backgroundColor: `${PM_COLORS[bill.paymentMethod] || "#94a3b8"}22`, color: PM_COLORS[bill.paymentMethod] || "#94a3b8" }}>
                        {bill.paymentMethod || "other"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{fmtRs(bill.finalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-5 py-3 text-xs font-bold text-gray-600">Today's Total</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-600 text-sm">{fmtRs(todayRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── BOTTOM ROW ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Staff Performance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> Staff Performance — This Month
          </h3>
          {staffPerformance.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p className="text-xs">No data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffPerformance.map((st: any, i: number) => {
                const maxRev = staffPerformance[0]?.revenue || 1;
                const pct = Math.round((st.revenue / maxRev) * 100);
                const colors = ["#7c3aed", "#db2777", "#ea580c", "#059669", "#2563eb"];
                const col = colors[i % colors.length];
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: col }}>
                        {st.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-800 truncate">{st.name}</span>
                        <span className="shrink-0 ml-2 font-bold text-gray-900">{fmtRs(st.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 ml-10">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: col }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-10">{st.appointments} appointments</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue — Last 6 Months
          </h3>
          {monthlyRevenue.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-gray-400 text-xs">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyRevenue} margin={{ left: 0, right: 8, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={42} />
                <Tooltip formatter={(v: any) => fmtRs(v)} contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid #e5e7eb" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#dashRevGrad)" dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" /> Alerts & Notices
          </h3>
          <div className="space-y-3">
            {/* Low Stock */}
            {lowStockCount > 0 ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-2">
                  <Package className="w-3.5 h-3.5" /> {lowStockCount} Low Stock Item{lowStockCount !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 4).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-red-600 truncate">{p.name}</span>
                      <span className="text-red-500 font-bold shrink-0 ml-2">{p.stock} left</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700 font-semibold">All products in stock</p>
              </div>
            )}

            {/* Upcoming appointments reminder */}
            {upcomingAppts.length > 0 && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                <p className="text-xs font-bold text-sky-700 flex items-center gap-1.5 mb-2">
                  <CalendarDays className="w-3.5 h-3.5" /> Upcoming (Next 7 Days)
                </p>
                {upcomingAppts.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-sky-700 truncate font-medium">{a.customerName}</span>
                    <span className="text-sky-500 shrink-0 ml-2">
                      {(() => {
                        try {
                          const d = new Date(a.appointmentDate + "T00:00:00");
                          if (isTomorrow(d)) return "Tomorrow";
                          return format(d, "dd MMM");
                        } catch { return a.appointmentDate; }
                      })()}
                    </span>
                  </div>
                ))}
                {upcomingAppts.length > 3 && (
                  <p className="text-[10px] text-sky-500 mt-1">+{upcomingAppts.length - 3} more</p>
                )}
              </div>
            )}

            {/* Members */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-bold text-amber-700">Active Members</p>
              </div>
              <span className="text-sm font-bold text-amber-700">{activeMembers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {viewInvoiceBill && (
        <InvoiceModal bill={viewInvoiceBill} onClose={() => setViewInvoiceBill(null)} />
      )}
    </div>
  );
}
