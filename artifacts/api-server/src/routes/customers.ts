import { Router } from "express";
import { format } from "date-fns";
import { Customer, Appointment, Bill, CustomerMembership } from "../models/index.js";

const router = Router();

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function checkNamePhoneUniqueness(
  name: string,
  phone: string,
  excludeId?: string
): Promise<string | null> {
  const excl = excludeId ? { _id: { $ne: excludeId } } : {};

  const nameCustomer = await Customer.findOne({ ...excl, name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
  if (nameCustomer) return `A customer named "${name}" already exists.`;

  const nameMember = await Customer.findOne({ ...excl, "familyMembers.name": { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
  if (nameMember) return `"${name}" already exists as a family member of ${nameMember.name}.`;

  const phoneCustomer = await Customer.findOne({ ...excl, phone });
  if (phoneCustomer) return `A customer with phone ${phone} already exists (${phoneCustomer.name}).`;

  const phoneMember = await Customer.findOne({ ...excl, "familyMembers.phone": phone });
  if (phoneMember) return `Phone ${phone} already belongs to a family member of ${phoneMember.name}.`;

  return null;
}

async function checkMemberUniqueness(
  members: { name: string; phone?: string }[],
  mainName: string,
  mainPhone: string,
  excludeId?: string
): Promise<string | null> {
  const excl = excludeId ? { _id: { $ne: excludeId } } : {};

  // Check each member against the main customer's own name/phone
  for (const m of members) {
    if (!m.name) continue;
    const mName = m.name.trim();
    const mPhone = (m.phone || "").trim();

    if (mName.toLowerCase() === mainName.toLowerCase()) {
      return `Family member "${mName}" has the same name as the main customer.`;
    }
    if (mPhone && mPhone === mainPhone) {
      return `Family member "${mName}" has the same phone number as the main customer.`;
    }
  }

  // Check members against each other (within the same submission)
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      if (!a.name || !b.name) continue;
      if (a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) {
        return `Two family members have the same name "${a.name.trim()}".`;
      }
      const aPhone = (a.phone || "").trim();
      const bPhone = (b.phone || "").trim();
      if (aPhone && bPhone && aPhone === bPhone) {
        return `Family members "${a.name.trim()}" and "${b.name.trim()}" have the same phone number.`;
      }
    }
  }

  // Check each member against existing DB records
  for (const m of members) {
    if (!m.name) continue;
    const mName = m.name.trim();
    const mPhone = (m.phone || "").trim();

    const mNameCust = await Customer.findOne({ ...excl, name: { $regex: `^${escapeRegex(mName)}$`, $options: "i" } });
    if (mNameCust) return `Family member "${mName}" already exists as a customer.`;

    const mNameMem = await Customer.findOne({ ...excl, "familyMembers.name": { $regex: `^${escapeRegex(mName)}$`, $options: "i" } });
    if (mNameMem) return `Family member "${mName}" already exists under customer ${mNameMem.name}.`;

    if (mPhone) {
      const mPhoneCust = await Customer.findOne({ ...excl, phone: mPhone });
      if (mPhoneCust) return `Family member "${mName}" phone ${mPhone} belongs to customer ${mPhoneCust.name}.`;

      const mPhoneMem = await Customer.findOne({ ...excl, "familyMembers.phone": mPhone });
      if (mPhoneMem) return `Phone ${mPhone} already belongs to a family member of ${mPhoneMem.name}.`;
    }
  }
  return null;
}

// List customers with optional search (includes active membership)
router.get("/customers", async (req, res) => {
  const { search } = req.query;
  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
    : {};
  const customers = await Customer.find(query).sort({ createdAt: -1 });
  const today = format(new Date(), "yyyy-MM-dd");
  const customerIds = customers.map((c) => c._id.toString());
  const activeMemberships = await CustomerMembership.find({
    customerId: { $in: customerIds },
    isActive: true,
    endDate: { $gte: today },
  });
  const membershipMap: Record<string, any> = {};
  for (const cm of activeMemberships) {
    membershipMap[cm.customerId] = { ...cm.toObject(), id: cm._id.toString() };
  }
  res.json({
    customers: customers.map((c) => ({
      ...c.toObject(),
      id: c._id.toString(),
      activeMembership: membershipMap[c._id.toString()] || null,
    })),
  });
});

// Create customer
router.post("/customers", async (req, res) => {
  const { name, phone, email, dob, anniversary, notes, gender, familyMembers } = req.body;
  const trimmedName = (name || "").trim();
  const trimmedPhone = (phone || "").trim();

  const mainError = await checkNamePhoneUniqueness(trimmedName, trimmedPhone);
  if (mainError) return res.status(409).json({ error: mainError });

  const members: { name: string; phone?: string }[] = familyMembers || [];
  const memberError = await checkMemberUniqueness(members, trimmedName, trimmedPhone);
  if (memberError) return res.status(409).json({ error: memberError });

  const customer = await Customer.create({ name: trimmedName, phone: trimmedPhone, email, dob, anniversary, notes, gender, familyMembers: members });
  res.status(201).json({ ...customer.toObject(), id: customer._id.toString() });
});

// Update customer
router.patch("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const { name, phone, dob, anniversary, notes, email, gender, familyMembers } = req.body;

  const trimmedName = (name || "").trim();
  const trimmedPhone = (phone || "").trim();

  if (trimmedName || trimmedPhone) {
    const mainError = await checkNamePhoneUniqueness(trimmedName, trimmedPhone, customerId);
    if (mainError) return res.status(409).json({ error: mainError });
  }

  if (familyMembers !== undefined) {
    const memberError = await checkMemberUniqueness(familyMembers, trimmedName, trimmedPhone, customerId);
    if (memberError) return res.status(409).json({ error: memberError });
  }

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    {
      ...(name && { name }), ...(phone && { phone }),
      ...(dob !== undefined && { dob }), ...(anniversary !== undefined && { anniversary }),
      ...(notes !== undefined && { notes }),
      ...(email !== undefined && { email }), ...(gender !== undefined && { gender }),
      ...(familyMembers !== undefined && { familyMembers }),
    },
    { new: true }
  );
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ ...customer.toObject(), id: customer._id.toString() });
});

// Delete customer
router.delete("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findByIdAndDelete(customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.status(204).send();
});

// Get single customer with bills and appointments
router.get("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findById(customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const today = format(new Date(), "yyyy-MM-dd");
  const phone = customer.phone;

  const billQuery = phone
    ? { $or: [{ customerId: customerId.toString() }, { customerPhone: phone }] }
    : { customerId: customerId.toString() };

  const [bills, appointments, activeMembership] = await Promise.all([
    Bill.find(billQuery).sort({ createdAt: -1 }),
    Appointment.find({
      $or: [{ customerId: customerId.toString() }, { customerPhone: phone }],
    }).sort({ appointmentDate: -1 }),
    CustomerMembership.findOne({ customerId: customerId.toString(), isActive: true, endDate: { $gte: today } }),
  ]);

  const computedTotalSpend = bills.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  const computedTotalVisits = bills.length;
  const lastVisit = bills.length > 0 ? bills[0].createdAt : null;

  if (customer.totalSpend !== computedTotalSpend || customer.totalVisits !== computedTotalVisits) {
    await Customer.findByIdAndUpdate(customerId, {
      totalSpend: computedTotalSpend,
      totalVisits: computedTotalVisits,
    });
  }

  res.json({
    ...customer.toObject(),
    id: customer._id.toString(),
    totalSpend: computedTotalSpend,
    totalVisits: computedTotalVisits,
    lastVisit,
    activeMembership: activeMembership ? { ...activeMembership.toObject(), id: activeMembership._id.toString() } : null,
    bills: bills.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
    appointments: appointments.map((a) => ({ ...a.toObject(), id: a._id.toString() })),
  });
});

export default router;
