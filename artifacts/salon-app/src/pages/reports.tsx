import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Receipt, Scissors,
  CreditCard, UserCheck, Download, ChevronLeft, ChevronRight,
  Wallet, IndianRupee, Calendar, Package, BarChart2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, subDays } from "date-fns";

const API_BASE = "/api";
const PALETTE = ["#7c3aed", "#db2777", "#ea580c", "#059669", "#2563eb", "#d97706", "#0891b2", "#be185d"];
const PAY_COLORS: Record<string, string> = { cash: "#059669", upi: "#7c3aed", card: "#2563eb", wallet: "#ea580c" };

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtRs(n: number) { return `₹${fmt(n)}`; }

type Preset = { label: string; from: Date; to: Date };

function getPresets(): Preset[] {
  const now = new Date();
  return [
    { label: "This Month",   from: startOfMonth(now),        to: endOfMonth(now) },
    { label: "Last Month",   from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    { label: "Last 3 Months",from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) },
    { label: "Last 6 Months",from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) },
    { label: "This Year",    from: startOfYear(now),          to: now },
    { label: "Last 30 Days", from: subDays(now, 29),          to: now },
  ];
}

// ── Month navigator (for single-month mode) ────────────────
function MonthPicker({ selected, onChange }: { selected: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shadow-sm">
      <button onClick={() => onChange(subMonths(selected, 1))}
        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-semibold text-gray-800 w-28 text-center select-none">
        {format(selected, "MMMM yyyy")}
      </span>
      <button onClick={() => onChange(addMonths(selected, 1))}
        disabled={addMonths(selected, 1) > new Date()}
        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Chart tooltip ──────────────────────────────────────────
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" && !["Bills", "Count"].includes(p.name) ? fmtRs(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string; sub?: string; icon: any; accent: string; trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────
function Card({ title, icon: Icon, children, className = "" }: { title: string; icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-violet-500" />}
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Reports() {
  const presets = getPresets();
  const [activePreset, setActivePreset] = useState(0);
  const [monthMode, setMonthMode] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const dateRange = monthMode
    ? { from: startOfMonth(selectedMonth), to: endOfMonth(selectedMonth) }
    : { from: presets[activePreset].from, to: presets[activePreset].to };

  const periodLabel = monthMode
    ? format(selectedMonth, "MMMM yyyy")
    : presets[activePreset].label;

  useEffect(() => {
    setLoading(true);
    const { from, to } = dateRange;
    fetch(`${API_BASE}/reports/analytics?from=${format(from, "yyyy-MM-dd")}&to=${format(to, "yyyy-MM-dd")}`)
      .then(r => r.json())
      .then(d => { setAnalytics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMonth, activePreset, monthMode]);

  const s       = analytics?.summary || {};
  const svcs    = analytics?.topServices || [];
  const prods   = analytics?.topProducts || [];
  const staff   = analytics?.staffPerformance || [];
  const payMix  = analytics?.paymentMix || [];
  const daily   = analytics?.dailyRevenue || [];
  const catShare = analytics?.categoryShare || [];
  const ci      = analytics?.customerInsights || {};
  const expBrk  = analytics?.expenseBreakdown || [];

  // ── Download PDF Report ────────────────────────────────────
  function downloadReport() {
    const { from, to } = dateRange;
    const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a");
    const fromStr = format(from, "dd MMM yyyy");
    const toStr = format(to, "dd MMM yyyy");

    const marginPct = (s.totalRevenue || 0) > 0
      ? Math.round(((s.netProfit || 0) / s.totalRevenue) * 100)
      : 0;

    const payTotal = payMix.reduce((sum: number, p: any) => sum + p.amount, 0);

    const style = `
      <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 11px; background: #fff; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #7c3aed; margin-bottom: 16px; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .logo-circle { width: 52px; height: 52px; border-radius: 50%; overflow: hidden; border: 2px solid #ede9fe; flex-shrink: 0; }
        .logo-circle img { width: 100%; height: 100%; object-fit: cover; }
        .salon-name { font-size: 20px; font-weight: 800; color: #4c1d95; letter-spacing: -0.5px; }
        .salon-sub { font-size: 10px; color: #7c3aed; font-weight: 600; margin-top: 1px; }
        .report-title { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .meta-right { text-align: right; }
        .meta-right .period { font-size: 13px; font-weight: 700; color: #1f2937; }
        .meta-right .generated { font-size: 9.5px; color: #9ca3af; margin-top: 3px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 18px; }
        .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; }
        .kpi-val { font-size: 18px; font-weight: 800; color: #111827; }
        .kpi-lbl { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin-top: 4px; }
        .kpi-sub { font-size: 9px; color: #9ca3af; margin-top: 2px; }
        .kpi.profit { border-color: #bbf7d0; background: #f0fdf4; }
        .kpi.profit .kpi-val { color: #15803d; }
        .kpi.expense { border-color: #fed7aa; background: #fff7ed; }
        .kpi.expense .kpi-val { color: #c2410c; }

        h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7c3aed; margin: 16px 0 8px; padding-bottom: 5px; border-bottom: 1.5px solid #ede9fe; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f5f3ff; }
        th { text-align: left; padding: 5px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7c3aed; border-bottom: 1px solid #ede9fe; }
        td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; color: #374151; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .muted { color: #9ca3af; }
        .rank { color: #7c3aed; font-weight: 700; font-size: 9px; }
        .bar-wrap { background: #f3f4f6; border-radius: 4px; height: 4px; overflow: hidden; }
        .bar { height: 4px; border-radius: 4px; background: #7c3aed; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 700; }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-violet { background: #ede9fe; color: #6d28d9; }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-orange { background: #fed7aa; color: #c2410c; }
        .profit-row td { color: #15803d; font-weight: 700; background: #f0fdf4; }
        .summary-table td:first-child { color: #374151; }
        .summary-table td:last-child { text-align: right; font-weight: 700; }

        footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
      </style>
    `;

    const kpiHtml = [
      { val: fmtRs(s.totalRevenue || 0), lbl: "Total Revenue", sub: `${s.totalBills || 0} bills`, cls: "" },
      { val: fmtRs(s.avgTicket || 0), lbl: "Avg Ticket Size", sub: "per bill", cls: "" },
      { val: String(s.periodCustCount || 0), lbl: "Customers Visited", sub: "unique clients this period", cls: "" },
      { val: String(s.newCustomers || 0), lbl: "New Customers Added", sub: `♂ ${s.newCustomersMale || 0} Male  ♀ ${s.newCustomersFemale || 0} Female`, cls: "" },
      { val: `${fmtRs(s.servicesRevenue || 0)} / ${fmtRs(s.productsRevenue || 0)}`, lbl: "Services / Products Revenue", sub: "services · products", cls: "" },
    ].map(k => `<div class="kpi ${k.cls}"><div class="kpi-val">${k.val}</div><div class="kpi-lbl">${k.lbl}</div>${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ""}</div>`).join("");

    const svcRows = svcs.length
      ? svcs.map((sv: any, i: number) => {
          const maxRev = svcs[0]?.revenue || 1;
          const pct = Math.round((sv.revenue / maxRev) * 100);
          return `<tr>
            <td><span class="rank">${i + 1}</span></td>
            <td class="bold">${sv.name}</td>
            <td class="right">${sv.count}</td>
            <td class="right">${fmtRs(sv.avgTicket)}</td>
            <td class="right bold">${fmtRs(sv.revenue)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="muted">No service data for this period</td></tr>`;

    const staffRows = staff.length
      ? staff.map((st: any, i: number) => `<tr>
          <td><span class="rank">${i + 1}</span></td>
          <td class="bold">${st.name}</td>
          <td class="right">${st.services}</td>
          <td class="right bold">${fmtRs(st.revenue)}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">No staff data — assign staff while billing</td></tr>`;

    const payRows = payMix.length
      ? payMix.map((p: any) => {
          const pct = payTotal > 0 ? Math.round((p.amount / payTotal) * 100) : 0;
          const cls = p.method === "cash" ? "badge-green" : p.method === "upi" ? "badge-violet" : p.method === "card" ? "badge-blue" : "badge-orange";
          return `<tr>
            <td><span class="badge ${cls}">${p.method.toUpperCase()}</span></td>
            <td class="right">${p.count}</td>
            <td class="right bold">${fmtRs(p.amount)}</td>
            <td class="right">${pct}%</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="4" class="muted">No payment data</td></tr>`;

    const catRows = catShare.length
      ? catShare.map((c: any) => {
          const pct = Math.round((c.revenue / (catShare[0]?.revenue || 1)) * 100);
          return `<tr>
            <td class="bold">${c.name}</td>
            <td class="right">${c.pct}%</td>
            <td class="right bold">${fmtRs(c.revenue)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="3" class="muted">No data</td></tr>`;

    const prodRows = prods.length
      ? prods.map((p: any, i: number) => `<tr>
          <td><span class="rank">${i + 1}</span></td>
          <td class="bold">${p.name}</td>
          <td class="right">${p.count} units</td>
          <td class="right bold">${fmtRs(p.revenue)}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">No product sales in this period</td></tr>`;

    const expRows = expBrk.length
      ? expBrk.map((e: any) => `<tr><td>${e.category}</td><td class="right bold">${fmtRs(e.amount)}</td></tr>`).join("") +
        `<tr class="profit-row"><td>Net Profit</td><td class="right">${fmtRs(s.netProfit || 0)}</td></tr>`
      : `<tr><td colspan="2" class="muted">No expenses recorded in this period</td></tr>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Salon Report — ${periodLabel}</title>${style}</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo-circle">
        <img src="${window.location.origin}/thetouch-logo.jpg" alt="Logo" crossorigin="anonymous" />
      </div>
      <div>
        <div class="salon-name">AT SMART SALON</div>
        <div class="salon-sub">The Touch Unisex Salon</div>
        <div class="report-title">Business Performance Report</div>
      </div>
    </div>
    <div class="meta-right">
      <div class="period">${periodLabel}</div>
      <div class="period" style="font-size:10px;color:#6b7280;font-weight:500">${fromStr} – ${toStr}</div>
      <div class="generated">Generated: ${generatedAt}</div>
    </div>
  </div>

  <div class="kpi-grid">${kpiHtml}</div>

  <h2>Service Performance — All Services</h2>
  <table>
    <thead><tr><th>#</th><th>Service</th><th class="right">Count</th><th class="right">Avg Ticket</th><th class="right">Revenue</th></tr></thead>
    <tbody>${svcRows}</tbody>
  </table>

  <div class="two-col">
    <div>
      <h2>Staff Performance</h2>
      <table>
        <thead><tr><th>#</th><th>Staff</th><th class="right">Services</th><th class="right">Revenue</th></tr></thead>
        <tbody>${staffRows}</tbody>
      </table>
    </div>
    <div>
      <h2>Payment Method Breakdown</h2>
      <table>
        <thead><tr><th>Method</th><th class="right">Txns</th><th class="right">Amount</th><th class="right">Share</th></tr></thead>
        <tbody>${payRows}</tbody>
      </table>

      <h2>Revenue by Category</h2>
      <table>
        <thead><tr><th>Category</th><th class="right">Share</th><th class="right">Revenue</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>
  </div>

  <div class="two-col">
    <div>
      <h2>Revenue vs Expenses</h2>
      <table class="summary-table">
        <tbody>
          <tr><td>Total Revenue</td><td class="right bold">${fmtRs(s.totalRevenue || 0)}</td></tr>
          ${expRows}
        </tbody>
      </table>
    </div>
    <div>
      <h2>Product Sales</h2>
      <table>
        <thead><tr><th>#</th><th>Product</th><th class="right">Units</th><th class="right">Revenue</th></tr></thead>
        <tbody>${prodRows}</tbody>
      </table>
    </div>
  </div>

  <h2>Customer Metrics</h2>
  <table class="summary-table">
    <tbody>
      <tr><td>Clients Visited This Period</td><td class="right">${s.periodCustCount || 0}</td></tr>
      <tr><td>Total Clients (All Time)</td><td class="right">${ci.totalCustomers || 0}</td></tr>
      <tr><td>Repeat Clients</td><td class="right">${ci.repeatCustomers || 0}</td></tr>
      <tr><td>Retention Rate</td><td class="right">${ci.retentionRate || 0}%</td></tr>
      <tr><td>Average Ticket Size</td><td class="right">${fmtRs(s.avgTicket || 0)}</td></tr>
    </tbody>
  </table>

  <footer>
    <span>AT Salon — Confidential Business Report</span>
    <span>${periodLabel} &nbsp;|&nbsp; ${fromStr} – ${toStr}</span>
  </footer>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-violet-600" />
              Business Reports
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Analytics &amp; performance overview · <span className="font-medium text-violet-600">{periodLabel}</span></p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={downloadReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMonthMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${monthMode ? "bg-violet-50 border-violet-300 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <Calendar className="w-3.5 h-3.5" /> Month View
          </button>

          {monthMode && (
            <MonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
          )}

          {!monthMode || true ? (
            <div className="flex items-center gap-1.5">
              {!monthMode && <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Quick filters:</span>}
              {presets.map((p, i) => (
                <button key={p.label}
                  onClick={() => { setMonthMode(false); setActivePreset(i); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${!monthMode && activePreset === i ? "bg-violet-50 border-violet-300 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading analytics…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard label="Total Revenue" value={fmtRs(s.totalRevenue || 0)}
                sub={`${s.totalBills || 0} bills`}
                icon={IndianRupee} accent="bg-violet-100 text-violet-700" trend={s.revGrowth} />
              <KPICard label="Avg Ticket Size" value={fmtRs(s.avgTicket || 0)}
                sub="per bill"
                icon={Receipt} accent="bg-blue-100 text-blue-700" />
              <KPICard label="Customers Visited" value={String(s.periodCustCount || 0)}
                sub="unique clients this period"
                icon={UserCheck} accent="bg-amber-100 text-amber-700" />
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{s.newCustomers || 0}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1.5">New Customers Added</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-blue-600 font-semibold">♂ {s.newCustomersMale || 0} Male</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[11px] text-pink-500 font-semibold">♀ {s.newCustomersFemale || 0} Female</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-100 text-pink-700">
                    <Scissors className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-lg font-bold text-gray-900 leading-none tracking-tight">{fmtRs(s.servicesRevenue || 0)}</p>
                    <span className="text-xs text-gray-400">/</span>
                    <p className="text-lg font-bold text-gray-900 leading-none tracking-tight">{fmtRs(s.productsRevenue || 0)}</p>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mt-1.5">Services / Products Revenue</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">services · products split</p>
                </div>
              </div>
            </div>

            {/* ── Revenue Trend Chart ── */}
            <Card title="Revenue Trend" icon={TrendingUp}>
              {daily.length === 0 || daily.every((d: any) => d.revenue === 0) ? (
                <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                  No revenue data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickFormatter={v => v === 0 ? "₹0" : `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2}
                      fill="url(#rg)" dot={false} activeDot={{ r: 4, fill: "#7c3aed" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* ── Services + Category ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Service Table */}
              <Card title="Service Performance" icon={Scissors} className="lg:col-span-2">
                {svcs.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No service data</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <th className="pb-2 font-semibold w-6">#</th>
                        <th className="pb-2 font-semibold">Service</th>
                        <th className="pb-2 font-semibold text-right">Qty</th>
                        <th className="pb-2 font-semibold text-right">Avg</th>
                        <th className="pb-2 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {svcs.map((sv: any, i: number) => {
                        const maxRev = svcs[0]?.revenue || 1;
                        const pct = Math.round((sv.revenue / maxRev) * 100);
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                            <td className="py-2.5 text-[10px] font-bold text-violet-500">{i + 1}</td>
                            <td className="py-2.5">
                              <div className="font-semibold text-gray-800 truncate max-w-[200px]">{sv.name}</div>
                              <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-full">
                                <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-gray-500">{sv.count}</td>
                            <td className="py-2.5 text-right text-gray-400">{fmtRs(sv.avgTicket)}</td>
                            <td className="py-2.5 text-right font-bold text-gray-900">{fmtRs(sv.revenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* Category Donut */}
              <Card title="Revenue by Category" icon={BarChart2}>
                {catShare.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={catShare} innerRadius={40} outerRadius={62} dataKey="revenue" paddingAngle={2} startAngle={90} endAngle={-270}>
                          {catShare.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [fmtRs(Number(v))]}
                          contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid #e5e7eb" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {catShare.map((c: any, i: number) => (
                        <div key={c.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                          <span className="flex-1 text-gray-600 truncate font-medium">{c.name}</span>
                          <span className="text-gray-400 text-[10px]">{c.pct}%</span>
                          <span className="font-bold text-gray-800">{fmtRs(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* ── Staff + Payment ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Staff Performance */}
              <Card title="Staff Performance" icon={UserCheck}>
                {staff.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400">Assign staff to bills to see performance</div>
                ) : (
                  <div className="space-y-4">
                    {staff.map((st: any, i: number) => {
                      const maxRev = staff[0]?.revenue || 1;
                      const pct = Math.round((st.revenue / maxRev) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ background: PALETTE[i % PALETTE.length] }}>
                            {st.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-800">{st.name}</span>
                              <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">{fmtRs(st.revenue)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                              <span>{st.services} service{st.services !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Payment Mix */}
              <Card title="Payment Breakdown" icon={CreditCard}>
                {payMix.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400">No payment data</div>
                ) : (() => {
                  const total = payMix.reduce((s: number, p: any) => s + p.amount, 0);
                  return (
                    <div className="space-y-3.5">
                      {payMix.map((p: any) => {
                        const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
                        const col = PAY_COLORS[p.method] || "#94a3b8";
                        return (
                          <div key={p.method}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                                <span className="text-xs font-semibold capitalize text-gray-700">{p.method}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-400">{p.count} txns</span>
                                <span className="text-xs font-bold text-gray-900">{fmtRs(p.amount)}</span>
                                <span className="text-[10px] font-semibold text-gray-400 w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Card>
            </div>

            {/* ── Products + Expenses + Customers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Product Sales */}
              <Card title="Product Sales" icon={Package}>
                {prods.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-gray-400 text-sm">No product sales</div>
                ) : (
                  <div className="space-y-3">
                    {prods.slice(0, 6).map((p: any, i: number) => {
                      const maxR = prods[0]?.revenue || 1;
                      const pct = Math.round((p.revenue / maxR) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-gray-800 truncate flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-violet-500">{i + 1}</span>
                              {p.name}
                            </span>
                            <span className="text-gray-400 shrink-0 ml-2">{p.count} sold</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                          </div>
                          <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{fmtRs(p.revenue)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Revenue vs Expenses */}
              <Card title="Revenue vs Expenses" icon={TrendingUp}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">Total Revenue</span>
                    <span className="text-sm font-bold text-gray-900">{fmtRs(s.totalRevenue || 0)}</span>
                  </div>
                  {expBrk.map((e: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-gray-500">{e.category}</span>
                      <span className="text-xs font-semibold text-red-500">− {fmtRs(e.amount)}</span>
                    </div>
                  ))}
                  {expBrk.length === 0 && (
                    <p className="text-[11px] text-gray-400 py-1">No expenses in this period</p>
                  )}
                  <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-1">
                    <span className="text-xs font-bold text-gray-700">Net Profit</span>
                    <span className={`text-base font-bold ${(s.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {fmtRs(s.netProfit || 0)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Customer Metrics */}
              <Card title="Customer Metrics" icon={Users}>
                <div className="space-y-2.5">
                  {[
                    { label: "Clients Visited", value: s.periodCustCount || 0, accent: "bg-violet-50 text-violet-700 border-violet-100" },
                    { label: "Total Clients (All Time)", value: ci.totalCustomers || 0, accent: "bg-blue-50 text-blue-700 border-blue-100" },
                    { label: "Repeat Clients", value: ci.repeatCustomers || 0, accent: "bg-pink-50 text-pink-700 border-pink-100" },
                    { label: "Retention Rate", value: `${ci.retentionRate || 0}%`, accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                  ].map(m => (
                    <div key={m.label} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${m.accent}`}>
                      <span className="text-xs font-medium">{m.label}</span>
                      <span className="text-lg font-bold">{m.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
