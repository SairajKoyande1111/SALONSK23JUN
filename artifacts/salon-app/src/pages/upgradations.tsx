import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BarChart2, IndianRupee, Receipt, TrendingUp, Trophy,
  Calendar, Star, Phone, Briefcase, ArrowUpRight, Scissors, Package, ChevronRight,
} from "lucide-react";

const API_BASE = "/api";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-indigo-700",
  "from-emerald-500 to-green-700",
];

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

interface StaffPerformance {
  staffId: string | null;
  staffName: string;
  staffRole: string;
  staffPhone: string;
  totalBills: number;
  totalRevenue: number;
  upgradationRevenue: number;
  upgradationCount: number;
  services: { name: string; type: string; count: number; revenue: number }[];
}

interface Summary {
  totalBills: number;
  totalRevenue: number;
}

export default function StaffReports() {
  const [, setLocation] = useLocation();
  const [report, setReport] = useState<StaffPerformance[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalBills: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/staff-report${q}`);
      const data = await res.json();
      setReport(data.report || []);
      setSummary(data.summary || { totalBills: 0, totalRevenue: 0 });
    } catch {
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const totalUpgradationRevenue = report.reduce((a, r) => a + r.upgradationRevenue, 0);
  const totalUpgradations = report.reduce((a, r) => a + r.upgradationCount, 0);
  const topStaff = report[0];
  const maxRevenue = report.length > 0 ? report[0].totalRevenue : 1;

  const goToDetail = (staff: StaffPerformance) => {
    const id = staff.staffId || "unassigned";
    setLocation(`/staff-detail/${encodeURIComponent(id)}`);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-500/15 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Staff Reports</h1>
            <p className="text-sm text-muted-foreground">Staff-wise performance, revenue &amp; upgradation analysis</p>
          </div>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="text-xs bg-transparent text-foreground focus:outline-none" />
          </div>
          <span className="text-muted-foreground text-xs">to</span>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="text-xs bg-transparent text-foreground focus:outline-none" />
          </div>
          <button onClick={fetchReport}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors">
            Apply
          </button>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); setTimeout(fetchReport, 50); }}
              className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₹{fmt(summary.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">actual collected revenue</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bills Served</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{summary.totalBills}</p>
          <p className="text-xs text-muted-foreground mt-1">total invoices</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upgradation Rev</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₹{fmt(totalUpgradationRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalUpgradations} upsell item{totalUpgradations !== 1 ? "s" : ""}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Performer</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          {topStaff ? (
            <>
              <p className="text-lg font-extrabold text-foreground">{topStaff.staffName}</p>
              <p className="text-xs text-muted-foreground mt-1">₹{fmt(topStaff.totalRevenue)} · {topStaff.totalBills} bills</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No data yet</p>
          )}
        </div>
      </div>

      {/* ── Staff Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Loading staff performance…
        </div>
      ) : report.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center">
          <BarChart2 className="w-10 h-10 text-muted-foreground/30" />
          <p className="font-semibold text-foreground">No staff performance data yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create bills in POS with staff assigned to services. Data appears here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Staff Performance — {report.length} member{report.length !== 1 ? "s" : ""}
          </p>

          {report.map((staff, idx) => {
            const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
            const initials = staff.staffName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
            const rank = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
            const revenuePercent = maxRevenue > 0 ? Math.round((staff.totalRevenue / maxRevenue) * 100) : 0;

            return (
              <div key={staff.staffId || staff.staffName}
                className="bg-card border border-border rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => goToDetail(staff)}>

                <div className="flex items-start gap-4">
                  {/* Rank + Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-base shadow-md`}>
                      {initials}
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 text-sm leading-none">{rank}</div>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-foreground">{staff.staffName}</h3>
                      {idx === 0 && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      {staff.staffRole && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-semibold">
                          {staff.staffRole}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {staff.staffPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {staff.staffPhone}
                        </span>
                      )}
                      {staff.staffRole && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {staff.staffRole}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View Details CTA */}
                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border group-hover:border-violet-400 group-hover:bg-violet-50 dark:group-hover:bg-violet-950/20 text-xs font-semibold text-muted-foreground group-hover:text-violet-600 transition-all">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* 4 Metric Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Service Rev</p>
                    <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">₹{fmt(staff.totalRevenue)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Bills Served</p>
                    <p className="text-base font-extrabold text-blue-700 dark:text-blue-300">{staff.totalBills}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Upgradation Rev</p>
                    <p className="text-base font-extrabold text-amber-700 dark:text-amber-300">₹{fmt(staff.upgradationRevenue)}</p>
                  </div>
                  <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Upgradations</p>
                    <p className="text-base font-extrabold text-violet-700 dark:text-violet-300">
                      {staff.upgradationCount}
                      {staff.upgradationCount > 0 && <ArrowUpRight className="w-3 h-3 inline ml-0.5 mb-0.5" />}
                    </p>
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground">Service revenue vs. top performer</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{revenuePercent}%</p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                      style={{ width: `${revenuePercent}%` }} />
                  </div>
                </div>

                {/* Top Services chips */}
                {staff.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {staff.services.slice(0, 5).map((svc, i) => (
                      <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs">
                        {svc.type === "service"
                          ? <Scissors className="w-3 h-3 text-muted-foreground" />
                          : <Package className="w-3 h-3 text-muted-foreground" />}
                        <span className="font-medium text-foreground truncate max-w-[110px]">{svc.name}</span>
                        <span className="text-muted-foreground">×{svc.count}</span>
                      </div>
                    ))}
                    {staff.services.length > 5 && (
                      <span className="px-2.5 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground">
                        +{staff.services.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
