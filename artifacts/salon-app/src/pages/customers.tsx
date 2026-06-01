import { useState, useMemo } from "react";
import { useListCustomers, useListMemberships } from "@workspace/api-client-react";
import { Search, Plus, User, Phone, Calendar, Eye, Pencil, Trash2, X, Scissors, Package, FileText, BadgeCheck, Users, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { format, addMonths, subDays, parseISO } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";
const PAGE_SIZE = 10;
const MAX_FAMILY = 4;

type SortKey = "default" | "most-spent" | "least-spent" | "most-visits" | "least-visits";
type GenderFilter = "all" | "male" | "female";

type FamilyMember = { name: string; gender: string; phone: string; dob: string; anniversary: string };
const EMPTY_MEMBER: FamilyMember = { name: "", gender: "", phone: "", dob: "", anniversary: "" };

function GenderToggle({ value, onChange, dark = false }: { value: string; onChange: (v: string) => void; dark?: boolean }) {
  const base = dark
    ? "px-4 py-2 rounded-xl text-sm font-semibold transition-all"
    : "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border";
  const opts = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
  ];
  return (
    <div className={`flex gap-2 ${dark ? "" : ""}`}>
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? "" : o.value)}
          className={`${base} ${
            value === o.value
              ? dark
                ? "bg-primary text-white shadow"
                : "bg-primary text-white border-primary"
              : dark
              ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label === "Male" ? "♂ Male" : "♀ Female"}
        </button>
      ))}
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const { data, isLoading, refetch } = useListCustomers({ search });
  const { data: membershipData } = useListMemberships();
  const { toast } = useToast();

  const membershipPlans: any[] = (membershipData as any)?.memberships || [];

  const [showAdd, setShowAdd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [] as FamilyMember[], membershipId: "", membershipStartDate: format(new Date(), "yyyy-MM-dd") });
  const [showFamilySection, setShowFamilySection] = useState(false);

  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [] as FamilyMember[] });
  const [editPhoneError, setEditPhoneError] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [showEditFamilySection, setShowEditFamilySection] = useState(false);
  const [editMembershipId, setEditMembershipId] = useState("");
  const [editMembershipStartDate, setEditMembershipStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [deleteCustomer, setDeleteCustomer] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [viewInvoiceBill, setViewInvoiceBill] = useState<any>(null);

  const allCustomers: any[] = data?.customers || [];

  const filteredSorted = useMemo(() => {
    let list = [...allCustomers];
    if (genderFilter !== "all") list = list.filter(c => c.gender === genderFilter);
    switch (sortKey) {
      case "most-spent":   list.sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0)); break;
      case "least-spent":  list.sort((a, b) => (a.totalSpend || 0) - (b.totalSpend || 0)); break;
      case "most-visits":  list.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0)); break;
      case "least-visits": list.sort((a, b) => (a.totalVisits || 0) - (b.totalVisits || 0)); break;
    }
    return list;
  }, [allCustomers, genderFilter, sortKey]);

  // Expand list to include family members after their parent customer
  type ExpandedEntry = { _type: "customer"; data: any } | { _type: "family"; data: any; parent: any };
  const expandedList = useMemo<ExpandedEntry[]>(() => {
    const result: ExpandedEntry[] = [];
    for (const c of filteredSorted) {
      result.push({ _type: "customer", data: c });
      const members: any[] = Array.isArray(c.familyMembers) ? c.familyMembers : [];
      for (const m of members) {
        if (m.name) result.push({ _type: "family", data: m, parent: c });
      }
    }
    return result;
  }, [filteredSorted]);

  const totalPages = Math.max(1, Math.ceil(expandedList.length / PAGE_SIZE));
  const paginatedCustomers = expandedList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const validatePhone = (phone: string) => {
    if (!/^\d{10}$/.test(phone)) { setPhoneError("Phone number must be exactly 10 digits"); return false; }
    setPhoneError(""); return true;
  };

  const resetAddForm = () => {
    setFormData({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [], membershipId: "", membershipStartDate: format(new Date(), "yyyy-MM-dd") });
    setPhoneError("");
    setCreateError("");
    setShowFamilySection(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(formData.phone)) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, email: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || "Failed to add customer.");
        return;
      }
      setCreateError("");
      const created = await res.json();
      const customerId = created?.id || created?._id;
      if (formData.membershipId && customerId) {
        try {
          await fetch(`${API_BASE}/customer-memberships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, membershipId: formData.membershipId, startDate: formData.membershipStartDate }),
          });
        } catch {}
      }
      toast({ title: "Customer Added", description: `${formData.name} has been registered.` });
      setShowAdd(false);
      resetAddForm();
      refetch();
    } catch {
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const openView = async (customerId: string) => {
    setViewCustomerId(customerId);
    setCustomerDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}`);
      const d = await res.json();
      setCustomerDetail(d);
    } catch {
      toast({ title: "Error", description: "Failed to load customer details.", variant: "destructive" });
    } finally { setDetailLoading(false); }
  };

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      dob: c.dob ? c.dob.substring(0, 10) : "",
      anniversary: c.anniversary ? c.anniversary.substring(0, 10) : "",
      gender: c.gender || "",
      familyMembers: Array.isArray(c.familyMembers) ? c.familyMembers.map((m: any) => ({
        name: m.name || "", gender: m.gender || "", phone: m.phone || "",
        dob: m.dob ? m.dob.substring(0, 10) : "", anniversary: m.anniversary ? m.anniversary.substring(0, 10) : "",
      })) : [],
    });
    setEditPhoneError("");
    setEditError("");
    setEditMembershipId("");
    setEditMembershipStartDate(format(new Date(), "yyyy-MM-dd"));
    setShowEditFamilySection(Array.isArray(c.familyMembers) && c.familyMembers.length > 0);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(editForm.phone)) { setEditPhoneError("Phone number must be exactly 10 digits"); return; }
    setEditSaving(true);
    try {
      const customerId = editCustomer.id || editCustomer._id;
      const res = await fetch(`${API_BASE}/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, phone: editForm.phone, dob: editForm.dob, anniversary: editForm.anniversary, gender: editForm.gender, familyMembers: editForm.familyMembers }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || "Failed to update customer.");
        return;
      }
      setEditError("");
      if (editMembershipId) {
        try {
          await fetch(`${API_BASE}/customer-memberships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, membershipId: editMembershipId, startDate: editMembershipStartDate }),
          });
        } catch {}
      }
      toast({ title: "Customer Updated", description: `${editForm.name} has been updated.` });
      setEditCustomer(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers/${deleteCustomer.id || deleteCustomer._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Customer Deleted", description: `${deleteCustomer.name} has been removed.` });
      setDeleteCustomer(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" });
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and their history.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        {/* Search + Filters */}
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-wrap gap-3 items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>

          {/* Gender filter */}
          <div className="flex items-center gap-1.5">
            {(["all", "male", "female"] as GenderFilter[]).map(g => (
              <button key={g} onClick={() => { setGenderFilter(g); resetPage(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  genderFilter === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}>
                {g === "all" ? "All" : g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortKey} onChange={e => { setSortKey(e.target.value as SortKey); resetPage(); }}
            className="px-3 py-2 rounded-xl border border-border text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="default">Sort: Default</option>
            <option value="most-spent">Most Spent</option>
            <option value="least-spent">Least Spent</option>
            <option value="most-visits">Most Visits</option>
            <option value="least-visits">Least Visits</option>
          </select>

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredSorted.length} customer{filteredSorted.length !== 1 ? "s" : ""}{expandedList.length > filteredSorted.length ? ` · ${expandedList.length - filteredSorted.length} family member${expandedList.length - filteredSorted.length !== 1 ? "s" : ""}` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Date of Birth</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Total Visits</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No customers found.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((entry, idx) => {
                  if (entry._type === "family") {
                    const m = entry.data;
                    const parent = entry.parent;
                    return (
                      <tr key={`fm-${parent.id || parent._id}-${m.name}-${idx}`} className="hover:bg-violet-50/40 transition-colors bg-violet-50/20">
                        <td className="p-4 pl-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative border-2 border-violet-200"
                              style={{ background: m.gender === "female" ? "#fdf2f8" : m.gender === "male" ? "#eff6ff" : "#f5f3ff", color: m.gender === "female" ? "#db2777" : m.gender === "male" ? "#2563eb" : "#7c3aed" }}>
                              {(m.name || "??").substring(0, 2).toUpperCase()}
                              {m.gender && (
                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white border-[1.5px] border-card ${m.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                                  {m.gender === "male" ? "♂" : "♀"}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{m.name}</p>
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-600">
                                <Users className="w-2.5 h-2.5" /> Family of {parent.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            {m.phone || <span className="italic">—</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.dob ? format(new Date(m.dob), "dd MMM yyyy") : <span className="italic">—</span>}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground/40 text-sm">—</td>
                        <td className="p-4 text-muted-foreground/40 text-sm">—</td>
                        <td className="p-4">
                          <button onClick={() => openEdit(parent)} title="Edit via parent customer"
                            className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  const c = entry.data;
                  return (
                    <tr key={c.id || c._id} className="hover:bg-muted/20 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 relative"
                            style={{ background: c.gender === "female" ? "#fdf2f8" : c.gender === "male" ? "#eff6ff" : "hsl(var(--primary) / 0.1)", color: c.gender === "female" ? "#db2777" : c.gender === "male" ? "#2563eb" : "hsl(var(--primary))" }}>
                            {(c.name || "??").substring(0, 2).toUpperCase()}
                            {c.gender && (
                              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-card ${c.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                                {c.gender === "male" ? "♂" : "♀"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                            {c.activeMembership && (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                                <BadgeCheck className="w-2.5 h-2.5" /> {c.activeMembership.membershipName} · till {c.activeMembership.endDate ? new Date(c.activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {c.dob ? format(new Date(c.dob), "dd MMM yyyy") : <span className="italic">—</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-emerald-600">
                          ₹{Number(c.totalSpend || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground font-medium">
                          {c.totalVisits || 0} visits
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/customers/${c.id || c._id}/history`}>
                            <button title="View Visit History"
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button onClick={() => openEdit(c)} title="Edit Customer"
                            className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteCustomer(c)} title="Delete Customer"
                            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {expandedList.length > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex flex-wrap justify-between items-center gap-3 text-sm text-muted-foreground">
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, expandedList.length)}–{Math.min(page * PAGE_SIZE, expandedList.length)} of {expandedList.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${page === p ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Customer Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <h2 className="text-2xl font-serif font-bold text-primary">New Customer</h2>
              <button onClick={() => { setShowAdd(false); resetAddForm(); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 px-8 pb-8 space-y-4">
              {createError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in">
                  <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                  <span>{createError}</span>
                </div>
              )}
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Customer Name *</label>
                <input required autoFocus placeholder="Enter full name"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
                <GenderToggle value={formData.gender} onChange={v => setFormData({ ...formData, gender: v })} />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Contact No * (10 digits)</label>
                <input required type="tel" maxLength={10} placeholder="10-digit mobile number"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${phoneError ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={formData.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); setFormData({ ...formData, phone: v }); if (v.length === 10) setPhoneError(""); }}
                  onBlur={e => validatePhone(e.target.value)} />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>
              {/* DOB */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
              </div>
              {/* Anniversary */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.anniversary} onChange={e => setFormData({ ...formData, anniversary: e.target.value })} />
              </div>

              {/* Membership */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Membership <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                  <select
                    className="w-full pl-9 pr-4 py-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none appearance-none text-sm"
                    value={formData.membershipId}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(f => ({ ...f, membershipId: val, familyMembers: val ? f.familyMembers : [] }));
                      if (!val) setShowFamilySection(false);
                    }}
                  >
                    <option value="">— No membership —</option>
                    {membershipPlans.map((m: any) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name} — ₹{m.price?.toLocaleString()} / {m.duration} mo
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {formData.membershipId && (() => {
                  const plan = membershipPlans.find((m: any) => (m.id || m._id) === formData.membershipId);
                  const expiry = plan && formData.membershipStartDate
                    ? format(subDays(addMonths(parseISO(formData.membershipStartDate), Number(plan.duration)), 1), "dd MMM yyyy")
                    : null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-amber-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.membershipStartDate}
                          onChange={e => setFormData(f => ({ ...f, membershipStartDate: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                        />
                      </div>
                      {expiry && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Valid until: <span className="font-semibold ml-1">{expiry}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Family Members Toggle — only when membership is assigned */}
              {formData.membershipId && (
              <div className="pt-1">
                <button type="button"
                  onClick={() => {
                    if (!showFamilySection) { setShowFamilySection(true); if (formData.familyMembers.length === 0) setFormData(f => ({ ...f, familyMembers: [{ ...EMPTY_MEMBER }] })); }
                    else setShowFamilySection(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors font-medium text-sm">
                  <Users className="w-4 h-4" />
                  {showFamilySection ? "Hide Family Members" : "Add Family Members"}
                  {showFamilySection ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>
              </div>
              )}

              {/* Family Members Section */}
              {showFamilySection && (
                <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Family Members <span className="text-xs text-muted-foreground font-normal">(up to {MAX_FAMILY})</span></p>
                    {formData.familyMembers.length < MAX_FAMILY && (
                      <button type="button"
                        onClick={() => setFormData(f => ({ ...f, familyMembers: [...f.familyMembers, { ...EMPTY_MEMBER }] }))}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>
                  {formData.familyMembers.map((m, idx) => (
                    <div key={idx} className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Member {idx + 1}</span>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, familyMembers: f.familyMembers.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Name *</label>
                        <input required placeholder="Member name"
                          className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          value={m.name} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, name: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Gender</label>
                        <GenderToggle value={m.gender} onChange={v => { const members = [...formData.familyMembers]; members[idx] = { ...m, gender: v }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Contact No</label>
                        <input type="tel" maxLength={10} placeholder="10-digit number"
                          className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          value={m.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ""); const members = [...formData.familyMembers]; members[idx] = { ...m, phone: v }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.dob} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, dob: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Anniversary <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.anniversary} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, anniversary: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetAddForm(); }}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  {createLoading ? "Saving..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Customer Modal ── */}
      {editCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <h2 className="text-2xl font-serif font-bold text-amber-600">Edit Customer</h2>
              <button onClick={() => setEditCustomer(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="overflow-y-auto flex-1 px-8 pb-8 space-y-4">
              {editError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in">
                  <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                  <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Customer Name *</label>
                <input required autoFocus placeholder="Enter full name"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
                <GenderToggle value={editForm.gender} onChange={v => setEditForm({ ...editForm, gender: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Contact No * (10 digits)</label>
                <input required type="tel" maxLength={10} placeholder="10-digit mobile number"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${editPhoneError ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={editForm.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); setEditForm({ ...editForm, phone: v }); if (v.length === 10) setEditPhoneError(""); }}
                  onBlur={e => { if (!/^\d{10}$/.test(e.target.value)) setEditPhoneError("Phone number must be exactly 10 digits"); else setEditPhoneError(""); }} />
                {editPhoneError && <p className="text-red-500 text-xs mt-1">{editPhoneError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.anniversary} onChange={e => setEditForm({ ...editForm, anniversary: e.target.value })} />
              </div>

              {/* Membership */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Membership
                  {editCustomer?.activeMembership && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">
                      (currently: {editCustomer.activeMembership.membershipName} · till {editCustomer.activeMembership.endDate ? new Date(editCustomer.activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                  <select
                    className="w-full pl-9 pr-4 py-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none appearance-none text-sm"
                    value={editMembershipId}
                    onChange={e => setEditMembershipId(e.target.value)}
                  >
                    <option value="">— {editCustomer?.activeMembership ? "Keep current / no change" : "No membership"} —</option>
                    {membershipPlans.map((m: any) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name} — ₹{m.price?.toLocaleString()} / {m.duration} mo
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {editMembershipId && (() => {
                  const plan = membershipPlans.find((m: any) => (m.id || m._id) === editMembershipId);
                  const expiry = plan && editMembershipStartDate
                    ? format(subDays(addMonths(parseISO(editMembershipStartDate), Number(plan.duration)), 1), "dd MMM yyyy")
                    : null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-amber-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editMembershipStartDate}
                          onChange={e => setEditMembershipStartDate(e.target.value)}
                          className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                        />
                      </div>
                      {expiry && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Valid until: <span className="font-semibold ml-1">{expiry}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Family Members Toggle */}
              <div className="pt-1">
                <button type="button"
                  onClick={() => {
                    if (!showEditFamilySection) { setShowEditFamilySection(true); if (editForm.familyMembers.length === 0) setEditForm(f => ({ ...f, familyMembers: [{ ...EMPTY_MEMBER }] })); }
                    else setShowEditFamilySection(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-amber-400/50 text-amber-600 hover:bg-amber-50 transition-colors font-medium text-sm">
                  <Users className="w-4 h-4" />
                  {showEditFamilySection ? "Hide Family Members" : `Family Members${editForm.familyMembers.length > 0 ? ` (${editForm.familyMembers.length})` : ""}`}
                  {showEditFamilySection ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>
              </div>

              {showEditFamilySection && (
                <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Family Members <span className="text-xs text-muted-foreground font-normal">(up to {MAX_FAMILY})</span></p>
                    {editForm.familyMembers.length < MAX_FAMILY && (
                      <button type="button"
                        onClick={() => setEditForm(f => ({ ...f, familyMembers: [...f.familyMembers, { ...EMPTY_MEMBER }] }))}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>
                  {editForm.familyMembers.map((m, idx) => (
                    <div key={idx} className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Member {idx + 1}</span>
                        <button type="button" onClick={() => setEditForm(f => ({ ...f, familyMembers: f.familyMembers.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Name *</label>
                        <input required placeholder="Member name"
                          className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          value={m.name} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, name: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Gender</label>
                        <GenderToggle value={m.gender} onChange={v => { const members = [...editForm.familyMembers]; members[idx] = { ...m, gender: v }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Contact No</label>
                        <input type="tel" maxLength={10} placeholder="10-digit number"
                          className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          value={m.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ""); const members = [...editForm.familyMembers]; members[idx] = { ...m, phone: v }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.dob} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, dob: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Anniversary <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.anniversary} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, anniversary: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditCustomer(null)}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors shadow-lg disabled:opacity-50">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Delete Customer?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteCustomer.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCustomer(null)}
                className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {viewInvoiceBill && <InvoiceModal bill={viewInvoiceBill} onClose={() => setViewInvoiceBill(null)} />}

      {/* ── View Customer Profile Modal (inline) ── */}
      {viewCustomerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-primary">Customer Profile</h2>
              <button onClick={() => { setViewCustomerId(null); setCustomerDetail(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {detailLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
              ) : customerDetail ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0 relative">
                      {customerDetail.name?.substring(0, 2).toUpperCase()}
                      {customerDetail.gender && (
                        <span className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${customerDetail.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                          {customerDetail.gender === "male" ? "♂" : "♀"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{customerDetail.name}</h3>
                      <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5" /> {customerDetail.phone}
                      </p>
                      {customerDetail.dob && (
                        <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" /> DOB: {format(new Date(customerDetail.dob), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">₹{Number(customerDetail.totalSpend || 0).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{customerDetail.totalVisits || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Visits</p>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-lg font-bold text-secondary">
                        {customerDetail.lastVisit ? format(new Date(customerDetail.lastVisit), "dd MMM yy") : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Last Visit</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Visit History</h4>
                    {!customerDetail.bills || customerDetail.bills.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl">No visits yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {customerDetail.bills.map((bill: any) => (
                          <div key={bill.id || bill._id} className="bg-muted/20 rounded-xl p-4 border border-border/40">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-sm">{bill.billNumber}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                                </p>
                              </div>
                              <span className="font-bold text-emerald-600 text-base">
                                ₹{Number(bill.finalAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>

                            {bill.items && bill.items.length > 0 && (
                              <div className="space-y-1.5 border-t border-border/30 pt-2">
                                {bill.items.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                      {item.type === "service"
                                        ? <Scissors className="w-3 h-3 text-primary" />
                                        : <Package className="w-3 h-3 text-secondary" />}
                                      <span className="font-medium text-foreground">{item.name}</span>
                                      {item.quantity > 1 && <span className="text-muted-foreground/70">×{item.quantity}</span>}
                                      {item.staffName && <span className="text-muted-foreground/60">· {item.staffName}</span>}
                                    </span>
                                    <span className="font-semibold text-foreground">₹{Number(item.total || 0).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                                {(bill.discountAmount > 0 || bill.taxAmount > 0) && (
                                  <div className="border-t border-border/20 pt-1.5 mt-1 space-y-1">
                                    {bill.discountAmount > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="text-red-500 font-medium">-₹{Number(bill.discountAmount).toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                    {bill.taxAmount > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Tax ({bill.taxPercent}%)</span>
                                        <span className="text-foreground font-medium">+₹{Number(bill.taxAmount).toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <span className="capitalize">💳 {bill.paymentMethod}</span>
                                <span className={`capitalize font-semibold ${bill.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{bill.status}</span>
                              </div>
                              <button
                                onClick={() => setViewInvoiceBill({ ...bill, customerPhone: customerDetail.phone })}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-xs">
                                <FileText className="w-3.5 h-3.5" /> View Invoice
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
