import { useState, useRef, useEffect } from "react";
import { useListServices, useCreateService } from "@workspace/api-client-react";
import { Plus, IndianRupee, X, Search, ChevronDown, Tag, Upload, Download, Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const EMPTY_FORM = {
  name: "",
  category: "",
  type: "",
  price: 0,
  memberDiscount: 20,
  memberPrice: 0,
};

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

type ServiceForm = typeof EMPTY_FORM;

function ServiceModal({
  title,
  form,
  setForm,
  onSubmit,
  onClose,
  isPending,
  allCategories,
  allTypes,
}: {
  title: string;
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  allCategories: string[];
  allTypes: string[];
}) {
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
            <input required autoFocus placeholder="e.g. Deep Conditioning"
              className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <SearchableDropdown label="Category *" options={allCategories} value={form.category}
            onSelect={v => setForm(f => ({ ...f, category: v }))} placeholder="Search category..." />
          <SearchableDropdown label="Type" options={allTypes} value={form.type}
            onSelect={v => setForm(f => ({ ...f, type: v }))} placeholder="e.g. Basic, Premium..." />

          <div>
            <label className="block text-sm font-medium mb-1.5">Price (₹) *</label>
            <input type="number" required min="0" placeholder="0"
              className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.price || ""}
              onChange={e => setPrice(Number(e.target.value))}
            />
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Member Pricing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Member Discount (%)</label>
                <input type="number" min="0" max="100" placeholder="20"
                  className="w-full p-3 rounded-xl border bg-white dark:bg-muted/30 focus:ring-2 focus:ring-emerald-400/30 outline-none text-sm"
                  value={form.memberDiscount === 0 ? "" : form.memberDiscount}
                  onChange={e => setMemberDiscount(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Price for Members (₹)</label>
                <input type="number" min="0" placeholder="auto"
                  className="w-full p-3 rounded-xl border bg-white dark:bg-muted/30 focus:ring-2 focus:ring-emerald-400/30 outline-none text-sm"
                  value={form.memberPrice === 0 ? "" : form.memberPrice}
                  onChange={e => setMemberPrice(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            {form.price > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Members save ₹{(form.price - form.memberPrice).toLocaleString()} ({form.memberDiscount}% off the regular price)
              </p>
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

  const allCategories: string[] = data?.categories || [];
  const allTypes: string[] = (data as any)?.types || [];
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
    createService.mutate({ data: addForm }, {
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
      type: s.type || "",
      price: s.price,
      memberDiscount: s.memberDiscount ?? 20,
      memberPrice: s.memberPrice ?? Math.round(s.price * 0.8),
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
    const rows = filtered.map((s: any) => ({
      "Name": s.name,
      "Category": s.category,
      "Type": s.type || "",
      "Price (₹)": s.price,
      "Member Discount (%)": s.memberDiscount ?? 20,
      "Price for Members (₹)": s.memberPrice ?? Math.round(s.price * 0.8),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, categoryFilter === "All" ? "All Services" : categoryFilter.slice(0, 31));
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
        let success = 0, failed = 0;
        for (const row of rows) {
          const name = row["Name"] || row["name"] || "";
          const category = row["Category"] || row["category"] || "";
          const type = row["Type"] || row["type"] || "";
          const price = Number(row["Price (₹)"] || row["price"] || 0);
          const memberDiscount = Number(row["Member Discount (%)"] || row["memberDiscount"] || 20);
          const memberPrice = Number(row["Price for Members (₹)"] || row["memberPrice"] || Math.round(price * (1 - memberDiscount / 100)));
          if (!name || !category || price < 0) { failed++; continue; }
          try {
            await new Promise<void>((resolve, reject) => {
              createService.mutate(
                { data: { name, category, type, price, memberDiscount, memberPrice } },
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
        <div className="flex gap-2 flex-wrap">
          {displayCategories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                categoryFilter === cat
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-primary"
              }`}>
              {cat}
            </button>
          ))}
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
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70 bg-primary/8 px-3 py-1 rounded-full border border-primary/20">{cat}</span>
                <span className="text-xs text-muted-foreground">{items.length} service{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((s: any) => {
                  const memberPrice = s.memberPrice ?? Math.round(s.price * 0.8);
                  const memberDiscount = s.memberDiscount ?? 20;
                  return (
                    <div key={s.id || s._id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group relative">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight pr-2">{s.name}</h3>
                        {s.type && (
                          <span className="text-[10px] font-semibold bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full shrink-0 border border-secondary/30">{s.type}</span>
                        )}
                      </div>
                      <div className="border-t border-border/50 pt-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Regular</span>
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <IndianRupee className="w-3.5 h-3.5" /> {s.price.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <Users className="w-3 h-3" /> Members ({memberDiscount}% off)
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
                            <IndianRupee className="w-3.5 h-3.5" /> {memberPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg bg-card border border-border/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors shadow-sm"
                          title="Edit service"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg bg-card border border-border/60 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm"
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
          allTypes={allTypes}
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
          allTypes={allTypes}
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
