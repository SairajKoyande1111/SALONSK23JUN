import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Calendar, Scissors, Package, FileText,
  Phone, Briefcase, TrendingUp, Receipt, IndianRupee,
  ArrowUpRight, Eye, AlertTriangle, Star,
} from "lucide-react";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-indigo-700",
  "from-emerald-500 to-green-700",
];

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ServiceBreakdown {
  name: string; type: string; count: number; revenue: number;
}
interface BillItem {
  name: string; type: string; total: number; isUpgradation: boolean;
}
interface StaffBill {
  billId: string; billNumber: string; customerName: string; customerPhone: string;
  date: string; billGrandTotal: number; paymentMethod: string; status: string; items: BillItem[];
}
interface StaffData {
  staffId: string | null; staffName: string; staffRole: string; staffPhone: string;
  totalBills: number; totalRevenue: number; upgradationRevenue: number; upgradationCount: number;
  services: ServiceBreakdown[]; bills: StaffBill[];
}

const PAY_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  upi: "bg-violet-100 text-violet-700",
  online: "bg-sky-100 text-sky-700",
};

export default function StaffDetail() {
  const params = useParams<{ staffId: string }>();
  const staffId = params.staffId || "unassigned";
  const [, setLocation] = useLocation();

  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"services" | "invoices">("services");
  const [viewBill, setViewBill] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ staffId });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`${API_BASE}/staff-report?${params.toString()}`);
      const json = await res.json();
      const report: StaffData[] = json.report || [];
      if (report.length === 0) {
        setError("No data found for this staff member.");
        setData(null);
      } else {
        setData(report[0]);
      }
    } catch {
      setError("Failed to load staff data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [staffId]);

  const handleViewInvoice = async (bill: StaffBill) => {
    if (!bill.billId) return;
    setLoadingBill(true);
    try {
      const res = await fetch(`${API_BASE}/bills/${bill.billId}`);
      if (!res.ok) throw new Error("Not found");
      const fullBill = await res.json();
      setViewBill(fullBill);
    } catch {
      // fallback: build a minimal bill object from the staff-report data
      setViewBill({
        _id: bill.billId,
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        createdAt: bill.date,
        finalAmount: bill.billGrandTotal,
        paymentMethod: bill.paymentMethod,
        status: bill.status,
        items: bill.items.map(i => ({ name: i.name, type: i.type, total: i.total, quantity: 1, price: i.total })),
        subtotal: bill.billGrandTotal,
        taxAmount: 0,
        discountAmount: 0,
      });
    } finally {
      setLoadingBill(false);
    }
  };

  const gradient = data
    ? AVATAR_GRADIENTS[Math.abs(data.staffName.charCodeAt(0)) % AVATAR_GRADIENTS.length]
    : AVATAR_GRADIENTS[0];
  const initials = data
    ? data.staffName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/upgradations")}
          className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">Staff Reports</p>
          <h1 className="text-xl font-extrabold text-foreground leading-tight">
            {loading ? "Loading…" : data?.staffName || "Staff Detail"}
          </h1>
        </div>
      </div>

      {/* ── Date filter ── */}
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
        <button onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors">
          Apply
        </button>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); setTimeout(fetchData, 50); }}
            className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Loading staff data…
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-2xl p-16 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="font-semibold text-foreground">{error}</p>
        </div>
      ) : data && (
        <>
          {/* ── Staff Profile Card ── */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-foreground">{data.staffName}</h2>
                  {data.staffName !== "Unassigned" && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                  {data.staffRole && (
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                      {data.staffRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  {data.staffPhone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {data.staffPhone}
                    </span>
                  )}
                  {data.staffRole && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> {data.staffRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Metric Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <IndianRupee className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Service Revenue</p>
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">₹{fmt(data.totalRevenue)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Bills Served</p>
                <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{data.totalBills}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Upgradation Rev</p>
                <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">₹{fmt(data.upgradationRevenue)}</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <ArrowUpRight className="w-4 h-4 text-violet-500" />
                </div>
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Upgradations Done</p>
                <p className="text-2xl font-extrabold text-violet-700 dark:text-violet-300">{data.upgradationCount}</p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("services")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "services"
                    ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/50 dark:bg-violet-950/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}>
                <Scissors className="w-3.5 h-3.5" />
                Services Breakdown ({data.services.length})
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "invoices"
                    ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/50 dark:bg-violet-950/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}>
                <FileText className="w-3.5 h-3.5" />
                Invoice History ({data.bills.length})
              </button>
            </div>

            {/* ── Services Tab ── */}
            {activeTab === "services" && (
              <div className="p-6">
                {data.services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No services data available.</div>
                ) : (
                  <div className="space-y-3">
                    {data.services.map((svc, i) => {
                      const maxCount = data.services[0]?.count || 1;
                      const pct = Math.round((svc.count / maxCount) * 100);
                      return (
                        <div key={i} className="flex items-center gap-4 py-3.5 px-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                            {svc.type === "service"
                              ? <Scissors className="w-4 h-4 text-violet-500" />
                              : <Package className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold text-foreground">₹{fmt(svc.revenue)}</p>
                            <p className="text-[10px] text-muted-foreground">{svc.count} time{svc.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Invoices Tab ── */}
            {activeTab === "invoices" && (
              <div className="p-6">
                {data.bills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No invoices found.</div>
                ) : (
                  <div className="space-y-3">
                    {data.bills.map((bill, i) => {
                      const hasUpgradation = bill.items.some(it => it.isUpgradation);
                      return (
                        <div key={i} className="border border-border rounded-xl overflow-hidden">
                          {/* Bill header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-foreground font-mono">{bill.billNumber}</p>
                                  {hasUpgradation && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-bold flex items-center gap-0.5">
                                      <ArrowUpRight className="w-2.5 h-2.5" /> Upgradation
                                    </span>
                                  )}
                                  {bill.paymentMethod && (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize ${PAY_COLORS[bill.paymentMethod] || "bg-muted text-muted-foreground"}`}>
                                      {bill.paymentMethod.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {bill.customerName} · {fmtDate(bill.date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-extrabold text-foreground">₹{fmt(bill.billGrandTotal)}</p>
                                <p className="text-[10px] text-muted-foreground">bill total</p>
                              </div>
                              <button
                                onClick={() => handleViewInvoice(bill)}
                                disabled={loadingBill}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors text-[11px] font-semibold disabled:opacity-50">
                                <Eye className="w-3.5 h-3.5" />
                                {loadingBill ? "…" : "View Invoice"}
                              </button>
                            </div>
                          </div>

                          {/* Bill items */}
                          <div className="divide-y divide-border/50">
                            {bill.items.map((item, j) => (
                              <div key={j} className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {item.type === "service"
                                    ? <Scissors className="w-3 h-3 text-violet-400 shrink-0" />
                                    : <Package className="w-3 h-3 text-blue-400 shrink-0" />}
                                  <span className="text-xs text-foreground">{item.name}</span>
                                  {item.isUpgradation && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[9px] font-semibold">↑</span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-foreground">₹{fmt(item.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Invoice Modal */}
      {viewBill && <InvoiceModal bill={viewBill} onClose={() => setViewBill(null)} />}
    </div>
  );
}
