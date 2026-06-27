import { Router } from "express";
import { Bill, Staff } from "../models/index.js";

const router = Router();

// Legacy upgradation-only report (kept for compatibility)
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
              name: "$items.name",
              type: "$items.type",
              price: "$items.price",
              total: "$items.total",
              billNumber: "$billNumber",
              customerName: "$customerName",
              date: "$createdAt",
            },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
    const report = results.map((r) => ({
      staffId: r._id.staffId || null,
      staffName: r._id.staffName || "Unassigned",
      totalCount: r.totalCount,
      totalRevenue: r.totalRevenue,
      items: r.items,
    }));
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch upgradation report" });
  }
});

// Full staff performance report
router.get("/staff-report", async (req, res) => {
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
              price: "$items.price",
              total: "$items.total",
              isUpgradation: "$items.isUpgradation",
              billNumber: "$billNumber",
              customerName: "$customerName",
              customerPhone: "$customerPhone",
              date: "$createdAt",
              billGrandTotal: "$total",
            },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Fetch staff info for role/phone
    const staffIds = results.map((r) => r._id.staffId).filter(Boolean);
    const staffDocs = await Staff.find({ _id: { $in: staffIds } }).lean();
    const staffMap = new Map(staffDocs.map((s: any) => [s._id.toString(), s]));

    const report = results.map((r) => {
      const staffInfo: any = staffMap.get(r._id.staffId?.toString() || "");

      // Services breakdown
      const serviceMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();
      for (const item of r.itemDetails) {
        const key = item.name;
        if (!serviceMap.has(key)) {
          serviceMap.set(key, { name: item.name, type: item.type, count: 0, revenue: 0 });
        }
        const s = serviceMap.get(key)!;
        s.count++;
        s.revenue += item.total || 0;
      }
      const services = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);

      // Group into bills
      const billMap = new Map<
        string,
        { billNumber: string; customerName: string; customerPhone: string; date: string; billGrandTotal: number; items: any[] }
      >();
      for (const item of r.itemDetails) {
        if (!billMap.has(item.billNumber)) {
          billMap.set(item.billNumber, {
            billNumber: item.billNumber,
            customerName: item.customerName,
            customerPhone: item.customerPhone || "",
            date: item.date,
            billGrandTotal: item.billGrandTotal || 0,
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

    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch staff report" });
  }
});

export default router;
