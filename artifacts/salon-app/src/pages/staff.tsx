import { useState } from "react";
import { useListStaff, useCreateStaff } from "@workspace/api-client-react";
import { Plus, Phone, X, Briefcase, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const poppins = { fontFamily: "'Poppins', sans-serif" };

const EMPTY_FORM = { name: "", specialization: "Hair Stylist", commissionPercent: 10, phone: "" };

export default function Staff() {
  const { data, isLoading, refetch } = useListStaff();
  const createStaff = useCreateStaff();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [editStaff, setEditStaff] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", specialization: "", commissionPercent: 10, phone: "" });
  const [saving, setSaving] = useState(false);

  const [deleteStaff, setDeleteStaff] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Staff Member Added" });
        setShowAdd(false);
        setFormData({ ...EMPTY_FORM });
        refetch();
      }
    });
  };

  const openEdit = (s: any) => {
    setEditStaff(s);
    setEditForm({
      name: s.name || "",
      specialization: s.specialization || "",
      commissionPercent: s.commissionPercent ?? 10,
      phone: s.phone || "",
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${editStaff.id || editStaff._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Staff Updated", description: `${editForm.name}'s profile has been updated.` });
      setEditStaff(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to update staff member.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteStaff) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${deleteStaff.id || deleteStaff._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Staff Member Removed", description: `${deleteStaff.name} has been deleted.` });
      setDeleteStaff(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to delete staff member.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500" style={poppins}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage staff profiles and work history.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Staff
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-3" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.staff.map((s: any) => (
            <div key={s.id || s._id} className="bg-card rounded-2xl p-6 border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full rose-gold-gradient text-white flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                  {s.avatarInitials || s.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground leading-tight">{s.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium mt-1 inline-block">
                    {s.specialization}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2.5 text-sm mb-5">
                <p className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Contact</span>
                  <span className="font-medium text-foreground">{s.phone || "N/A"}</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="border-t border-border/50 pt-4 flex gap-2">
                <Link href={`/staff/${s.id || s._id}/history`} className="flex-1">
                  <button className="w-full py-2.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                    <Briefcase className="w-4 h-4" /> Work History
                  </button>
                </Link>
                <button
                  onClick={() => openEdit(s)}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl font-semibold transition-colors text-sm flex items-center justify-center"
                  title="Edit staff member"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteStaff(s)}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-semibold transition-colors text-sm flex items-center justify-center"
                  title="Delete staff member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Staff Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl p-8 w-full max-w-md shadow-2xl" style={poppins}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold text-primary">New Staff Member</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Full Name *</label>
                <input required placeholder="Enter full name"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Specialization *</label>
                <input required placeholder="e.g. Hair Stylist, Makeup Artist"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.specialization}
                  onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Phone</label>
                <input placeholder="10-digit mobile number"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={createStaff.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors disabled:opacity-50">
                  {createStaff.isPending ? "Saving..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ── */}
      {editStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl p-8 w-full max-w-md shadow-2xl" style={poppins}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold text-primary">Edit Staff Member</h2>
              <button onClick={() => setEditStaff(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Full Name *</label>
                <input required placeholder="Enter full name"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Specialization *</label>
                <input required placeholder="e.g. Hair Stylist, Makeup Artist"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.specialization}
                  onChange={e => setEditForm({ ...editForm, specialization: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Phone</label>
                <input placeholder="10-digit mobile number"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Commission %</label>
                <input type="number" min="0" max="100" placeholder="e.g. 10"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.commissionPercent}
                  onChange={e => setEditForm({ ...editForm, commissionPercent: Number(e.target.value) })} />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setEditStaff(null)}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Staff Member?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 mb-5 text-sm text-rose-800">
              <span className="font-semibold">{deleteStaff.name}</span> — {deleteStaff.specialization}
              {deleteStaff.phone && <> &nbsp;·&nbsp; {deleteStaff.phone}</>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteStaff(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors text-sm font-semibold disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
