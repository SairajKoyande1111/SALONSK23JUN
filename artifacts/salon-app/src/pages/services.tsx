import { useState, useRef, useEffect } from "react";
import { useListServices, useCreateService } from "@workspace/api-client-react";
import { Plus, IndianRupee, X, Search, ChevronDown, Tag, Upload, Download, Users, Pencil, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type TypeVariant = { name: string; price: number; memberDiscount: number; memberPrice: number };

const EMPTY_VARIANT: TypeVariant = { name: "", price: 0, memberDiscount: 20, memberPrice: 0 };

const EMPTY_FORM = {
  name: "",
  category: "",
  types: [] as TypeVariant[],
  price: 0,
  memberDiscount: 20,
  memberPrice: 0,
};

type ServiceForm = typeof EMPTY_FORM;

// ── SearchableDropdown ─────────────────────────────────────
function SearchableDropdown({
  label,
  options,
  value,
  onSelect,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newInput, setNewInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (opt: string) => {
    setSearch(opt);
    onSelect(opt);
    setOpen(false);
    setShowNew(false);
  };

  const handleAdd = () => {
    if (!newInput.trim()) return;
    handleSelect(newInput.trim());
    setNewInput("");
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="relative" ref={ref}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          placeholder={placeholder || "Search or select..."}
          className="w-full pl-9 pr-10 p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); onSelect(e.target.value); }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        {open && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 && !search ? (
                <p className="p-3 text-sm text-muted-foreground text-center">No options yet</p>
              ) : filtered.length === 0 ? null : (
                filtered.map(opt => (
                  <button key={opt} type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors font-medium"
                    onClick={() => handleSelect(opt)}
                  >{opt}</button>
                ))
              )}
            </div>
            <div className="border-t border-border/50">
              {!showNew ? (
                <button type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2"
                  onClick={() => { setShowNew(true); setNewInput(search); }}
                >
                  <Plus className="w-4 h-4" /> Add new {label.replace(" *", "").toLowerCase()}
                </button>
              ) : (
                <div className="p-3 flex gap-2">
                  <input autoFocus
                    placeholder={`New ${label.replace(" *", "").toLowerCase()} name...`}
                    className="flex-1 p-2 rounded-lg border text-sm bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20"
                    value={newInput}
                    onChange={e => setNewInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                  />
                  <button type="button" onClick={handleAdd}
                    className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TypeVariantRow ─────────────────────────────────────────
function TypeVariantRow({ variant, onChange, onRemove, index }: {
  variant: TypeVariant;
  onChange: (v: TypeVariant) => void;
  onRemove: () => void;
  index: number;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium w-5 shrink-0">{index + 1}.</span>
        <input required placeholder="Type name (e.g. Short, Medium...)"
          className="flex-1 p-2 rounded-lg border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          value={variant.name}
          onChange={e => onChange({ ...variant, name: e.target.value })}
        />
        <div className="flex items-center gap-1 shrink-0">
          <label className="text-[10px] font-medium text-muted-foreground">₹</label>
          <input type="number" required min="0" placeholder="0"
            className="w-24 p-2 rounded-lg border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            value={variant.price || ""}
            onChange={e => onChange({ ...variant, price: Number(e.target.value), memberPrice: 0, memberDiscount: 0 })}
          />
        </div>
        <button type="button" onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── ServiceModal ───────────────────────────────────────────
function ServiceModal({
  title,
  form,
  setForm,
  onSubmit,
  onClose,
  isPending,
  allCategories,
}: {
  title: string;
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  allCategories: string[];
}) {
  const safeTypes = Array.isArray(form.types) ? form.types : [];

  const setPrice = (val: number) => {
    const mp = val > 0 ? Math.round(val * (1 - form.memberDiscount / 100)) : 0;
    setForm(f => ({ ...f, price: val, memberPrice: mp }));
  };
  const setMemberDiscount = (val: number) => {
    const mp = form.price > 0 ? Math.round(form.price * (1 - val / 100)) : 0;
    setForm(f => ({ ...f, memberDiscount: val, memberPrice: mp }));
  };
  const setMemberPrice = (val: number) => {
    const disc = form.price > 0 ? Math.round(((form.price - val) / form.price) * 100) : 0;
    setForm(f => ({ ...f, memberPrice: val, memberDiscount: disc }));
  };

  const addVariant = () => setForm(f => ({ ...f, types: [...(Array.isArray(f.types) ? f.types : []), { ...EMPTY_VARIANT }] }));
  const removeVariant = (i: number) => setForm(f => ({ ...f, types: f.types.filter((_, idx) => idx !== i) }));
  const updateVariant = (i: number, v: TypeVariant) => setForm(f => {
    const types = [...f.types];
    types[i] = v;
    return { ...f, types };
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl p-8 w-full max-w-lg shadow-2xl shadow-black/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-primary">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Service Name *</label>
            <input required autoFocus placeholder="e.g. Classic Wash - Loreal"
              className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <SearchableDropdown label="Category *" options={allCategories} value={form.category}
            onSelect={v => setForm(f => ({ ...f, category: v }))} placeholder="Search category..." />

          {/* Type Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Type Variants</label>
              <button type="button" onClick={addVariant}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Type
              </button>
            </div>

            {safeTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                No variants — click "Add Type" to create price variants (e.g. Short, Medium, Long).
              </p>
            ) : (
              <div className="space-y-2">
                {safeTypes.map((v, i) => (
                  <TypeVariantRow key={i} index={i} variant={v}
                    onChange={nv => updateVariant(i, nv)}
                    onRemove={() => removeVariant(i)} />
                ))}
              </div>
            )}
          </div>


          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50">
              {isPending ? "Saving..." : "Save Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Services() {
  const { data, isLoading, refetch } = useListServices();
  const createService = useCreateService();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ServiceForm>({ ...EMPTY_FORM });

  const [editService, setEditService] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>({ ...EMPTY_FORM });
  const [editPending, setEditPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [stylistStats, setStylistStats] = useState<Record<string, { staffId: string; staffName: string; count: number }>>({});

  useEffect(() => {
    fetch("/api/service-stylist-stats").then(r => r.json()).then(d => setStylistStats(d.stats || {})).catch(() => {});
  }, []);

  const allCategories: string[] = data?.categories || [];
  const displayCategories = ["All", ...allCategories];

  const services = data?.services || [];
  const filtered = services.filter((s: any) => {
    const matchSearch = !searchFilter || s.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach((s: any) => {
    const cat = s.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.category.trim()) {
      toast({ title: "Please select or add a category", variant: "destructive" });
      return;
    }
    createService.mutate({ data: addForm as any }, {
      onSuccess: () => {
        toast({ title: "Service added" });
        setShowAdd(false);
        setAddForm({ ...EMPTY_FORM });
        refetch();
      },
      onError: () => toast({ title: "Failed to add service", variant: "destructive" }),
    });
  };

  const openEdit = (s: any) => {
    setEditService(s);
    setEditForm({
      name: s.name,
      category: s.category,
      types: Array.isArray(s.types) ? s.types : [],
      price: s.price ?? 0,
      memberDiscount: s.memberDiscount ?? 20,
      memberPrice: s.memberPrice ?? Math.round((s.price ?? 0) * 0.8),
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.category.trim()) {
      toast({ title: "Please select or add a category", variant: "destructive" });
      return;
    }
    setEditPending(true);
    try {
      const res = await fetch(`/api/services/${editService.id || editService._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Service updated" });
      setEditService(null);
      refetch();
    } catch {
      toast({ title: "Failed to update service", variant: "destructive" });
    } finally {
      setEditPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/services/${deleteTarget.id || deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Service deleted" });
      setDeleteTarget(null);
      refetch();
    } catch {
      toast({ title: "Failed to delete service", variant: "destructive" });
    } finally {
      setDeletePending(false);
    }
  };

  const handleExport = () => {
    const rows: any[] = [];
    filtered.forEach((s: any) => {
      const variants: TypeVariant[] = Array.isArray(s.types) ? s.types : [];
      if (variants.length > 0) {
        variants.forEach(v => {
          rows.push({
            "Name": s.name,
            "Category": s.category,
            "Type": v.name,
            "Price (₹)": v.price,
            "Member Discount (%)": v.memberDiscount,
            "Price for Members (₹)": v.memberPrice,
          });
        });
      } else {
        rows.push({
          "Name": s.name,
          "Category": s.category,
          "Type": "",
          "Price (₹)": s.price,
          "Member Discount (%)": s.memberDiscount ?? 20,
          "Price for Members (₹)": s.memberPrice ?? Math.round(s.price * 0.8),
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Services");
    XLSX.writeFile(wb, `services_${categoryFilter.replace(/\s+/g, "_").toLowerCase()}.xlsx`);
    toast({ title: "Excel file downloaded" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) { toast({ title: "No data found in file", variant: "destructive" }); return; }

        // Group rows by (Name + Category) to build services with type variants
        const serviceMap = new Map<string, { name: string; category: string; variants: TypeVariant[] }>();
        for (const row of rows) {
          const name = String(row["Name"] || row["name"] || "").trim();
          const category = String(row["Category"] || row["category"] || "").trim();
          const typeName = String(row["Type"] || row["type"] || "").trim();
          const price = Number(row["Price (₹)"] || row["price"] || 0);
          const memberDiscount = Number(row["Member Discount (%)"] || row["memberDiscount"] || 20);
          const memberPrice = Number(row["Price for Members (₹)"] || row["memberPrice"] || Math.round(price * (1 - memberDiscount / 100)));
          if (!name || !category) continue;
          const key = `${name}|||${category}`;
          if (!serviceMap.has(key)) serviceMap.set(key, { name, category, variants: [] });
          if (typeName) {
            serviceMap.get(key)!.variants.push({ name: typeName, price, memberDiscount, memberPrice });
          } else {
            // No type — store as base price (no variants)
            serviceMap.get(key)!.variants = [];
            const svc = serviceMap.get(key)!;
            (svc as any).price = price;
            (svc as any).memberDiscount = memberDiscount;
            (svc as any).memberPrice = memberPrice;
          }
        }

        let success = 0, failed = 0;
        for (const svc of serviceMap.values()) {
          const payload: any = {
            name: svc.name,
            category: svc.category,
            types: svc.variants,
            price: (svc as any).price ?? 0,
            memberDiscount: (svc as any).memberDiscount ?? 20,
            memberPrice: (svc as any).memberPrice ?? 0,
          };
          try {
            await new Promise<void>((resolve, reject) => {
              createService.mutate(
                { data: payload },
                { onSuccess: () => resolve(), onError: () => reject() }
              );
            });
            success++;
          } catch { failed++; }
        }
        toast({ title: `Import complete: ${success} added${failed ? `, ${failed} skipped` : ""}` });
        refetch();
      } catch {
        toast({ title: "Failed to read Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Services Menu</h1>
          <p className="text-muted-foreground mt-1">Manage your service catalog and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted font-medium text-sm transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => setShowAdd(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Service
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search services..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border bg-card shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium text-foreground cursor-pointer min-w-[180px]"
          >
            {displayCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-card rounded-2xl p-6 border border-border/50 h-36 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Tag className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No services found</p>
          <p className="text-sm mt-1">Try adjusting filters or add a new service</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
          {filtered.map((s: any) => {
            const variants: TypeVariant[] = Array.isArray(s.types) ? s.types : [];
            const memberPrice = s.memberPrice ?? Math.round(s.price * 0.8);
            const memberDiscount = s.memberDiscount ?? 20;
            const cat = s.category || "Other";
            return (
              <div key={s.id || s._id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group relative">
                {/* Category badge */}
                <div className="mb-2">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/8 px-2.5 py-0.5 rounded-full border border-primary/20">
                    {cat}
                  </span>
                </div>

                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight pr-14 mb-2">{s.name}</h3>

                {(() => {
                  const topStylist = stylistStats[s.name];
                  if (!topStylist?.staffName) return null;
                  return (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 truncate">
                        {topStylist.staffName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">· {topStylist.count}×</span>
                    </div>
                  );
                })()}

                {variants.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenCards(prev => ({ ...prev, [s.id || s._id]: !prev[s.id || s._id] }))}
                      className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground border border-border/60 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <span>{variants.length} type{variants.length !== 1 ? "s" : ""}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCards[s.id || s._id] ? "rotate-180" : ""}`} />
                    </button>
                    {openCards[s.id || s._id] && (
                      <div className="mt-2 border border-border/40 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-muted/40">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-right">Price</span>
                        </div>
                        {variants.map((v: TypeVariant, vi: number) => (
                          <div key={v.name} className={`grid grid-cols-2 gap-1 items-center px-3 py-1.5 ${vi % 2 === 0 ? "" : "bg-muted/20"}`}>
                            <span className="text-xs font-medium text-foreground truncate">{v.name}</span>
                            <div className="flex items-center justify-end gap-0.5 text-primary font-bold text-xs">
                              <IndianRupee className="w-3 h-3 shrink-0" />{v.price.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Regular</span>
                      <div className="flex items-center gap-0.5 text-primary font-bold">
                        <IndianRupee className="w-3.5 h-3.5 shrink-0" />{s.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <Users className="w-3 h-3 shrink-0" /> Members ({memberDiscount}% off)
                      </div>
                      <div className="flex items-center gap-0.5 text-emerald-600 font-semibold text-sm">
                        <IndianRupee className="w-3.5 h-3.5 shrink-0" />{memberPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg bg-card border border-border/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors shadow-sm"
                    title="Edit service">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg bg-card border border-border/60 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm"
                    title="Delete service">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <ServiceModal
          title="New Service"
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleCreate}
          onClose={() => { setShowAdd(false); setAddForm({ ...EMPTY_FORM }); }}
          isPending={createService.isPending}
          allCategories={allCategories}
        />
      )}

      {editService && (
        <ServiceModal
          title="Edit Service"
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleEdit}
          onClose={() => setEditService(null)}
          isPending={editPending}
          allCategories={allCategories}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-2xl p-7 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete Service</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6 ml-13">
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border hover:bg-muted font-medium transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deletePending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors text-sm disabled:opacity-50">
                {deletePending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
