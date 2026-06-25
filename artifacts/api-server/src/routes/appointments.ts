import { Router } from "express";
import { Appointment, Customer, Service, Staff } from "../models/index.js";

const router = Router();

// ── Reminders: last month's appointments mapped to same day this month ─────────
router.get("/appointments/reminders", async (req, res) => {
  const { month } = req.query as Record<string, string>;
  if (!month) return res.json({ reminders: {} });

  // Strict validation: must be exactly "yyyy-MM" with a valid month 01–12
  if (!/^\d{4}-\d{2}$/.test(month)) return res.json({ reminders: {} });
  const [year, mon] = month.split("-").map(Number);
  if (mon < 1 || mon > 12) return res.json({ reminders: {} });

  // Derive previous month
  const prevYear = mon === 1 ? year - 1 : year;
  const prevMon  = mon === 1 ? 12 : mon - 1;
  const prevMonthStr = `${prevYear}-${String(prevMon).padStart(2, "0")}`;

  // Project only the fields we need to keep the payload lean
  const prevAppts = await Appointment.find(
    { appointmentDate: { $regex: `^${prevMonthStr}` } },
    { customerName: 1, customerPhone: 1, customerId: 1, services: 1, serviceName: 1, appointmentDate: 1, appointmentTime: 1 }
  ).sort({ appointmentTime: 1 }).lean();

  // Days in the requested (current) month — clip days that don't exist
  const daysInCurrentMonth = new Date(year, mon, 0).getDate();

  const reminders: Record<string, any[]> = {};
  for (const appt of prevAppts) {
    const parts = (appt.appointmentDate as string).split("-");
    if (parts.length !== 3) continue;
    const dayOfMonth = parseInt(parts[2], 10);
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > daysInCurrentMonth) continue;

    // Normalised key always matches front-end's yyyy-MM-dd format
    const reminderDate = `${year}-${String(mon).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
    if (!reminders[reminderDate]) reminders[reminderDate] = [];

    const a = appt as any;
    reminders[reminderDate].push({
      customerName:  a.customerName || "Walk-in",
      customerPhone: a.customerPhone || "",
      customerId:    a.customerId || null,
      services:      a.services?.map((s: any) => s.serviceName).filter(Boolean) || (a.serviceName ? [a.serviceName] : []),
      lastVisitDate: a.appointmentDate,
    });
  }

  res.json({ reminders });
});

router.get("/appointments", async (req, res) => {
  const { date, month } = req.query as Record<string, string>;

  let query: any = {};
  if (month) {
    query = { appointmentDate: { $regex: `^${month}` } };
  } else if (date) {
    query = { appointmentDate: date };
  }

  const appointments = await Appointment.find(query).sort({ appointmentTime: 1 });
  res.json({
    appointments: appointments.map((a) => ({
      ...a.toObject(),
      id: a._id.toString(),
    })),
  });
});

router.post("/appointments", async (req, res) => {
  const { customerId, staffId, serviceId, serviceIds, serviceVariantNames, appointmentDate, appointmentTime, notes } = req.body;

  let customerName = "Walk-in";
  let customerPhone = "";
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (customer) {
      customerName = customer.name;
      customerPhone = customer.phone;
    }
  }

  const staffMember = await Staff.findById(staffId);

  // Support both single serviceId and array serviceIds
  const ids: string[] = Array.isArray(serviceIds) && serviceIds.length > 0
    ? serviceIds
    : serviceId ? [serviceId] : [];

  // Optional variant names to override looked-up service names
  const variantNames: string[] = Array.isArray(serviceVariantNames) ? serviceVariantNames : [];

  const resolvedServices = await Promise.all(
    ids.map(async (sid, i) => {
      const svc = await Service.findById(sid);
      const nameOverride = variantNames[i] || null;
      return svc
        ? { serviceId: sid, serviceName: nameOverride || svc.name, serviceCategory: svc.category || "General", duration: svc.duration || 30 }
        : { serviceId: sid, serviceName: nameOverride || "Unknown", serviceCategory: "General", duration: 30 };
    })
  );

  const primaryService = resolvedServices[0] || { serviceId: "", serviceName: "", serviceCategory: "General", duration: 30 };
  const totalDuration = resolvedServices.reduce((sum, s) => sum + s.duration, 0);

  const appointment = await Appointment.create({
    customerId: customerId || undefined,
    customerName,
    customerPhone,
    staffId,
    staffName: staffMember?.name || "Unknown",
    serviceId: primaryService.serviceId,
    serviceName: resolvedServices.map(s => s.serviceName).join(", "),
    serviceCategory: primaryService.serviceCategory,
    duration: totalDuration,
    services: resolvedServices,
    appointmentDate,
    appointmentTime,
    status: "scheduled",
    notes,
  });

  res.status(201).json({ ...appointment.toObject(), id: appointment._id.toString() });
});

router.put("/appointments/:appointmentId", async (req, res) => {
  const { appointmentId } = req.params;
  const { status, notes, customerId, staffId, serviceId, serviceIds, serviceVariantNames, appointmentDate, appointmentTime } = req.body;

  const update: any = {};
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = notes;
  if (appointmentDate !== undefined) update.appointmentDate = appointmentDate;
  if (appointmentTime !== undefined) update.appointmentTime = appointmentTime;

  if (customerId !== undefined) {
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        update.customerId = customerId;
        update.customerName = customer.name;
        update.customerPhone = customer.phone;
      }
    } else {
      update.customerId = null;
      update.customerName = "Walk-in";
      update.customerPhone = "";
    }
  }

  if (staffId) {
    const staffMember = await Staff.findById(staffId);
    if (staffMember) {
      update.staffId = staffId;
      update.staffName = staffMember.name;
    }
  }

  // Support both single serviceId and array serviceIds
  const ids: string[] = Array.isArray(serviceIds) && serviceIds.length > 0
    ? serviceIds
    : serviceId ? [serviceId] : [];

  const variantNames: string[] = Array.isArray(serviceVariantNames) ? serviceVariantNames : [];

  if (ids.length > 0) {
    const resolvedServices = await Promise.all(
      ids.map(async (sid, i) => {
        const svc = await Service.findById(sid);
        const nameOverride = variantNames[i] || null;
        return svc
          ? { serviceId: sid, serviceName: nameOverride || svc.name, serviceCategory: svc.category || "General", duration: svc.duration || 30 }
          : { serviceId: sid, serviceName: nameOverride || "Unknown", serviceCategory: "General", duration: 30 };
      })
    );
    const primaryService = resolvedServices[0];
    update.serviceId = primaryService.serviceId;
    update.serviceName = resolvedServices.map(s => s.serviceName).join(", ");
    update.serviceCategory = primaryService.serviceCategory;
    update.duration = resolvedServices.reduce((sum, s) => sum + s.duration, 0);
    update.services = resolvedServices;
  }

  const appointment = await Appointment.findByIdAndUpdate(appointmentId, update, { new: true });
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  res.json({ ...appointment.toObject(), id: appointment._id.toString() });
});

router.delete("/appointments/:appointmentId", async (req, res) => {
  const { appointmentId } = req.params;
  const appointment = await Appointment.findByIdAndDelete(appointmentId);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  res.status(204).send();
});

export default router;
