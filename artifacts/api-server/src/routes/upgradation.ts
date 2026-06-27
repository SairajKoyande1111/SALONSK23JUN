import { Router } from "express";
import { Bill } from "../models/index.js";

const router = Router();

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

export default router;
