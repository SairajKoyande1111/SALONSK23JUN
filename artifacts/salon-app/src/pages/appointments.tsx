import { useState, useRef, useEffect, useMemo, RefObject } from "react";
import { createPortal } from "react-dom";
import {
  useListCustomers, useListStaff, useListServices,
  useCreateAppointment,
} from "@workspace/api-client-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isToday, isSameDay, addDays, subDays,
} from "date-fns";
import {
  Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Plus, X,
  Search, UserPlus, Pencil, Trash2, Clock, Filter, MoreHorizontal,
  LayoutGrid, List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";

const STATUS_OPTIONS = ["scheduled", "in-progress", "completed", "cancelled"];

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  "in-progress": "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const statusBorderColors: Record<string, string> = {
  scheduled: "border-l-blue-400",
  "in-progress": "border-l-amber-400",
  completed: "border-l-green-500",
  cancelled: "border-l-red-400",
};

const legendDotColors: Record<string, string> = {
  scheduled: "bg-blue-400",
  "in-progress": "bg-amber-400",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

// ─── Calendar view constants ──────────────────────────────────────────────────
const SLOT_HEIGHT = 56;       // px per 30-min slot
const TIME_COL_W = 88;        // px for the time label column
const CAL_START = 9 * 60;     // 9:00 AM in minutes from midnight
const CAL_END   = 21 * 60;    // 9:00 PM in minutes from midnight
const TOTAL_SLOTS = (CAL_END - CAL_START) / 30; // 24 slots

// Zenotti-style card colours — very light pastels, subtle borders
const calBg: Record<string, string> = {
  scheduled:   "bg-[#EEF3FF] border-[#C0D0FF]",
  "in-progress": "bg-[#FFFBEB] border-[#FDE68A]",
  completed:   "bg-[#F0FDF4] border-[#86EFAC]",
  cancelled:   "bg-[#F9FAFB] border-[#E5E7EB] opacity-70",
};
const calTextColor: Record<string, string> = {
  scheduled:   "text-[#1e3a8a]",
  "in-progress": "text-[#92400e]",
  completed:   "text-[#14532d]",
  cancelled:   "text-[#6b7280]",
};
const calTimeColor: Record<string, string> = {
  scheduled:   "text-[#3b5bdb]",
  "in-progress": "text-[#d97706]",
  completed:   "text-[#16a34a]",
  cancelled:   "text-[#9ca3af]",
};

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Generic searchable select ───────────────────────────────────────────────
function SearchSelect({ placeholder, value, onChange, options, getLabel, getId }: {
  placeholder: string; value: string; onChange: (id: string) => void;
  options: any[]; getLabel: (item: any) => string; getId: (item: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => getId(o) === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className="w-full p-2.5 rounded-xl border border-border bg-background text-sm text-left flex items-center justify-between focus:ring-2 focus:ring-primary/40 outline-none">
        <span className={selected ? "text-foreground font-medium" : "text-muted-foreground"}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input autoFocus placeholder={`Search ${placeholder.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-2 text-sm bg-muted/40 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-4 py-3 text-sm text-muted-foreground text-center">No results</p>
              : filtered.map(o => (
                <button key={getId(o)} type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors font-medium ${getId(o) === value ? "text-primary bg-primary/5" : ""}`}
                  onClick={() => { onChange(getId(o)); setOpen(false); setSearch(""); }}>
                  {getLabel(o)}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────
function AddCustomerModal({ onClose, onSaved, existingPhones }: {
  onClose: () => void; onSaved: (customer: any) => void; existingPhones?: Set<string>;
}) {
  type FM = { name: string; phone: string; gender: string; dob: string; anniversary: string };
  const EMPTY_FM: FM = { name: "", phone: "", gender: "", dob: "", anniversary: "" };

  const [form, setForm] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", membershipId: "", membershipStartDate: "" });
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [familyErrors, setFamilyErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FM[]>([]);
  const [showFamilySection, setShowFamilySection] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/memberships`).then(r => r.json()).then(d => setMemberships(d.memberships || [])).catch(() => {});
  }, []);

  const validatePhone = (v: string) => {
    if (!/^\d{10}$/.test(v)) { setPhoneError("Phone number must be exactly 10 digits"); return false; }
    setPhoneError(""); return true;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setNameError("Name is required"); return; }
    setNameError("");
    if (!validatePhone(form.phone)) return;
    if (existingPhones?.has(form.phone)) { setPhoneError("This phone number is already registered in the system."); return; }
    if (form.membershipId && showFamilySection) {
      const validFM = familyMembers.filter(m => m.name.trim());
      const errs: Record<number, string> = {};
      for (let i = 0; i < validFM.length; i++) {
        const m = validFM[i];
        if (!m.phone) continue;
        if (!/^\d{10}$/.test(m.phone)) { errs[i] = "Phone must be exactly 10 digits"; continue; }
        if (m.phone === form.phone) { errs[i] = "Cannot match the customer's phone number"; continue; }
        if (validFM.slice(0, i).some(prev => prev.phone === m.phone)) { errs[i] = "Duplicate phone within family members"; continue; }
        if (existingPhones?.has(m.phone)) { errs[i] = "This phone is already registered"; }
      }
      if (Object.keys(errs).length > 0) { setFamilyErrors(errs); return; }
    }
    setFamilyErrors({});
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, dob: form.dob, anniversary: form.anniversary, gender: form.gender, email: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPhoneError(err.error || "Failed to save. Try again.");
        return;
      }
      const created = await res.json();
      const newId = created.id || created._id;
      if (form.membershipId) {
        const today = new Date().toISOString().slice(0, 10);
        await fetch(`${API_BASE}/customer-memberships`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: newId, membershipId: form.membershipId, startDate: form.membershipStartDate || today }),
        }).catch(() => {});
      }
      if (form.membershipId && showFamilySection) {
        for (const member of familyMembers.filter(m => m.name.trim())) {
          await fetch(`${API_BASE}/customers/${newId}/family-member`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(member),
          }).catch(() => {});
        }
      }
      onSaved(created);
    } catch {
      setPhoneError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
          <h2 className="text-2xl font-serif font-bold text-primary">New Customer</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Full Name *</label>
            <input autoFocus placeholder="Enter full name"
              className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${nameError ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
              value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (e.target.value.trim()) setNameError(""); }} />
            {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
            <div className="flex gap-2">
              {[{ label: "♂ Male", value: "male" }, { label: "♀ Female", value: "female" }].map(g => (
                <button key={g.value} type="button"
                  onClick={() => setForm({ ...form, gender: form.gender === g.value ? "" : g.value })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.gender === g.value ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Phone Number * (10 digits)</label>
            <input type="tel" maxLength={10} placeholder="10-digit mobile number"
              className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${phoneError ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
              value={form.phone}
              onChange={e => { const v = e.target.value.replace(/\D/g, ""); setForm({ ...form, phone: v }); if (v.length === 10) setPhoneError(""); }}
              onBlur={e => { if (e.target.value) validatePhone(e.target.value); }} />
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Date of Birth</label>
              <input type="date" className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary</label>
              <input type="date" className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.anniversary} onChange={e => setForm({ ...form, anniversary: e.target.value })} />
            </div>
          </div>
          {memberships.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Membership Plan (optional)</label>
              <select value={form.membershipId}
                onChange={e => { const val = e.target.value; setForm({ ...form, membershipId: val }); if (!val) { setShowFamilySection(false); setFamilyMembers([]); } }}
                className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                <option value="">No membership</option>
                {memberships.map((m: any) => (
                  <option key={m.id || m._id} value={m.id || m._id}>{m.name} — ₹{m.price} / {m.duration}mo</option>
                ))}
              </select>
              {form.membershipId && (
                <div className="mt-2">
                  <label className="block text-xs text-muted-foreground mb-1">Membership Start Date</label>
                  <input type="date" defaultValue={new Date().toISOString().slice(0, 10)}
                    value={form.membershipStartDate || new Date().toISOString().slice(0, 10)}
                    onChange={e => setForm({ ...form, membershipStartDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              )}
            </div>
          )}
          {form.membershipId && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => { if (!showFamilySection) { setShowFamilySection(true); if (familyMembers.length === 0) setFamilyMembers([{ ...EMPTY_FM }]); } else setShowFamilySection(false); }}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Family Members{familyMembers.filter(m => m.name.trim()).length > 0 ? ` (${familyMembers.filter(m => m.name.trim()).length})` : ""}
                </span>
                <span className="text-muted-foreground text-xs">{showFamilySection ? "▲ Hide" : "▼ Add"}</span>
              </button>
              {showFamilySection && (
                <div className="p-4 space-y-3">
                  {familyMembers.map((fm, i) => (
                    <div key={i} className="bg-muted/20 rounded-xl p-3 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">Member {i + 1}</p>
                        <button type="button" onClick={() => setFamilyMembers(prev => prev.filter((_, ii) => ii !== i))}
                          className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                      <input type="text" placeholder="Name *" value={fm.name}
                        onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, name: e.target.value } : x))}
                        className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input type="tel" placeholder="Phone (10 digits)" value={fm.phone} maxLength={10}
                            onChange={e => { setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, phone: e.target.value.replace(/\D/g, "").slice(0, 10) } : x)); setFamilyErrors(fe => { const n = { ...fe }; delete n[i]; return n; }); }}
                            className={`w-full p-2 rounded-lg border bg-background text-sm focus:ring-2 outline-none ${familyErrors[i] ? "border-red-400 focus:ring-red-200" : "border-border focus:ring-primary/20"}`} />
                          {familyErrors[i] && <p className="text-red-500 text-[10px] mt-0.5">{familyErrors[i]}</p>}
                        </div>
                        <select value={fm.gender}
                          onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, gender: e.target.value } : x))}
                          className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                          <option value="">Gender</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Date of Birth</label>
                          <input type="date" value={fm.dob}
                            onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, dob: e.target.value } : x))}
                            className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Anniversary</label>
                          <input type="date" value={fm.anniversary}
                            onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, anniversary: e.target.value } : x))}
                            className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {familyMembers.length < 4 ? (
                    <button type="button"
                      onClick={() => setFamilyMembers(prev => [...prev, { ...EMPTY_FM }])}
                      className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add Family Member
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-xl">Maximum 4 family members allowed</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Select ──────────────────────────────────────────────────────────
function CustomerSelect({ value, onChange, customers, onCustomerCreated }: {
  value: string; onChange: (id: string) => void;
  customers: any[]; onCustomerCreated: (c: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const existingPhones = useMemo(() => {
    const phones = new Set<string>();
    for (const c of customers) {
      if (c.phone) phones.add(c.phone);
      for (const m of (c.familyMembers || [])) { if (m.phone) phones.add(m.phone); }
    }
    return phones;
  }, [customers]);

  const selected = customers.find(c => (c.id || c._id) === value);
  const displayLabel = !value ? "Walk-in" : selected ? `${selected.name}${selected.phone ? ` · ${selected.phone}` : ""}` : "Walk-in";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)
  );

  return (
    <>
      <div className="relative" ref={ref}>
        <button type="button"
          onClick={() => { setOpen(o => !o); setSearch(""); }}
          className="w-full p-2.5 rounded-xl border border-border bg-background text-sm text-left flex items-center justify-between focus:ring-2 focus:ring-primary/40 outline-none">
          <span className={!value ? "text-muted-foreground" : "text-foreground font-medium"}>{displayLabel}</span>
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
        {open && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input autoFocus placeholder="Search by name or phone..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted/40 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button type="button"
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors font-medium ${!value ? "text-primary bg-primary/5" : ""}`}
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}>Walk-in</button>
              {filtered.map(c => (
                <button key={c.id || c._id} type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors ${(c.id || c._id) === value ? "text-primary bg-primary/5 font-medium" : ""}`}
                  onClick={() => { onChange(c.id || c._id); setOpen(false); setSearch(""); }}>
                  <p className="font-medium">{c.name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </button>
              ))}
              {filtered.length === 0 && search && (
                <p className="px-4 py-2 text-xs text-muted-foreground">No customer found</p>
              )}
            </div>
            <div className="border-t border-border/40">
              <button type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2"
                onClick={() => { setOpen(false); setShowAddModal(true); }}>
                <UserPlus className="w-4 h-4" /> Add new customer
              </button>
            </div>
          </div>
        )}
      </div>
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          existingPhones={existingPhones}
          onSaved={(created) => {
            onCustomerCreated(created);
            onChange(created.id || created._id);
            setShowAddModal(false);
          }}
        />
      )}
    </>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate, calendarMonth, onChangeMonth, markedDates }: {
  selectedDate: Date; onSelectDate: (d: Date) => void;
  calendarMonth: Date; onChangeMonth: (d: Date) => void;
  markedDates: Set<string>;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const startDay = getDay(startOfMonth(calendarMonth));

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onChangeMonth(subMonths(calendarMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold">{format(calendarMonth, "MMMM yyyy")}</span>
        <button onClick={() => onChangeMonth(addMonths(calendarMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => {
          const ds = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selectedDate);
          const hasAppts = markedDates.has(ds);
          const today = isToday(day);
          return (
            <div key={ds} className="flex flex-col items-center py-0.5">
              <button
                onClick={() => onSelectDate(day)}
                className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors font-medium
                  ${isSelected ? "bg-primary text-white shadow-sm" : today ? "border-2 border-primary text-primary font-bold" : "hover:bg-muted text-foreground"}`}>
                {format(day, "d")}
              </button>
              {hasAppts && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white/80" : "bg-primary"}`} />}
              {!hasAppts && <div className="h-1.5" />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <button
          onClick={() => { const t = new Date(); onSelectDate(t); onChangeMonth(t); }}
          className="w-full text-xs text-primary font-semibold hover:bg-primary/5 py-1.5 rounded-lg transition-colors">
          Go to Today
        </button>
      </div>
    </div>
  );
}

// ─── List View Appointment Card ───────────────────────────────────────────────
function AppointmentCard({ appt, onStatusChange, onEdit, onDelete }: {
  appt: any; onStatusChange: (id: string, status: string) => void;
  onEdit: (appt: any) => void; onDelete: (appt: any) => void;
}) {
  return (
    <div className={`bg-card rounded-2xl border border-border/40 border-l-4 ${statusBorderColors[appt.status] || "border-l-border"} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-4 flex items-start gap-4">
        <div className="w-20 shrink-0 pt-0.5 text-center">
          <p className="font-bold text-primary text-lg leading-tight">{appt.appointmentTime || "—"}</p>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="w-3 h-3" />
            <span>{appt.duration || 30} min</span>
          </div>
        </div>
        <div className="w-px self-stretch bg-border/50 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-bold text-foreground text-base leading-tight">{appt.customerName || "Walk-in"}</p>
            {appt.customerPhone && <span className="text-xs text-muted-foreground font-mono">{appt.customerPhone}</span>}
          </div>
          <div className="flex items-start flex-wrap gap-2 text-sm">
            <div className="flex flex-wrap gap-1.5 items-center">
              {(appt.services && appt.services.length > 0
                ? appt.services.map((s: any) => s.serviceName)
                : [appt.serviceName]
              ).map((name: string, i: number) => (
                <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">{name}</span>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-muted-foreground ml-1">
              <User className="w-3.5 h-3.5" />
              <span>{appt.staffName}</span>
            </span>
          </div>
          {appt.notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2 py-1 inline-block">{appt.notes}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[appt.status] || ""}`}>{appt.status}</span>
          <div className="flex items-center gap-1.5">
            <select value={appt.status} onChange={e => onStatusChange(appt.id || appt._id, e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button onClick={() => onEdit(appt)} title="Edit"
              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(appt)} title="Delete"
              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-200">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Service Selector ───────────────────────────────────────────────────
function MultiServiceSelect({ selectedServices, onChange, services, onVariantNeeded }: {
  selectedServices: { id: string; name: string }[];
  onChange: (svc: { id: string; name: string }[]) => void;
  services: any[];
  onVariantNeeded?: (svc: any) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = selectedServices.map(s => s.id);
  const available = services.filter(s => !selectedIds.includes(s.id || s._id));
  const filtered = searchText ? available.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase())) : available;
  const pendingSvc = pendingId ? services.find(s => (s.id || s._id) === pendingId) : null;

  const selectFromDropdown = (svc: any) => {
    const id = svc.id || svc._id;
    setSearchText(svc.name);
    setPendingId(id);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleAdd = () => {
    if (!pendingId || selectedIds.includes(pendingId)) return;
    const svc = services.find(s => (s.id || s._id) === pendingId);
    if (svc && Array.isArray(svc.types) && svc.types.filter((t: any) => t.name).length > 0 && onVariantNeeded) {
      onVariantNeeded(svc);
      setSearchText(""); setPendingId("");
    } else {
      onChange([...selectedServices, { id: pendingId, name: svc?.name || searchText }]);
      setSearchText(""); setPendingId("");
      setShowDropdown(true);
      inputRef.current?.focus();
    }
  };

  const handleRemove = (id: string) => onChange(selectedServices.filter(s => s.id !== id));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearchChange = (val: string) => { setSearchText(val); setPendingId(""); setShowDropdown(true); };

  return (
    <div className="space-y-2" ref={containerRef}>
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedServices.map((svc, idx) => (
            <span key={`${svc.id}-${idx}`}
              className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">
              {svc.name}
              <button type="button" onClick={() => handleRemove(svc.id)}
                className="text-primary/60 hover:text-red-500 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input ref={inputRef} type="text" placeholder="Search service..."
            value={searchText} onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
              {filtered.map(s => (
                <button key={s.id || s._id} type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors font-medium ${pendingId === (s.id || s._id) ? "bg-primary/5 text-primary" : ""}`}
                  onMouseDown={e => { e.preventDefault(); selectFromDropdown(s); }}>
                  <span>{s.name}</span>
                  {Array.isArray(s.types) && s.types.filter((t: any) => t.name).length > 0 && (
                    <span className="ml-2 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {s.types.filter((t: any) => t.name).length} variants
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showDropdown && filtered.length === 0 && searchText && !pendingId && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
              <p className="px-4 py-3 text-sm text-muted-foreground text-center">No services found</p>
            </div>
          )}
        </div>
        <button type="button" onClick={handleAdd} disabled={!pendingId}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0">
          {pendingSvc && Array.isArray(pendingSvc.types) && pendingSvc.types.filter((t: any) => t.name).length > 0 && onVariantNeeded ? "Pick Variant" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ onClose, onSuccess, customers: initialCustomers, staff, services, defaultDate, defaultStaffId, defaultTime }: any) {
  const createAppointment = useCreateAppointment();
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string }[]>([]);
  const [variantPicker, setVariantPicker] = useState<any | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    staffId: defaultStaffId || "",
    appointmentDate: format(defaultDate || new Date(), "yyyy-MM-dd"),
    appointmentTime: defaultTime || "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePickVariant = (svc: any, variantName: string) => {
    const displayName = `${svc.name} — ${variantName}`;
    setSelectedServices(prev => [...prev, { id: svc.id || svc._id, name: displayName }]);
    setVariantPicker(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) return;
    setIsLoading(true);
    const serviceIds = selectedServices.map(s => s.id);
    const serviceVariantNames = selectedServices.map(s => s.name);
    createAppointment.mutate(
      { data: { customerId: form.customerId || undefined, staffId: form.staffId, serviceIds, serviceVariantNames, appointmentDate: form.appointmentDate, appointmentTime: form.appointmentTime, notes: form.notes } as any },
      {
        onSuccess: () => { setIsLoading(false); onSuccess(); onClose(); },
        onError: () => setIsLoading(false),
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-serif font-bold text-primary">Book Appointment</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Customer</label>
              <CustomerSelect value={form.customerId} onChange={(id) => set("customerId", id)}
                customers={customers} onCustomerCreated={(c) => setCustomers((prev: any[]) => [c, ...prev])} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Services * {selectedServices.length > 0 && <span className="text-primary normal-case font-normal">({selectedServices.length} selected)</span>}
              </label>
              <MultiServiceSelect selectedServices={selectedServices} onChange={setSelectedServices}
                services={services} onVariantNeeded={(svc) => setVariantPicker(svc)} />
              {selectedServices.length === 0 && <p className="text-xs text-muted-foreground mt-1">Add at least one service</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Staff (optional)</label>
              <SearchSelect placeholder="Select staff member" value={form.staffId} onChange={(id) => set("staffId", id)}
                options={staff} getLabel={(s) => s.name} getId={(s) => s.id || s._id} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date *</label>
                <input type="date" required value={form.appointmentDate} onChange={e => set("appointmentDate", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time *</label>
                <input type="time" required value={form.appointmentTime} onChange={e => set("appointmentTime", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Any special instructions..."
                className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={isLoading || selectedServices.length === 0}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {isLoading ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {variantPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{variantPicker.category}</p>
                <h3 className="font-bold text-foreground text-lg leading-tight">{variantPicker.name}</h3>
              </div>
              <button onClick={() => setVariantPicker(null)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground text-center mb-3">Select a variant to add</p>
              {(variantPicker.types || []).filter((t: any) => t.name).map((v: any) => {
                const alreadyAdded = selectedServices.some(s => s.id === (variantPicker.id || variantPicker._id) && s.name === `${variantPicker.name} — ${v.name}`);
                return (
                  <button key={v.name} type="button" disabled={alreadyAdded}
                    onClick={() => handlePickVariant(variantPicker, v.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors border ${alreadyAdded ? "opacity-40 cursor-not-allowed bg-muted border-border" : "bg-background hover:bg-primary/5 border-border hover:border-primary/30"}`}>
                    <span className="text-sm font-semibold">{v.name}</span>
                    <div className="flex items-center gap-2">
                      {v.price > 0 && <span className="text-xs text-muted-foreground">₹{Number(v.price).toLocaleString("en-IN")}</span>}
                      {alreadyAdded && <span className="text-[10px] text-muted-foreground">Added</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ appt, onClose, onSuccess, customers: initialCustomers, staff, services }: any) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState(initialCustomers);

  const initSelectedServices = (): { id: string; name: string }[] => {
    if (appt.services && appt.services.length > 0)
      return appt.services.map((s: any) => ({ id: s.serviceId, name: s.serviceName || s.serviceId }));
    if (appt.serviceId) {
      const svc = services.find((s: any) => (s.id || s._id) === appt.serviceId);
      return [{ id: appt.serviceId, name: svc?.name || appt.serviceName || appt.serviceId }];
    }
    return [];
  };
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string }[]>(initSelectedServices);
  const [variantPicker, setVariantPicker] = useState<any | null>(null);
  const [form, setForm] = useState({
    customerId: appt.customerId || "",
    staffId: appt.staffId || "",
    appointmentDate: appt.appointmentDate || format(new Date(), "yyyy-MM-dd"),
    appointmentTime: appt.appointmentTime || "",
    notes: appt.notes || "",
    status: appt.status || "scheduled",
  });
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePickVariant = (svc: any, variantName: string) => {
    const displayName = `${svc.name} — ${variantName}`;
    setSelectedServices(prev => [...prev, { id: svc.id || svc._id, name: displayName }]);
    setVariantPicker(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) return;
    setIsLoading(true);
    try {
      const serviceIds = selectedServices.map(s => s.id);
      const serviceVariantNames = selectedServices.map(s => s.name);
      const res = await fetch(`${API_BASE}/appointments/${appt.id || appt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, serviceIds, serviceVariantNames }),
      });
      if (!res.ok) throw new Error();
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Failed to update appointment", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-serif font-bold text-primary">Edit Appointment</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Customer</label>
              <CustomerSelect value={form.customerId} onChange={(id) => set("customerId", id)}
                customers={customers} onCustomerCreated={(c) => setCustomers((prev: any[]) => [c, ...prev])} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Services * {selectedServices.length > 0 && <span className="text-primary normal-case font-normal">({selectedServices.length} selected)</span>}
              </label>
              <MultiServiceSelect selectedServices={selectedServices} onChange={setSelectedServices}
                services={services} onVariantNeeded={(svc) => setVariantPicker(svc)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Staff (optional)</label>
              <SearchSelect placeholder="Select staff member" value={form.staffId} onChange={(id) => set("staffId", id)}
                options={staff} getLabel={(s) => s.name} getId={(s) => s.id || s._id} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date *</label>
                <input type="date" required value={form.appointmentDate} onChange={e => set("appointmentDate", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time *</label>
                <input type="time" required value={form.appointmentTime} onChange={e => set("appointmentTime", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Any special instructions..."
                className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={isLoading || selectedServices.length === 0}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {variantPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{variantPicker.category}</p>
                <h3 className="font-bold text-foreground text-lg leading-tight">{variantPicker.name}</h3>
              </div>
              <button onClick={() => setVariantPicker(null)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground text-center mb-3">Select a variant to add</p>
              {(variantPicker.types || []).filter((t: any) => t.name).map((v: any) => {
                const alreadyAdded = selectedServices.some(s => s.id === (variantPicker.id || variantPicker._id) && s.name === `${variantPicker.name} — ${v.name}`);
                return (
                  <button key={v.name} type="button" disabled={alreadyAdded}
                    onClick={() => handlePickVariant(variantPicker, v.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors border ${alreadyAdded ? "opacity-40 cursor-not-allowed bg-muted border-border" : "bg-background hover:bg-primary/5 border-border hover:border-primary/30"}`}>
                    <span className="text-sm font-semibold">{v.name}</span>
                    <div className="flex items-center gap-2">
                      {v.price > 0 && <span className="text-xs text-muted-foreground">₹{Number(v.price).toLocaleString("en-IN")}</span>}
                      {alreadyAdded && <span className="text-[10px] text-muted-foreground">Added</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ appt, onClose, onConfirm }: {
  appt: any; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Delete Appointment?</h2>
        <p className="text-muted-foreground text-sm mb-6">
          This will permanently remove the appointment for{" "}
          <strong>{appt.customerName || "Walk-in"}</strong> on{" "}
          <strong>{appt.appointmentDate}</strong> at{" "}
          <strong>{appt.appointmentTime}</strong>.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Detail Modal ─────────────────────────────────────────────────
function ApptDetailModal({ appt, onClose, onEdit, onDelete, onStatusChange }: {
  appt: any; onClose: () => void;
  onEdit: (a: any) => void; onDelete: (a: any) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const status = appt.status || "scheduled";
  const id = appt.id || appt._id;
  const endMin = timeToMinutes(appt.appointmentTime) + (appt.duration || 30);
  const startTimeStr = appt.appointmentTime
    ? format(new Date(2020, 0, 1, ...appt.appointmentTime.split(":").map(Number) as [number, number]), "h:mm a")
    : "";
  const endTimeStr = format(new Date(2020, 0, 1, Math.floor(endMin / 60), endMin % 60), "h:mm a");
  const serviceName = appt.services?.length > 0
    ? appt.services.map((s: any) => s.serviceName).join(", ")
    : appt.serviceName || "";

  const statusBadge: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    "in-progress": "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-4 ${calBg[status] || calBg.scheduled}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold mb-0.5 ${calTimeColor[status] || calTimeColor.scheduled}`}>
                {startTimeStr} – {endTimeStr} · {appt.duration || 30} min
              </p>
              <p className={`text-base font-bold leading-tight ${calTextColor[status] || calTextColor.scheduled}`}>
                {appt.customerName || "Walk-in"}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10 transition-colors shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadge[status] || statusBadge.scheduled}`}>
            {status.replace("-", " ")}
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 text-sm">
          {appt.customerPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-semibold w-20 shrink-0">Phone</span>
              <span className="font-medium text-foreground">{appt.customerPhone}</span>
            </div>
          )}
          {serviceName && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <span className="text-xs font-semibold w-20 shrink-0 pt-0.5">Service</span>
              <span className="font-medium text-foreground">{serviceName}</span>
            </div>
          )}
          {appt.staffName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-semibold w-20 shrink-0">Stylist</span>
              <span className="font-medium text-foreground">{appt.staffName}</span>
            </div>
          )}
          {appt.appointmentDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-semibold w-20 shrink-0">Date</span>
              <span className="font-medium text-foreground">
                {format(new Date(appt.appointmentDate), "dd MMM yyyy")}
              </span>
            </div>
          )}
          {appt.notes && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{appt.notes}</p>
            </div>
          )}
        </div>

        {/* Change status */}
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Change Status</p>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.filter(s => s !== status).map(s => (
              <button key={s}
                className="px-2.5 py-1 rounded-full text-xs font-semibold border border-border hover:bg-muted transition-colors capitalize"
                onClick={() => { onStatusChange(id, s); onClose(); }}>
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={() => { onEdit(appt); onClose(); }}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => { onDelete(appt); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context Menu Portal (escapes overflow-hidden) ────────────────────────────
function ContextMenuPortal({ appt, serviceName, status, id, onView, onEdit, onDelete, onStatusChange, onClose, cardRef }: {
  appt: any; serviceName: string; status: string; id: string;
  onView: (a: any) => void; onEdit: (a: any) => void; onDelete: (a: any) => void;
  onStatusChange: (id: string, status: string) => void;
  onClose: () => void; cardRef: RefObject<HTMLDivElement>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      const menuW = 176;
      const left = r.left - menuW - 4;
      setPos({ top: r.top + window.scrollY, left: Math.max(4, left) });
    }
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return createPortal(
    <div ref={menuRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-border z-[9999] overflow-hidden"
      style={{ top: pos.top, left: pos.left, minWidth: 176 }}
      onClick={e => e.stopPropagation()}>
      <div className="px-3 py-2.5 border-b border-border/50 bg-gray-50">
        <p className="text-xs font-bold truncate">{appt.customerName || "Walk-in"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{serviceName}</p>
      </div>
      <div className="py-1">
        <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Change Status</p>
        {STATUS_OPTIONS.filter(s => s !== status).map(s => (
          <button key={s}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors capitalize"
            onClick={() => { onStatusChange(id, s); onClose(); }}>
            Mark as {s.replace("-", " ")}
          </button>
        ))}
        <div className="border-t border-border/50 my-1" />
        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
          onClick={() => { onView(appt); onClose(); }}>
          <Clock className="w-3 h-3" /> View Details
        </button>
        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
          onClick={() => { onEdit(appt); onClose(); }}>
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
          onClick={() => { onDelete(appt); onClose(); }}>
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Calendar Appointment Block ───────────────────────────────────────────────
function CalendarApptBlock({ appt, top, height, onEdit, onDelete, onStatusChange, onView }: {
  appt: any; top: number; height: number;
  onEdit: (a: any) => void; onDelete: (a: any) => void;
  onStatusChange: (id: string, status: string) => void;
  onView: (a: any) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const status = appt.status || "scheduled";
  const id = appt.id || appt._id;
  const endMin = timeToMinutes(appt.appointmentTime) + (appt.duration || 30);
  const startTimeStr = appt.appointmentTime
    ? format(new Date(2020, 0, 1, ...appt.appointmentTime.split(":").map(Number) as [number, number]), "h:mm a")
    : "";
  const endTimeStr = format(new Date(2020, 0, 1, Math.floor(endMin / 60), endMin % 60), "h:mm a");
  const serviceName = appt.services?.length > 0
    ? appt.services.map((s: any) => s.serviceName).join(", ")
    : appt.serviceName || "";

  const cardH = Math.max(height - 4, 32);
  const showService = cardH >= 44 && !!serviceName;
  const showPhone = cardH >= 72 && !!appt.customerPhone;

  return (
    <div ref={ref}
      className={`absolute left-1 right-1 rounded-lg border cursor-pointer shadow-sm hover:shadow-md hover:brightness-[0.97] transition-all z-[5] ${calBg[status] || calBg.scheduled}`}
      style={{ top: top + 2, height: cardH }}
      onClick={() => { if (!showMenu) onView(appt); }}
    >
      {/* Content — overflow-hidden only on inner div so menu can escape */}
      <div className={`h-full px-2 pt-1.5 pb-1 flex flex-col overflow-hidden rounded-lg ${calTextColor[status] || calTextColor.scheduled}`}>
        {/* Time + 3-dot button row */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className={`text-[12px] font-semibold leading-tight truncate ${calTimeColor[status] || calTimeColor.scheduled}`}>
            {startTimeStr}–{endTimeStr}
          </p>
          <button
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
            onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}
          >
            <MoreHorizontal className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        {/* Customer name */}
        <p className="text-[14px] font-bold leading-tight truncate">
          {appt.customerName || "Walk-in"}
        </p>

        {/* Service */}
        {showService && (
          <p className="text-[12px] leading-tight truncate opacity-75 mt-0.5">{serviceName}</p>
        )}

        {/* Phone */}
        {showPhone && (
          <p className="text-[11px] leading-tight truncate opacity-55 mt-0.5">{appt.customerPhone}</p>
        )}
      </div>

      {/* Context menu — outside inner div, uses fixed positioning to escape any overflow clipping */}
      {showMenu && (
        <ContextMenuPortal
          appt={appt}
          serviceName={serviceName}
          status={status}
          id={id}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onClose={() => setShowMenu(false)}
          cardRef={ref}
        />
      )}
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({ appointments, staff, selectedDate, onSlotClick, onEdit, onDelete, onStatusChange, onView, loading }: {
  appointments: any[]; staff: any[]; selectedDate: Date;
  onSlotClick: (staffId: string, minutes: number) => void;
  onEdit: (a: any) => void; onDelete: (a: any) => void;
  onStatusChange: (id: string, status: string) => void;
  onView: (a: any) => void;
  loading: boolean;
}) {
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  const [highlightedSlot, setHighlightedSlot] = useState<{ staffId: string; min: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 30000);
    return () => clearInterval(t);
  }, []);

  const isSelectedToday = isSameDay(selectedDate, new Date());
  const showNowLine = isSelectedToday && nowMin >= CAL_START && nowMin <= CAL_END;
  const nowTop = ((nowMin - CAL_START) / 30) * SLOT_HEIGHT;

  const slots = useMemo(() => Array.from({ length: TOTAL_SLOTS }, (_, i) => CAL_START + i * 30), []);

  const handleSlotClick = (staffId: string, min: number) => {
    setHighlightedSlot({ staffId, min });
    onSlotClick(staffId, min);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card border border-border/50 rounded-2xl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (!staff.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card border border-border/50 rounded-2xl">
        <div className="text-center">
          <User className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No staff members found</p>
          <p className="text-sm text-muted-foreground mt-1">Add staff to see the calendar view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card flex-1">
      {/* Staff header row */}
      <div className="flex border-b-2 border-border/50 bg-muted/30 shrink-0">
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0 border-r border-border/30 flex items-center justify-center">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {staff.map(s => {
          const id = s.id || s._id;
          const count = appointments.filter(a => {
            const aId = a.staffId?.toString?.() || a.staffId;
            return aId === id?.toString();
          }).length;
          return (
            <div key={id}
              className="flex-1 min-w-[140px] py-3 px-3 border-r border-border/30 flex flex-col items-start gap-0.5">
              <p className="text-sm font-bold text-foreground leading-tight">{s.name}</p>
              <span className="text-[11px] text-muted-foreground font-medium">
                {count > 0 ? `${count} appointment${count !== 1 ? "s" : ""}` : "No appointments"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div className="flex overflow-auto flex-1">
        {/* Time labels column — shows every 30-min slot */}
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0 border-r border-border/40 bg-gray-50/60">
          {slots.map(min => {
            const h = Math.floor(min / 60);
            const m = min % 60;
            const isHour = m === 0;
            return (
              <div key={min} style={{ height: SLOT_HEIGHT }}
                className={`flex items-start justify-end pr-3 pt-1.5 ${isHour ? "border-b border-border/50" : "border-b border-transparent"}`}>
                {isHour && (
                  <span className="whitespace-nowrap leading-tight text-[13px] font-semibold text-slate-600">
                    {format(new Date(2020, 0, 1, h, m), "h:mm a")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Staff columns + time indicator overlay */}
        <div className="flex flex-1 relative">
          {/* Current time line */}
          {showNowLine && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: nowTop }}>
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 -translate-x-1.5 shadow-sm" />
              <div className="flex-1 h-0.5 bg-red-500/70" />
            </div>
          )}

          {/* Individual staff columns */}
          {staff.map(s => {
            const staffId = s.id || s._id;
            const staffAppts = appointments.filter(a => {
              const aId = a.staffId?.toString?.() || a.staffId;
              return aId === staffId?.toString();
            });

            return (
              <div key={staffId} className="flex-1 min-w-[140px] border-r border-border/20 relative overflow-visible">
                {/* Slot background cells */}
                {slots.map(min => {
                  const isHighlighted = highlightedSlot?.staffId === staffId && highlightedSlot?.min === min;
                  return (
                    <div key={min} style={{ height: SLOT_HEIGHT }}
                      className={`cursor-pointer transition-colors group relative
                        ${min % 60 === 0 ? "border-b border-border/40" : "border-b border-transparent"}
                        ${isHighlighted ? "bg-primary/15 ring-1 ring-inset ring-primary/40" : "hover:bg-primary/5"}`}
                      onClick={() => handleSlotClick(staffId, min)}
                    >
                      {isHighlighted && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Plus className="w-4 h-4 text-primary/50" />
                        </div>
                      )}
                      {!isHighlighted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity h-full flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-primary/30" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Appointment blocks */}
                {staffAppts.map(appt => {
                  const apptMin = timeToMinutes(appt.appointmentTime);
                  if (apptMin < CAL_START || apptMin >= CAL_END) return null;
                  // Snap to hour boundaries (like Zenotti): card fills the full hour(s) it spans
                  const slotStart = Math.floor(apptMin / 60) * 60;
                  const apptEnd = apptMin + (appt.duration || 30);
                  const slotEnd = Math.ceil(apptEnd / 60) * 60;
                  const top = ((slotStart - CAL_START) / 30) * SLOT_HEIGHT;
                  const height = Math.max(((slotEnd - slotStart) / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 2);
                  return (
                    <CalendarApptBlock
                      key={appt.id || appt._id}
                      appt={appt} top={top} height={height}
                      onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onView={onView}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ calendarMonth, monthAppts, onDateClick, onViewAppt }: {
  calendarMonth: Date;
  monthAppts: any[];
  onDateClick: (d: Date) => void;
  onViewAppt: (a: any) => void;
}) {
  const start = startOfMonth(calendarMonth);
  const end = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start);

  const apptsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    monthAppts.forEach(a => {
      const d = a.appointmentDate;
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [monthAppts]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex-1 overflow-auto bg-card rounded-xl border border-border/50 flex flex-col">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border/40 shrink-0">
        {weekDays.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(110px, 1fr)" }}>
        {cells.map((day, i) => {
          if (!day) return (
            <div key={`pad-${i}`} className="border-r border-b border-border/20 bg-muted/10" />
          );

          const ds = format(day, "yyyy-MM-dd");
          const appts = apptsByDate[ds] || [];
          const today = isToday(day);
          const isCurrentMonth = true;

          return (
            <div key={ds}
              className={`border-r border-b border-border/20 p-1.5 flex flex-col gap-1 cursor-pointer transition-colors group
                ${today ? "bg-primary/5" : "hover:bg-muted/30"}`}
              onClick={() => onDateClick(day)}>

              {/* Date number */}
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full leading-none
                  ${today ? "bg-primary text-white" : "text-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                  {format(day, "d")}
                </span>
                {appts.length > 0 && (
                  <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 rounded-full px-1.5 py-0.5 leading-none">
                    {appts.length}
                  </span>
                )}
              </div>

              {/* Appointment mini-cards */}
              {appts.slice(0, 3).map(a => {
                const svc = a.services?.length > 0 ? a.services[0].serviceName : (a.serviceName || "");
                const status = a.status || "scheduled";
                return (
                  <div key={a.id || a._id}
                    className={`rounded-md px-2 py-1 border text-left transition-opacity hover:opacity-80 ${calBg[status] || calBg.scheduled} ${calTextColor[status] || calTextColor.scheduled}`}
                    onClick={e => { e.stopPropagation(); onViewAppt(a); }}>
                    <p className="text-[11px] font-bold leading-tight truncate">{a.customerName || "Walk-in"}</p>
                    {svc && <p className="text-[10px] leading-tight truncate opacity-70">{svc}</p>}
                  </div>
                );
              })}

              {appts.length > 3 && (
                <p className="text-[10px] text-primary font-semibold pl-1">+{appts.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const APPT_PAGE_SIZE = 10;

export default function Appointments() {
  const { toast } = useToast();
  const [view, setView] = useState<"calendar" | "list" | "month">("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalPanel, setShowCalPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [defaultBookingStaff, setDefaultBookingStaff] = useState("");
  const [defaultBookingTime, setDefaultBookingTime] = useState("");
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [deletingAppt, setDeletingAppt] = useState<any>(null);
  const [viewingAppt, setViewingAppt] = useState<any>(null);
  const [apptPage, setApptPage] = useState(1);

  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [monthAppts, setMonthAppts] = useState<any[]>([]);

  const { data: customersData } = useListCustomers();
  const { data: staffData } = useListStaff();
  const { data: servicesData } = useListServices();
  const [extraCustomers, setExtraCustomers] = useState<any[]>([]);

  const customers = [...(customersData?.customers || []), ...extraCustomers];
  const staff = (staffData as any)?.staff || [];
  const services = servicesData?.services || [];

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const monthStr = format(calendarMonth, "yyyy-MM");

  const fetchDayAppointments = async () => {
    setDayLoading(true);
    try {
      const res = await fetch(`${API_BASE}/appointments?date=${dateStr}`);
      const data = await res.json();
      setDayAppointments(data.appointments || []);
    } catch {
      toast({ title: "Failed to load appointments", variant: "destructive" });
    } finally {
      setDayLoading(false);
    }
  };

  const fetchMonthMarkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments?month=${monthStr}`);
      const data = await res.json();
      const appts = data.appointments || [];
      const dates = new Set<string>(appts.map((a: any) => a.appointmentDate));
      setMarkedDates(dates);
      setMonthAppts(appts);
    } catch {}
  };

  useEffect(() => { fetchDayAppointments(); }, [dateStr]);
  useEffect(() => { fetchMonthMarkers(); }, [monthStr]);

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    setCalendarMonth(d);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchDayAppointments();
      fetchMonthMarkers();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingAppt) return;
    try {
      await fetch(`${API_BASE}/appointments/${deletingAppt.id || deletingAppt._id}`, { method: "DELETE" });
      toast({ title: "Appointment deleted" });
      setDeletingAppt(null);
      fetchDayAppointments();
      fetchMonthMarkers();
    } catch {
      toast({ title: "Failed to delete appointment", variant: "destructive" });
    }
  };

  const handleSlotClick = (staffId: string, minutes: number) => {
    setDefaultBookingStaff(staffId);
    setDefaultBookingTime(minutesToTimeStr(minutes));
    setShowBookingModal(true);
  };

  const filtered = useMemo(() =>
    statusFilter === "all"
      ? dayAppointments
      : dayAppointments.filter(a => a.status === statusFilter),
    [dayAppointments, statusFilter]
  );

  useEffect(() => { setApptPage(1); }, [statusFilter, dayAppointments]);

  const totalApptPages = Math.max(1, Math.ceil(filtered.length / APPT_PAGE_SIZE));
  const paginatedAppts = filtered.slice((apptPage - 1) * APPT_PAGE_SIZE, apptPage * APPT_PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dayAppointments.length };
    STATUS_OPTIONS.forEach(s => { counts[s] = dayAppointments.filter(a => a.status === s).length; });
    return counts;
  }, [dayAppointments]);

  const isSelectedToday = isSameDay(selectedDate, new Date());

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Top Header Bar ── */}
      <div className="shrink-0 px-6 py-3 border-b border-border/50 bg-background flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-serif font-bold text-primary leading-tight">Appointments</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {format(selectedDate, "EEEE, dd MMMM yyyy")}
            {isSelectedToday && <span className="ml-1.5 text-primary font-semibold">· Today</span>}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-0.5">
          <button onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "calendar" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Day
          </button>
          <button onClick={() => { setView("month"); setCalendarMonth(selectedDate); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "month" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarIcon className="w-3.5 h-3.5" /> Month
          </button>
          <button onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "list" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>

        {/* Date navigation */}
        {view === "month" ? (
          <div className="flex items-center gap-1">
            <button onClick={() => setCalendarMonth(m => subMonths(m, 1))}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCalendarMonth(new Date())}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-colors">
              Today
            </button>
            <span className="text-sm font-bold min-w-[110px] text-center select-none">
              {format(calendarMonth, "MMM yyyy")}
            </span>
            <button onClick={() => setCalendarMonth(m => addMonths(m, 1))}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => handleSelectDate(subDays(selectedDate, 1))}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => handleSelectDate(new Date())}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${isSelectedToday ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
              Today
            </button>
            <span className="text-sm font-bold min-w-[110px] text-center select-none">
              {format(selectedDate, "dd MMM yyyy")}
            </span>
            <button onClick={() => handleSelectDate(addDays(selectedDate, 1))}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mini calendar toggle */}
        <button onClick={() => setShowCalPanel(p => !p)}
          title="Toggle mini calendar"
          className={`p-2 rounded-xl border transition-colors ${showCalPanel ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
          <CalendarIcon className="w-4 h-4" />
        </button>

        {/* Book button */}
        <button
          onClick={() => { setDefaultBookingStaff(""); setDefaultBookingTime(""); setShowBookingModal(true); }}
          className="bg-secondary text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20">
          <Plus className="w-4 h-4" /> Book
        </button>
      </div>

      {/* ── Main body ── */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* Mini calendar side panel */}
        {showCalPanel && (
          <div className="w-64 shrink-0 p-4 border-r border-border/50 overflow-y-auto space-y-4 bg-background">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              calendarMonth={calendarMonth}
              onChangeMonth={setCalendarMonth}
              markedDates={markedDates}
            />
            {/* Legend */}
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legend</p>
              {STATUS_OPTIONS.map(s => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${legendDotColors[s] || "bg-gray-400"}`} />
                  <span className="capitalize text-muted-foreground">{s.replace("-", " ")}</span>
                </div>
              ))}
            </div>
            {/* Day summary */}
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Day Summary</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{dayAppointments.length}</span>
                </div>
                {STATUS_OPTIONS.map(s => statusCounts[s] > 0 && (
                  <div key={s} className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{s.replace("-", " ")}</span>
                    <span className={`font-semibold ${statusColors[s]?.split(" ")[1] || ""}`}>{statusCounts[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar / List view */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">

          {view === "month" ? (
            <MonthView
              calendarMonth={calendarMonth}
              monthAppts={monthAppts}
              onDateClick={d => { handleSelectDate(d); setView("calendar"); }}
              onViewAppt={setViewingAppt}
            />
          ) : view === "calendar" ? (
            <>
            <CalendarGrid
              appointments={dayAppointments}
              staff={staff}
              selectedDate={selectedDate}
              onSlotClick={handleSlotClick}
              onEdit={setEditingAppt}
              onDelete={setDeletingAppt}
              onStatusChange={handleStatusChange}
              onView={setViewingAppt}
              loading={dayLoading}
            />
            {/* ── Bottom Stats Bar (Zenotti-style) ── */}
            {!dayLoading && (
              <div className="shrink-0 bg-card border border-border/50 rounded-xl px-5 py-2.5 flex items-center gap-6 flex-wrap text-xs">
                {(() => {
                  const totalGuests = new Set(dayAppointments.filter(a => a.customerId).map(a => a.customerId)).size;
                  const totalAppts = dayAppointments.length;
                  const openAppts = dayAppointments.filter(a => a.status === "scheduled" || a.status === "in-progress").length;
                  const completedAppts = dayAppointments.filter(a => a.status === "completed").length;
                  const cancelledAppts = dayAppointments.filter(a => a.status === "cancelled").length;
                  const bookedPct = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0;
                  const items = [
                    { label: "Total guests", value: totalGuests },
                    { label: "Total appts", value: totalAppts },
                    { label: "Open appts", value: openAppts },
                    { label: "Completed", value: completedAppts },
                    { label: "Cancelled", value: cancelledAppts },
                    { label: "Booked", value: `${bookedPct}%` },
                    { label: "Staff on duty", value: staff.length },
                  ];
                  return items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">{item.label}:</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                      {i < items.length - 1 && <span className="ml-3 text-border">|</span>}
                    </div>
                  ));
                })()}
              </div>
            )}
            </>
          ) : (
            /* ── List view ── */
            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Status filter tabs */}
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                {["all", ...STATUS_OPTIONS].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${statusFilter === s ? "bg-primary text-white border-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                    {s === "all" ? "All" : s} ({statusCounts[s] || 0})
                  </button>
                ))}
              </div>

              {dayLoading ? (
                <div className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground bg-card border border-border/50 rounded-2xl">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm">Loading appointments...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 bg-card rounded-2xl border border-border/50 text-center px-4">
                  <CalendarIcon className="w-14 h-14 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-base font-semibold text-muted-foreground">
                    {statusFilter === "all" ? "No appointments for this day" : `No ${statusFilter} appointments`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {statusFilter === "all" ? 'Click "Book" to schedule one.' : "Try a different filter."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedAppts.map(appt => (
                      <AppointmentCard
                        key={appt.id || appt._id}
                        appt={appt}
                        onStatusChange={handleStatusChange}
                        onEdit={setEditingAppt}
                        onDelete={setDeletingAppt}
                      />
                    ))}
                  </div>
                  {totalApptPages > 1 && (
                    <div className="mt-4 flex flex-wrap justify-between items-center gap-3 text-sm text-muted-foreground bg-card border border-border/50 rounded-2xl px-5 py-3">
                      <span>Showing {Math.min((apptPage - 1) * APPT_PAGE_SIZE + 1, filtered.length)}–{Math.min(apptPage * APPT_PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setApptPage(1)} disabled={apptPage === 1}
                          className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">«</button>
                        <button onClick={() => setApptPage(p => Math.max(1, p - 1))} disabled={apptPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">‹</button>
                        {Array.from({ length: totalApptPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalApptPages || Math.abs(p - apptPage) <= 1)
                          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                            acc.push(p); return acc;
                          }, [])
                          .map((p, i) => p === "..." ? (
                            <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                          ) : (
                            <button key={p} onClick={() => setApptPage(p as number)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${apptPage === p ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>
                              {p}
                            </button>
                          ))}
                        <button onClick={() => setApptPage(p => Math.min(totalApptPages, p + 1))} disabled={apptPage === totalApptPages}
                          className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">›</button>
                        <button onClick={() => setApptPage(totalApptPages)} disabled={apptPage === totalApptPages}
                          className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">»</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Appointment Detail Modal ── */}
      {viewingAppt && (
        <ApptDetailModal
          appt={viewingAppt}
          onClose={() => setViewingAppt(null)}
          onEdit={a => { setViewingAppt(null); setEditingAppt(a); }}
          onDelete={a => { setViewingAppt(null); setDeletingAppt(a); }}
          onStatusChange={(id, status) => { handleStatusChange(id, status); setViewingAppt(null); }}
        />
      )}

      {/* ── Modals ── */}
      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            toast({ title: "Appointment booked!", description: "Successfully scheduled." });
            fetchDayAppointments();
            fetchMonthMarkers();
          }}
          customers={customers}
          staff={staff}
          services={services}
          defaultDate={selectedDate}
          defaultStaffId={defaultBookingStaff}
          defaultTime={defaultBookingTime}
        />
      )}

      {editingAppt && (
        <EditModal
          appt={editingAppt}
          onClose={() => setEditingAppt(null)}
          onSuccess={() => {
            toast({ title: "Appointment updated" });
            fetchDayAppointments();
            fetchMonthMarkers();
          }}
          customers={customers}
          staff={staff}
          services={services}
        />
      )}

      {deletingAppt && (
        <DeleteConfirm
          appt={deletingAppt}
          onClose={() => setDeletingAppt(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
