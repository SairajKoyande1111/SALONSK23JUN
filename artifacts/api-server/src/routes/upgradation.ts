import { Router } from "express";
import { Bill, Staff } from "../models/index.js";

const router = Router();

// Legacy upgradation-only report
router.get("/upgradation-report", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const dateMatch: Record<string, any> = {};
    if (from || to) {
      dateMatch.createdAt = {};
      if (from) dateMatch.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateMatch.createdAt.$lte = toDate;
      }
    }
    const results = await Bill.aggregate([
      ...(Object.keys(dateMatch).length ? [{ $match: dateMatch }] : []),
      { $unwind: "$items" },
      { $match: { "items.isUpgradation": true } },
      {
        $group: {
          _id: { staffId: "$items.staffId", staffName: "$items.staffName" },
          totalCount: { $sum: 1 },
          totalRevenue: { $sum: "$items.total" },
          items: {
            $push: {
              name: "$items.name", type: "$items.type",
              price: "$items.price", total: "$items.total",
              billNumber: "$billNumber", customerName: "$customerName", date: "$createdAt",
            },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
    res.json({
      report: results.map((r) => ({
        staffId: r._id.staffId || null,
        staffName: r._id.staffName || "Unassigned",
        totalCount: r.totalCount,
        totalRevenue: r.totalRevenue,
        items: r.items,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch upgradation report" });
  }
});

// Full staff performance report
// ?from=YYYY-MM-DD &to=YYYY-MM-DD &staffId=<mongoId|"unassigned">
router.get("/staff-report", async (req, res) => {
  try {
    const { from, to, staffId } = req.query as Record<string, string>;

    // ── Date filter on bills ──────────────────────────────────
    const dateMatch: Record<string, any> = {};
    if (from || to) {
      dateMatch.createdAt = {};
      if (from) dateMatch.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        dateMatch.createdAt.$lte = d;
      }
    }
    const dateStage = Object.keys(dateMatch).length ? [{ $match: dateMatch }] : [];

    // ── Optional single-staff item filter (applied AFTER unwind) ──
    let staffItemMatch: Record<string, any> | null = null;
    if (staffId === "unassigned") {
      staffItemMatch = { $or: [{ "items.staffId": null }, { "items.staffId": "" }, { "items.staffId": { $exists: false } }] };
    } else if (staffId) {
      staffItemMatch = { "items.staffId": staffId };
    }

    // ── Summary: unique bill count + actual collected revenue ─────
    // This matches what the Invoices page shows (finalAmount)
    const [summaryRows, perStaffRows] = await Promise.all([
      Bill.aggregate([
        ...dateStage,
        { $group: { _id: null, totalBills: { $sum: 1 }, totalRevenue: { $sum: "$finalAmount" } } },
      ]),
      Bill.aggregate([
        ...dateStage,
        { $unwind: "$items" },
        ...(staffItemMatch ? [{ $match: staffItemMatch }] : []),
        {
          $group: {
            _id: { staffId: "$items.staffId", staffName: "$items.staffName" },
            totalRevenue: { $sum: "$items.total" },
            upgradationRevenue: {
              $sum: { $cond: [{ $eq: ["$items.isUpgradation", true] }, "$items.total", 0] },
            },
            upgradationCount: {
              $sum: { $cond: [{ $eq: ["$items.isUpgradation", true] }, 1, 0] },
            },
            uniqueBillIds: { $addToSet: "$_id" },
            itemDetails: {
              $push: {
                name: "$items.name",
                type: "$items.type",
                total: "$items.total",
                isUpgradation: { $ifNull: ["$items.isUpgradation", false] },
                billId: { $toString: "$_id" },
                billNumber: "$billNumber",
                customerName: "$customerName",
                customerPhone: "$customerPhone",
                date: "$createdAt",
                billGrandTotal: "$finalAmount",   // ← correct field
                paymentMethod: "$paymentMethod",
                status: "$status",
              },
            },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
    ]);

    const summary = summaryRows[0] || { totalBills: 0, totalRevenue: 0 };

    // ── Lookup staff docs for role / phone ────────────────────
    const staffIds = perStaffRows.map((r) => r._id.staffId).filter(Boolean);
    const staffDocs = await Staff.find({ _id: { $in: staffIds } }).lean();
    const staffMap = new Map(staffDocs.map((s: any) => [s._id.toString(), s]));

    const report = perStaffRows.map((r) => {
      const staffInfo: any = staffMap.get(r._id.staffId?.toString() || "");

      // ── services breakdown ─────────────────────────────────
      const svcMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();
      for (const item of r.itemDetails) {
        if (!svcMap.has(item.name)) {
          svcMap.set(item.name, { name: item.name, type: item.type || "service", count: 0, revenue: 0 });
        }
        const s = svcMap.get(item.name)!;
        s.count++;
        s.revenue += item.total || 0;
      }
      const services = Array.from(svcMap.values()).sort((a, b) => b.count - a.count);

      // ── bills list (grouped by billNumber) ─────────────────
      const billMap = new Map<string, {
        billId: string; billNumber: string; customerName: string;
        customerPhone: string; date: string; billGrandTotal: number;
        paymentMethod: string; status: string; items: any[];
      }>();
      for (const item of r.itemDetails) {
        if (!billMap.has(item.billNumber)) {
          billMap.set(item.billNumber, {
            billId: item.billId || "",
            billNumber: item.billNumber,
            customerName: item.customerName || "Walk-in",
            customerPhone: item.customerPhone || "",
            date: item.date,
            billGrandTotal: item.billGrandTotal || 0,
            paymentMethod: item.paymentMethod || "",
            status: item.status || "paid",
            items: [],
          });
        }
        billMap.get(item.billNumber)!.items.push({
          name: item.name,
          type: item.type,
          total: item.total,
          isUpgradation: item.isUpgradation,
        });
      }
      const bills = Array.from(billMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return {
        staffId: r._id.staffId || null,
        staffName: r._id.staffName || "Unassigned",
        staffRole: staffInfo?.specialization || "",
        staffPhone: staffInfo?.phone || "",
        totalBills: r.uniqueBillIds.length,
        totalRevenue: r.totalRevenue,
        upgradationRevenue: r.upgradationRevenue,
        upgradationCount: r.upgradationCount,
        services,
        bills,
      };
    });

    res.json({ summary, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch staff report" });
  }
});

export default router;
