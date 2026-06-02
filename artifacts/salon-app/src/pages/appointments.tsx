import { useState, useRef, useEffect, useMemo } from "react";
import {
  useListCustomers, useListStaff, useListServices,
  useCreateAppointment,
} from "@workspace/api-client-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isToday, isSameDay,
} from "date-fns";
import {
  Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Plus, X,
  Search, UserPlus, Pencil, Trash2, Clock, Filter,
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
function AddCustomerModal({ onClose, onSaved }: {
  onClose: () => void; onSaved: (customer: any) => void;
}) {
  type FM = { name: string; phone: string; gender: string; dob: string; anniversary: string };
  const EMPTY_FM: FM = { name: "", phone: "", gender: "", dob: "", anniversary: "" };

  const [form, setForm] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", membershipId: "", membershipStartDate: "" });
  const [phoneError, setPhoneError] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(form.phone)) return;
    setSaving(true);
    try {
      const validFM = familyMembers.filter(m => m.name.trim());
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, dob: form.dob, anniversary: form.anniversary, gender: form.gender, email: "", familyMembers: validFM }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPhoneError(err.error || "Failed to save. Try again.");
        return;
      }
      const created = await res.json();
      if (form.membershipId) {
        const today = new Date().toISOString().slice(0, 10);
        await fetch(`${API_BASE}/customer-memberships`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: created.id || created._id, membershipId: form.membershipId, startDate: form.membershipStartDate || today }),
        }).catch(() => {});
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
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Full Name *</label>
            <input required autoFocus placeholder="Enter full name"
              className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
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
            <input required type="tel" maxLength={10} placeholder="10-digit mobile number"
              className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${phoneError ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
              value={form.phone}
              onChange={e => { const v = e.target.value.replace(/\D/g, ""); setForm({ ...form, phone: v }); if (v.length === 10) setPhoneError(""); }}
              onBlur={e => validatePhone(e.target.value)} />
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Date of Birth</label>
              <input type="date"
                className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary</label>
              <input type="date"
                className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.anniversary} onChange={e => setForm({ ...form, anniversary: e.target.value })} />
            </div>
          </div>

          {/* Membership */}
          {memberships.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Membership Plan (optional)</label>
              <select
                value={form.membershipId}
                onChange={e => setForm({ ...form, membershipId: e.target.value })}
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

          {/* Family Members */}
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setShowFamilySection(!showFamilySection)}
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
                    <input type="text" required placeholder="Name *" value={fm.name}
                      onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, name: e.target.value } : x))}
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="tel" placeholder="Phone" value={fm.phone} maxLength={10}
                        onChange={e => setFamilyMembers(prev => prev.map((x, ii) => ii === i ? { ...x, phone: e.target.value.replace(/\D/g, "").slice(0, 10) } : x))}
                        className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
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
                <button type="button"
                  onClick={() => setFamilyMembers(prev => [...prev, { ...EMPTY_FM }])}
                  className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Family Member
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
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
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}>
                Walk-in
              </button>
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
        <button onClick={() => onChangeMonth(subMonths(calendarMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold">{format(calendarMonth, "MMMM yyyy")}</span>
        <button onClick={() => onChangeMonth(addMonths(calendarMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors">
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
                  ${isSelected
                    ? "bg-primary text-white shadow-sm"
                    : today
                    ? "border-2 border-primary text-primary font-bold"
                    : "hover:bg-muted text-foreground"
                  }`}
              >
                {format(day, "d")}
              </button>
              {hasAppts && (
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white/80" : "bg-primary"}`} />
              )}
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

// ─── Appointment Card ─────────────────────────────────────────────────────────
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
            {appt.customerPhone && (
              <span className="text-xs text-muted-foreground font-mono">{appt.customerPhone}</span>
            )}
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
            <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2 py-1 inline-block">
              {appt.notes}
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[appt.status] || ""}`}>
            {appt.status}
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={appt.status}
              onChange={e => onStatusChange(appt.id || appt._id, e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={() => onEdit(appt)}
              title="Edit"
              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(appt)}
              title="Delete"
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
// selectedServices: [{id, name}] where name may include variant (e.g. "Hair Cut — Short")
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
  const filtered = searchText
    ? available.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()))
    : available;

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
      // Service has variants — let the parent show the picker
      onVariantNeeded(svc);
      setSearchText("");
      setPendingId("");
    } else {
      // No variants — add directly
      onChange([...selectedServices, { id: pendingId, name: svc?.name || searchText }]);
      setSearchText("");
      setPendingId("");
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

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    setPendingId("");
    setShowDropdown(true);
  };

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
          <input
            ref={inputRef}
            type="text"
            placeholder="Search service..."
            value={searchText}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
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
          {pendingSvc && Array.isArray(pendingSvc.types) && pendingSvc.types.filter((t: any) => t.name).length > 0 && onVariantNeeded
            ? "Pick Variant"
            : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Booking Modal (new appointment) ─────────────────────────────────────────
function BookingModal({ onClose, onSuccess, customers: initialCustomers, staff, services, defaultDate }: any) {
  const createAppointment = useCreateAppointment();
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string }[]>([]);
  const [variantPicker, setVariantPicker] = useState<any | null>(null);
  const [form, setForm] = useState({
    customerId: "", staffId: "",
    appointmentDate: format(defaultDate || new Date(), "yyyy-MM-dd"),
    appointmentTime: "", notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePickVariant = (svc: any, variantName: string, _variantPrice: number) => {
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
              customers={customers} onCustomerCreated={(c) => setExtraCustomers((prev) => [c, ...prev])} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Services * {selectedServices.length > 0 && <span className="text-primary normal-case font-normal">({selectedServices.length} selected)</span>}
            </label>
            <MultiServiceSelect
              selectedServices={selectedServices}
              onChange={setSelectedServices}
              services={services}
              onVariantNeeded={(svc) => setVariantPicker(svc)}
            />
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

    {/* Variant Picker Popup */}
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
                <button key={v.name} type="button"
                  disabled={alreadyAdded}
                  onClick={() => handlePickVariant(variantPicker, v.name, Number(v.price) || 0)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors border ${
                    alreadyAdded ? "opacity-40 cursor-not-allowed bg-muted border-border" : "bg-background hover:bg-primary/5 border-border hover:border-primary/30"
                  }`}>
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

  // Initialise selectedServices from existing appt.services (which have serviceName) or fall back to IDs only
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
              customers={customers} onCustomerCreated={(c) => setExtraCustomers((prev) => [c, ...prev])} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Services * {selectedServices.length > 0 && <span className="text-primary normal-case font-normal">({selectedServices.length} selected)</span>}
            </label>
            <MultiServiceSelect
              selectedServices={selectedServices}
              onChange={setSelectedServices}
              services={services}
              onVariantNeeded={(svc) => setVariantPicker(svc)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Staff *</label>
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
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
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
                <button key={v.name} type="button"
                  disabled={alreadyAdded}
                  onClick={() => handlePickVariant(variantPicker, v.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors border ${
                    alreadyAdded ? "opacity-40 cursor-not-allowed bg-muted border-border" : "bg-background hover:bg-primary/5 border-border hover:border-primary/30"
                  }`}>
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
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-medium hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

const APPT_PAGE_SIZE = 10;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Appointments() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [deletingAppt, setDeletingAppt] = useState<any>(null);
  const [apptPage, setApptPage] = useState(1);

  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());

  const { data: customersData } = useListCustomers();
  const { data: staffData } = useListStaff();
  const { data: servicesData } = useListServices();
  const [extraCustomers, setExtraCustomers] = useState<any[]>([]);

  const customers = [...(customersData?.customers || []), ...extraCustomers];
  const staff = (staffData as any)?.staff || [];
  const services = servicesData?.services || [];

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const monthStr = format(calendarMonth, "yyyy-MM");

  // Fetch day appointments
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

  // Fetch month appointments for calendar dots
  const fetchMonthMarkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments?month=${monthStr}`);
      const data = await res.json();
      const dates = new Set<string>((data.appointments || []).map((a: any) => a.appointmentDate));
      setMarkedDates(dates);
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

  const isToday2 = isSameDay(selectedDate, new Date());

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Appointments</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Schedule and manage client appointments.</p>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="bg-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 flex items-center gap-2"
          style={{ fontFamily: "'Poppins', sans-serif" }}>
          <Plus className="w-5 h-5" /> Book Appointment
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left — Mini Calendar */}
        <div className="w-64 shrink-0 space-y-4">
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
        </div>

        {/* Right — Appointment List */}
        <div className="flex-1 min-w-0">
          {/* Date Header */}
          <div className="bg-card border border-border/50 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="font-bold text-base">{format(selectedDate, "EEEE, dd MMMM yyyy")}</p>
                {isToday2 && <p className="text-xs text-primary font-semibold">Today</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleSelectDate(new Date(selectedDate.getTime() - 86400000))}
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => handleSelectDate(new Date())}
                className="px-3 py-2 text-xs rounded-xl border border-border hover:bg-muted transition-colors font-medium">
                Today
              </button>
              <button onClick={() => handleSelectDate(new Date(selectedDate.getTime() + 86400000))}
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            {["all", ...STATUS_OPTIONS].map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border
                  ${statusFilter === s
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}>
                {s === "all" ? "All" : s} ({statusCounts[s] || 0})
              </button>
            ))}
          </div>

          {/* Appointments */}
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
                {statusFilter === "all"
                  ? 'Click "Book Appointment" to schedule one.'
                  : `Try a different filter or book a new appointment.`}
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
      </div>

      {/* Modals */}
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
