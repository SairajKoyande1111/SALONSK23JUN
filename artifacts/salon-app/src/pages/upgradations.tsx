import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Trophy, Star, Calendar, ChevronDown, ChevronUp, IndianRupee, Package, Scissors, ArrowUpRight } from "lucide-react";

const API_BASE = "/api";

interface UpgradationItem {
  name: string;
  type: string;
  price: number;
  total: number;
  billNumber: string;
  customerName: string;
  date: string;
}

interface StaffReport {
  staffId: string | null;
  staffName: string;
  totalCount: number;
  totalRevenue: number;
  items: UpgradationItem[];
}

const AVATAR_COLORS = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-indigo-600",
];

export default function Upgradations() {
  const [report, setReport] = useState<StaffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/upgradation-report${q}`);
      const data = await res.json();
      setReport(data.report || []);
    } catch {
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const totalCount = useMemo(() => report.reduce((a, r) => a + r.totalCount, 0), [report]);
  const totalRevenue = useMemo(() => report.reduce((a, r) => a + r.totalRevenue, 0), [report]);
  const topStaff = report[0];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Upgradation Tracker
              </h1>
              <p className="text-sm text-muted-foreground">Staff upsell performance — services &amp; products added during visits</p>
            </div>
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
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
            Apply
          </button>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); setTimeout(fetchReport, 0); }}
              className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Upgradations</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-extrabold text-foreground">{totalCount}</p>
            <ArrowUpRight className="w-5 h-5 text-amber-500 mb-1" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">upsell items across all bills</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upgradation Revenue</p>
          <div className="flex items-end gap-1">
            <IndianRupee className="w-5 h-5 text-emerald-500 mb-1" />
            <p className="text-3xl font-extrabold text-foreground">{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">additional revenue from upsells</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Performer</p>
          {topStaff ? (
            <>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {topStaff.staffName.substring(0, 1)}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{topStaff.staffName}</p>
                  <p className="text-xs text-muted-foreground">{topStaff.totalCount} upgradations · ₹{topStaff.totalRevenue.toLocaleString("en-IN")}</p>
                </div>
                <Trophy className="w-4 h-4 text-amber-400 ml-auto" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No data yet</p>
          )}
        </div>
      </div>

      {/* What is Upgradation — info banner */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
        <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">What is Upgradation?</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
            When a customer visits for one service (e.g. Haircut) and the assigned staff convinces them to take
            additional services or buy products, those extra items are marked as <strong>Upgradations</strong>.
            Use the <strong>↑ button</strong> in the POS cart to tag any item as an upgradation. This report tracks
            which staff members are best at upselling.
          </p>
        </div>
      </div>

      {/* Staff leaderboard */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading upgradation data…</div>
      ) : report.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No upgradations recorded yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            In POS, add services or products to a bill then tap the <strong>↑</strong> (TrendingUp) button on any cart item to mark it as an upgradation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Staff Performance</h2>
          {report.map((staff, idx) => {
            const isExpanded = expanded === (staff.staffId || staff.staffName);
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const initials = staff.staffName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
            const rankBadge = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

            return (
              <div key={staff.staffId || staff.staffName}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-all">
                {/* Staff header row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => setExpanded(isExpanded ? null : (staff.staffId || staff.staffName))}>
                  {/* Rank */}
                  <div className="w-6 text-center">
                    {rankBadge ? (
                      <span className="text-lg">{rankBadge}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {initials}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{staff.staffName}</p>
                      {idx === 0 && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{staff.totalCount} upgradation{staff.totalCount !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Revenue */}
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-base text-foreground">₹{staff.totalRevenue.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">upsell revenue</p>
                  </div>

                  {/* Expand toggle */}
                  <div className="shrink-0 ml-2 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Revenue bar */}
                <div className="px-5 pb-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${totalRevenue > 0 ? Math.round((staff.totalRevenue / totalRevenue) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {totalRevenue > 0 ? Math.round((staff.totalRevenue / totalRevenue) * 100) : 0}% of total upgradation revenue
                  </p>
                </div>

                {/* Expanded item list */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-4 pt-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Upgradation History</p>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {staff.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-muted/50">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                            {item.type === "service" ? (
                              <Scissors className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.customerName} · {item.billNumber} · {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-foreground">₹{Number(item.total).toLocaleString("en-IN")}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
