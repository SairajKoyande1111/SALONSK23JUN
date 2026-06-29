import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Receipt, Scissors, Package,
  CreditCard, BarChart3, UserCheck, Repeat, Download, ChevronLeft,
  ChevronRight, Wallet, IndianRupee,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

const API_BASE = "/api";
const PALETTE = ["#7c3aed", "#db2777", "#ea580c", "#059669", "#2563eb", "#d97706", "#0891b2", "#be185d"];
const PAY_COLORS: Record<string, string> = { cash: "#059669", upi: "#7c3aed", card: "#2563eb", wallet: "#ea580c" };

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtRs(n: number) { return `₹${fmt(n)}`; }

// ── Compact KPI card ──────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.bg}`}>
          <Icon className={`w-4 h-4 ${color.icon}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHead({ title, border = true }: { title: string; border?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${border ? "pb-2 border-b border-gray-100" : ""}`}>
      <div className="w-0.5 h-4 rounded-full bg-violet-600" />
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" && !["Bills", "Count", "Services"].includes(p.name)
            ? fmtRs(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Month picker ──────────────────────────────────────────────────────────────
function MonthPicker({ selected, onChange }: { selected: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
      <button onClick={() => onChange(subMonths(selected, 1))}
        className="p-1 rounded hover:bg-white transition-colors text-gray-500 hover:text-gray-900">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-semibold text-gray-700 w-24 text-center select-none">
        {format(selected, "MMMM yyyy")}
      </span>
      <button onClick={() => onChange(addMonths(selected, 1))}
        disabled={addMonths(selected, 1) > new Date()}
        className="p-1 rounded hover:bg-white transition-colors text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const from = startOfMonth(selectedMonth);
  const to = endOfMonth(selectedMonth);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/reports/analytics?from=${format(from, "yyyy-MM-dd")}&to=${format(to, "yyyy-MM-dd")}`)
      .then(r => r.json())
      .then(d => { setAnalytics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMonth]);

  const s       = analytics?.summary || {};
  const svcs    = analytics?.topServices || [];
  const prods   = analytics?.topProducts || [];
  const staff   = analytics?.staffPerformance || [];
  const payMix  = analytics?.paymentMix || [];
  const daily   = analytics?.dailyRevenue || [];
  const catShare = analytics?.categoryShare || [];
  const ci      = analytics?.customerInsights || {};
  const expBrk  = analytics?.expenseBreakdown || [];

  const periodLabel = format(selectedMonth, "MMMM yyyy");

  function downloadReport() {
    const style = `
      <style>
        @page { size: A4; margin: 18mm 15mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; }
        h1 { font-size: 20px; margin: 0 0 2px; color: #1e1e2e; }
        h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6d28d9; margin: 18px 0 8px; border-bottom: 1.5px solid #ede9fe; padding-bottom: 4px; }
        .meta { font-size: 10px; color: #6b7280; margin-bottom: 18px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 18px; }
        .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
        .kpi .val { font-size: 16px; font-weight: 700; color: #111; }
        .kpi .lbl { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        .kpi .sub { font-size: 9px; color: #9ca3af; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        th { background: #f5f3ff; text-align: left; padding: 5px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6d28d9; border-bottom: 1px solid #ede9fe; }
        td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10.5px; color: #374151; }
        tr:last-child td { border-bottom: none; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .muted { color: #9ca3af; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .profit-row { background: #f0fdf4; }
        .profit-row td { color: #15803d; font-weight: 700; }
        .top-row td { font-weight: 600; }
        .bar-wrap { background: #f3f4f6; border-radius: 4px; height: 6px; overflow: hidden; margin-top: 2px; }
        .bar { height: 6px; border-radius: 4px; background: #7c3aed; }
        footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
      </style>
    `;

    const kpis = [
      { val: fmtRs(s.totalRevenue || 0), lbl: "Total Revenue", sub: `${s.totalBills || 0} bills` },
      { val: fmtRs(s.avgTicket || 0), lbl: "Avg Ticket", sub: "per bill" },
      { val: fmtRs(s.totalExpenses || 0), lbl: "Total Expenses", sub: "" },
      { val: fmtRs(s.netProfit || 0), lbl: "Net Profit", sub: "" },
    ];

    const kpiHtml = kpis.map(k => `
      <div class="kpi">
        <div class="val">${k.val}</div>
        <div class="lbl">${k.lbl}</div>
        ${k.sub ? `<div class="sub">${k.sub}</div>` : ""}
      </div>
    `).join("");

    const svcRows = svcs.slice(0, 10).map((sv: any, i: number) => `
      <tr class="${i === 0 ? "top-row" : ""}">
        <td>${i + 1}. ${sv.name}</td>
        <td class="right">${sv.count}</td>
        <td class="right bold">${fmtRs(sv.revenue)}</td>
        <td class="right muted">${fmtRs(sv.avgTicket)}/visit</td>
      </tr>
    `).join("");

    const staffRows = staff.map((st: any, i: number) => `
      <tr class="${i === 0 ? "top-row" : ""}">
        <td>${i + 1}. ${st.name}</td>
        <td class="right">${st.services}</td>
        <td class="right bold">${fmtRs(st.revenue)}</td>
        <td class="right muted">${fmtRs(st.commission)} (${st.commissionPct}%)</td>
      </tr>
    `).join("");

    const payRows = payMix.map((p: any) => {
      const total = payMix.reduce((s: number, x: any) => s + x.amount, 0);
      const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
      return `<tr><td class="bold" style="text-transform:capitalize">${p.method}</td><td class="right">${p.count}</td><td class="right bold">${fmtRs(p.amount)}</td><td class="right">${pct}%</td></tr>`;
    }).join("");

    const prodRows = prods.length ? prods.map((p: any, i: number) => `
      <tr><td>${i + 1}. ${p.name}</td><td class="right">${p.count} units</td><td class="right bold">${fmtRs(p.revenue)}</td></tr>
    `).join("") : `<tr><td colspan="3" class="muted">No product sales in this period</td></tr>`;

    const expRows = expBrk.length ? expBrk.map((e: any) => `
      <tr><td>${e.category}</td><td class="right bold">${fmtRs(e.amount)}</td></tr>
    `).join("") + `<tr class="profit-row"><td class="bold">Net Profit</td><td class="right">${fmtRs(s.netProfit || 0)}</td></tr>`
      : `<tr><td colspan="2" class="muted">No expenses recorded</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salon Report — ${periodLabel}</title>${style}</head><body>
      <h1>AT Salon — Business Report</h1>
      <div class="meta">Period: ${periodLabel} &nbsp;|&nbsp; Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")} &nbsp;|&nbsp; Customers: ${s.periodCustCount || 0} visited · ${ci.totalCustomers || 0} total</div>

      <h2>Financial Overview</h2>
      <div class="kpi-grid">${kpiHtml}</div>

      <div class="two-col">
        <div>
          <h2>Service Performance</h2>
          <table><thead><tr><th>Service</th><th class="right">Qty</th><th class="right">Revenue</th><th class="right">Avg</th></tr></thead>
          <tbody>${svcRows || `<tr><td colspan="4" class="muted">No service data</td></tr>`}</tbody></table>
        </div>
        <div>
          <h2>Staff Performance</h2>
          <table><thead><tr><th>Staff</th><th class="right">Services</th><th class="right">Revenue</th><th class="right">Commission</th></tr></thead>
          <tbody>${staffRows || `<tr><td colspan="4" class="muted">No staff data</td></tr>`}</tbody></table>
        </div>
      </div>

      <div class="two-col">
        <div>
          <h2>Payment Methods</h2>
          <table><thead><tr><th>Method</th><th class="right">Count</th><th class="right">Amount</th><th class="right">Share</th></tr></thead>
          <tbody>${payRows || `<tr><td colspan="4" class="muted">No data</td></tr>`}</tbody></table>
        </div>
        <div>
          <h2>Product Sales</h2>
          <table><thead><tr><th>Product</th><th class="right">Sold</th><th class="right">Revenue</th></tr></thead>
          <tbody>${prodRows}</tbody></table>
        </div>
      </div>

      <div class="two-col">
        <div>
          <h2>Revenue vs Expenses</h2>
          <table><thead><tr><th>Category</th><th class="right">Amount</th></tr></thead>
          <tbody>
            <tr><td class="bold">Total Revenue</td><td class="right bold">${fmtRs(s.totalRevenue || 0)}</td></tr>
            ${expRows}
          </tbody></table>
        </div>
        <div>
          <h2>Customer Metrics</h2>
          <table>
            <tbody>
              <tr><td>Total Clients (all time)</td><td class="right bold">${ci.totalCustomers || 0}</td></tr>
              <tr><td>Visited This Period</td><td class="right bold">${s.periodCustCount || 0}</td></tr>
              <tr><td>Repeat Clients</td><td class="right bold">${ci.repeatCustomers || 0}</td></tr>
              <tr><td>Retention Rate</td><td class="right bold">${ci.retentionRate || 0}%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer>
        <span>AT Salon — Confidential</span>
        <span>Report for ${periodLabel}</span>
      </footer>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Business Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Detailed analytics for {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
          <button onClick={downloadReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
            <Download className="w-3.5 h-3.5" />
            Download Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Loading analytics…
        </div>
      ) : (
        <div ref={printRef} className="space-y-6">

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Total Revenue" value={fmtRs(s.totalRevenue || 0)} sub={`${s.totalBills || 0} bills · ${s.periodCustCount || 0} clients`}
              icon={IndianRupee} color={{ bg: "bg-violet-50", icon: "text-violet-600" }} trend={s.revGrowth} />
            <KPI label="Avg Ticket Size" value={fmtRs(s.avgTicket || 0)} sub="per bill"
              icon={Receipt} color={{ bg: "bg-blue-50", icon: "text-blue-600" }} />
            <KPI label="Total Expenses" value={fmtRs(s.totalExpenses || 0)} sub={`${expBrk.length} categories`}
              icon={Wallet} color={{ bg: "bg-orange-50", icon: "text-orange-600" }} />
            <KPI label="Net Profit" value={fmtRs(s.netProfit || 0)}
              sub={(s.totalRevenue || 0) > 0 ? `${Math.round(((s.netProfit || 0) / s.totalRevenue) * 100)}% margin` : ""}
              icon={TrendingUp} color={{ bg: "bg-emerald-50", icon: "text-emerald-600" }} />
          </div>

          {/* ── Revenue Trend Chart ── */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <SectionHead title="Daily Revenue Trend" />
            {daily.length === 0 || daily.every((d: any) => d.revenue === 0) ? (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
                No revenue recorded in {periodLabel}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v === 0 ? "₹0" : `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#rg)" dot={false} activeDot={{ r: 4, fill: "#7c3aed" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Services + Category ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Service Table */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Service Performance" />
              {svcs.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No service data</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-2 font-semibold">Service</th>
                      <th className="pb-2 font-semibold text-right">Qty</th>
                      <th className="pb-2 font-semibold text-right">Revenue</th>
                      <th className="pb-2 font-semibold text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svcs.slice(0, 8).map((sv: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="font-medium text-gray-800 truncate max-w-[180px]">{sv.name}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right text-gray-500">{sv.count}×</td>
                        <td className="py-2 text-right font-bold text-gray-900">{fmtRs(sv.revenue)}</td>
                        <td className="py-2 text-right text-gray-400">{fmtRs(sv.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Category Donut */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Revenue by Category" />
              {catShare.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={catShare} innerRadius={38} outerRadius={62} dataKey="revenue" paddingAngle={2} startAngle={90} endAngle={-270}>
                        {catShare.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmtRs(Number(v))]} contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid #e5e7eb" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {catShare.map((c: any, i: number) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="flex-1 text-gray-600 truncate">{c.name}</span>
                        <span className="text-gray-400 text-[10px]">{c.pct}%</span>
                        <span className="font-semibold text-gray-800">{fmtRs(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Staff + Payment ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Staff */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Staff Performance" />
              {staff.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No staff data — assign staff while billing</div>
              ) : (
                <div className="space-y-3">
                  {staff.map((st: any, i: number) => {
                    const maxRev = staff[0]?.revenue || 1;
                    const pct = Math.round((st.revenue / maxRev) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: PALETTE[i % PALETTE.length] }}>
                          {st.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs font-semibold text-gray-800 truncate">{st.name}</span>
                            <span className="text-xs font-bold text-gray-900 shrink-0 ml-2">{fmtRs(st.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>{st.services} service{st.services !== 1 ? "s" : ""}</span>
                            <span>Commission: {fmtRs(st.commission)} ({st.commissionPct}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Mix */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Payment Methods" />
              {payMix.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No payment data</div>
              ) : (
                <div className="flex gap-4 items-center">
                  <div className="w-[130px] h-[130px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payMix} dataKey="amount" innerRadius={32} outerRadius={55} paddingAngle={2}>
                          {payMix.map((p: any) => <Cell key={p.method} fill={PAY_COLORS[p.method] || "#94a3b8"} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [fmtRs(Number(v))]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {payMix.map((p: any) => {
                      const total = payMix.reduce((s: number, x: any) => s + x.amount, 0);
                      const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
                      return (
                        <div key={p.method}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs font-semibold capitalize text-gray-700">{p.method}</span>
                            <span className="text-xs font-bold text-gray-900">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PAY_COLORS[p.method] || "#94a3b8" }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{p.count} txn · {fmtRs(p.amount)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Products + Expenses + Customer ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Products */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Product Sales" />
              {prods.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-gray-400 text-sm">No product sales</div>
              ) : (
                <div className="space-y-2.5">
                  {prods.slice(0, 6).map((p: any, i: number) => {
                    const maxR = prods[0]?.revenue || 1;
                    const pct = Math.round((p.revenue / maxR) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-gray-800 truncate">{p.name}</span>
                          <span className="text-gray-400 shrink-0 ml-2">{p.count} sold</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{fmtRs(p.revenue)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expenses */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Revenue vs Expenses" />
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-600 font-medium">Total Revenue</span>
                  <span className="text-xs font-bold text-gray-900">{fmtRs(s.totalRevenue || 0)}</span>
                </div>
                {expBrk.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-500">{e.category}</span>
                    <span className="text-xs text-red-500 font-semibold">− {fmtRs(e.amount)}</span>
                  </div>
                ))}
                {expBrk.length === 0 && <p className="text-[11px] text-gray-400">No expenses in {periodLabel}</p>}
                <div className="flex justify-between items-center py-1.5 border-t border-gray-200 mt-1">
                  <span className="text-xs font-bold text-gray-700">Net Profit</span>
                  <span className={`text-sm font-bold ${(s.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtRs(s.netProfit || 0)}</span>
                </div>
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <SectionHead title="Customer Metrics" />
              <div className="space-y-2.5">
                {[
                  { label: "Clients Visited", value: s.periodCustCount || 0, color: "text-violet-700 bg-violet-50" },
                  { label: "Total Clients (all time)", value: ci.totalCustomers || 0, color: "text-blue-700 bg-blue-50" },
                  { label: "Repeat Clients", value: ci.repeatCustomers || 0, color: "text-pink-700 bg-pink-50" },
                  { label: "Retention Rate", value: `${ci.retentionRate || 0}%`, color: "text-emerald-700 bg-emerald-50" },
                ].map(m => (
                  <div key={m.label} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${m.color}`}>
                    <span className="text-xs font-medium">{m.label}</span>
                    <span className="text-base font-bold">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
