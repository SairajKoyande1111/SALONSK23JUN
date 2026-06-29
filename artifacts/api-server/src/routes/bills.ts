import { Router } from "express";
import { Bill, Customer, Appointment } from "../models/index.js";

const router = Router();

// Generate sequential bill number: TT{YYYYMMDD}-{seq}, sequence resets daily.
// Uses the highest existing sequence for today to avoid duplicates caused by
// deleted bills (count gaps) or pre-existing data in the database.
async function generateBillNumber(): Promise<string> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `TT${dateStr}-`;

  // Find the last bill issued today (sorted descending by billNumber string)
  const lastBill = await Bill.findOne(
    { billNumber: { $regex: `^${prefix}` } },
    { billNumber: 1 },
  ).sort({ billNumber: -1 });

  let nextSeq = 1;
  if (lastBill?.billNumber) {
    const parts = lastBill.billNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(2, "0")}`;
}

// GET /api/service-stylist-stats — top stylist per service (appointments + bills combined)
router.get("/service-stylist-stats", async (_req, res) => {
  const stats: Record<string, Record<string, { staffName: string; count: number }>> = {};

  function tally(svcName: string, staffId: string, staffName: string) {
    if (!svcName || !staffId || !staffName) return;
    if (!stats[svcName]) stats[svcName] = {};
    if (!stats[svcName][staffId]) stats[svcName][staffId] = { staffName, count: 0 };
    stats[svcName][staffId].count++;
  }

  // ── Source 1: Appointments (staffId + serviceName per appointment) ──
  const appointments = await Appointment.find(
    { staffId: { $exists: true, $ne: "" } },
    { staffId: 1, staffName: 1, serviceName: 1, services: 1 }
  ).lean();

  for (const appt of appointments) {
    const a = appt as any;
    // Each appointment may have a primary serviceName or an array of services
    if (Array.isArray(a.services) && a.services.length > 0) {
      for (const svc of a.services) {
        tally(svc.serviceName, a.staffId, a.staffName);
      }
    } else if (a.serviceName) {
      tally(a.serviceName, a.staffId, a.staffName);
    }
  }

  // ── Source 2: Bills (items with staffId of type service) ──
  const bills = await Bill.find({ "items.staffId": { $exists: true, $ne: null } }).lean();
  for (const bill of bills) {
    for (const item of (bill as any).items || []) {
      if (item.type !== "service" || !item.staffId || !item.name) continue;
      tally(item.name, item.staffId.toString(), item.staffName || "");
    }
  }

  // ── Also aggregate counts by base service name (before " — " separator) ──
  // Appointments store full variant names like "HAIRCUT (Male) — Hair Cut Men"
  // but POS service cards use only the parent name "HAIRCUT (Male)".
  const baseStats: Record<string, Record<string, { staffName: string; count: number }>> = {};
  for (const [svcName, staffMap] of Object.entries(stats)) {
    const baseName = svcName.includes(" — ") ? svcName.split(" — ")[0].trim() : svcName.trim();
    if (!baseStats[baseName]) baseStats[baseName] = {};
    for (const [staffId, { staffName, count }] of Object.entries(staffMap)) {
      if (!baseStats[baseName][staffId]) baseStats[baseName][staffId] = { staffName, count: 0 };
      baseStats[baseName][staffId].count += count;
    }
  }

  // ── Pick top stylist per service (both full-variant and base name keys) ──
  const result: Record<string, { staffId: string; staffName: string; count: number }> = {};
  const pickTop = (staffMap: Record<string, { staffName: string; count: number }>) => {
    let topStaffId = "", topStaffName = "", topCount = 0;
    for (const [staffId, { staffName, count }] of Object.entries(staffMap)) {
      if (count > topCount) { topCount = count; topStaffId = staffId; topStaffName = staffName; }
    }
    return { staffId: topStaffId, staffName: topStaffName, count: topCount };
  };
  // Full variant keys (for exact matches)
  for (const [svcName, staffMap] of Object.entries(stats)) {
    result[svcName] = pickTop(staffMap);
  }
  // Base name keys (for POS card lookups — will overwrite if same key, which is fine)
  for (const [baseName, staffMap] of Object.entries(baseStats)) {
    result[baseName] = pickTop(staffMap);
  }
  res.json({ stats: result });
});

router.get("/bills", async (req, res) => {
  const { customerId, from, to, paymentMethod } = req.query as Record<string, string>;
  const query: Record<string, any> = {};
  if (customerId) query.customerId = customerId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }
  const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(500);
  res.json({
    bills: bills.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
  });
});

router.get("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });
  res.json({ ...bill.toObject(), id: bill._id.toString() });
});

router.put("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const {
    customerId,
    customerName,
    customerPhone,
    items,
    subtotal,
    taxPercent,
    taxAmount,
    discountAmount,
    finalAmount,
    paymentMethod,
    status,
    notes,
  } = req.body;

  // Reverse old customer stats, apply new ones
  if (bill.customerId) {
    await Customer.findByIdAndUpdate(bill.customerId, {
      $inc: { totalSpend: -(bill.finalAmount || 0), totalVisits: -1 },
    });
  }

  await Bill.findByIdAndUpdate(billId, {
    customerId: customerId || undefined,
    customerName: customerName || "Walk-in",
    customerPhone: customerPhone || "",
    items: items || [],
    subtotal: subtotal || 0,
    taxPercent: taxPercent || 0,
    taxAmount: taxAmount || 0,
    discountAmount: discountAmount || 0,
    finalAmount,
    paymentMethod,
    status: status || "paid",
    notes: notes || "",
  });

  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalSpend: finalAmount, totalVisits: 1 },
    });
  }

  const updated = await Bill.findById(billId);
  res.json({ ...updated!.toObject(), id: updated!._id.toString() });
});

router.delete("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  // Reverse the customer totalSpend and totalVisits if this bill was linked to a customer
  if (bill.customerId) {
    await Customer.findByIdAndUpdate(bill.customerId, {
      $inc: { totalSpend: -bill.finalAmount, totalVisits: -1 },
    });
  }

  await Bill.findByIdAndDelete(billId);
  res.json({ success: true });
});

router.post("/bills", async (req, res) => {
  const {
    customerId,
    customerName,
    customerPhone,
    items,
    subtotal,
    taxPercent,
    taxAmount,
    discountAmount,
    finalAmount,
    paymentMethod,
    status,
    notes,
  } = req.body;

  const billNumber = await generateBillNumber();

  const bill = await Bill.create({
    billNumber,
    customerId: customerId || undefined,
    customerName: customerName || "Walk-in",
    customerPhone: customerPhone || "",
    items: items || [],
    subtotal: subtotal || 0,
    taxPercent: taxPercent || 0,
    taxAmount: taxAmount || 0,
    discountAmount: discountAmount || 0,
    finalAmount,
    paymentMethod,
    status: status || "paid",
    notes: notes || "",
  });

  // Update customer totalSpend and totalVisits if linked
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalSpend: finalAmount, totalVisits: 1 },
    });
  }

  res.status(201).json({ ...bill.toObject(), id: bill._id.toString(), billNumber });
});

export default router;
