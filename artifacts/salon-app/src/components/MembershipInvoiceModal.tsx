import { X, Download } from "lucide-react";
import { format, parseISO } from "date-fns";

const SALON = {
  displayName: "The Touch Unisex Salon",
  tagline: "Unisex Salon",
  slogan: "Where Style Meets Perfection",
  address: "Shop B 11, Chanakya building kalubai chowk,\nLodha Casario road Dombivali East",
  phone: "+91 90210 64849",
  email: "thetouch@gmail.com",
};

const LOGO_URL = "/thetouch-logo.jpg";
const f = "'Poppins', sans-serif";

interface FamilyMember {
  name: string;
  phone?: string;
  gender?: string;
  dob?: string;
  anniversary?: string;
}

interface CustomerMembership {
  id?: string;
  _id?: string;
  customerId: string;
  customerName: string;
  membershipName: string;
  price: number;
  discountPercent: number;
  benefits: string;
  startDate: string;
  endDate: string;
  createdAt?: string | Date;
}

interface Customer {
  id?: string;
  _id?: string;
  phone?: string;
  email?: string;
  gender?: string;
  familyMembers?: FamilyMember[];
}

interface MembershipInvoiceModalProps {
  membership: CustomerMembership;
  customer?: Customer;
  onClose: () => void;
}

function formatPhone(phone?: string) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  if (phone.startsWith("+91")) return phone;
  if (clean.length === 10) return `+91 ${clean}`;
  return phone;
}

function invoiceNumber(cm: CustomerMembership) {
  const raw = cm.id || cm._id || "";
  return "MEM-" + raw.slice(-6).toUpperCase();
}

export function MembershipInvoiceModal({ membership, customer, onClose }: MembershipInvoiceModalProps) {
  const invoiceDate = membership.createdAt ? new Date(membership.createdAt) : new Date();
  const phone = formatPhone(customer?.phone);
  const familyMembers: FamilyMember[] = Array.isArray(customer?.familyMembers)
    ? customer!.familyMembers!.filter((m) => m.name)
    : [];

  const handlePrint = () => {
    const el = document.getElementById("membership-invoice-print-area");
    if (!el) return;
    const win = window.open("", "_blank", "width=820,height=960");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Membership Invoice – ${invoiceNumber(membership)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Poppins',sans-serif;color:#111;background:#fff}
        .page{max-width:720px;margin:0 auto;padding:48px 40px}
        img{display:block}
        table{border-collapse:collapse;width:100%}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[95vh] flex flex-col" style={{ fontFamily: f }}>

        {/* Modal toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: f }}>Membership Invoice</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Print / Download
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
          <div
            id="membership-invoice-print-area"
            style={{ maxWidth: 720, margin: "0 auto", padding: "48px 40px", fontFamily: f, color: "#111", background: "#fff", borderRadius: 12 }}
          >

            {/* ── HEADER ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid #111", background: "#000", flexShrink: 0 }}>
                  <img src={LOGO_URL} alt="thetouch logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: 4, textTransform: "uppercase", fontFamily: f }}>MEMBERSHIP</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed", letterSpacing: 2, textTransform: "uppercase", fontFamily: f }}>INVOICE</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#555", marginTop: 4, fontFamily: f }}>#{invoiceNumber(membership)}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontFamily: f }}>{format(invoiceDate, "dd MMM yyyy, hh:mm a")}</div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "2px solid #111", margin: "0 0 24px 0" }} />

            {/* ── FROM + BILL TO ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
              {/* From */}
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", marginBottom: 6, fontWeight: 600, fontFamily: f }}>From</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6, fontFamily: f }}>{SALON.displayName}</div>
                <div style={{ fontSize: 11, color: "#444", lineHeight: 1.8, fontFamily: f, whiteSpace: "pre-line" }}>{SALON.address}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 4, fontFamily: f }}>{SALON.phone}</div>
                <div style={{ fontSize: 11, color: "#444", fontFamily: f }}>{SALON.email}</div>
              </div>
              {/* Bill To */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", marginBottom: 6, fontWeight: 600, fontFamily: f }}>Member</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", fontFamily: f }}>{membership.customerName}</div>
                {phone && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4, fontFamily: f }}>{phone}</div>
                )}
                {customer?.email && (
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2, fontFamily: f }}>{customer.email}</div>
                )}
                <div style={{ display: "inline-block", border: "1.5px solid #7c3aed", borderRadius: 20, padding: "2px 12px", fontSize: 10, fontWeight: 700, color: "#7c3aed", marginTop: 8, textTransform: "uppercase", letterSpacing: 1, fontFamily: f }}>
                  ✓ ACTIVE MEMBER
                </div>
              </div>
            </div>

            {/* ── MEMBERSHIP PLAN TABLE ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
              <thead>
                <tr>
                  {["#", "Plan", "Duration", "Valid From", "Valid Until", "Amount"].map((h, i) => (
                    <th key={h} style={{
                      background: "#111", color: "#fff", padding: "10px 12px",
                      textAlign: i === 0 || i === 1 ? "left" : i >= 4 ? "right" : "center",
                      fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, fontFamily: f,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "14px 12px", fontSize: 12, color: "#999", fontFamily: f }}>1</td>
                  <td style={{ padding: "14px 12px", fontFamily: f }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{membership.membershipName}</div>
                    {membership.discountPercent > 0 && (
                      <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3, fontWeight: 600 }}>{membership.discountPercent}% off all services</div>
                    )}
                    {membership.benefits && (
                      <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{membership.benefits}</div>
                    )}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, fontFamily: f, color: "#555" }}>
                    {(() => {
                      if (!membership.startDate || !membership.endDate) return "—";
                      const start = parseISO(membership.startDate);
                      const end = parseISO(membership.endDate);
                      const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
                      return `${months} month${months !== 1 ? "s" : ""}`;
                    })()}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, fontFamily: f }}>
                    {membership.startDate ? format(parseISO(membership.startDate), "dd MMM yyyy") : "—"}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "right", fontSize: 12, fontFamily: f }}>
                    {membership.endDate ? format(parseISO(membership.endDate), "dd MMM yyyy") : "—"}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#111", fontFamily: f }}>
                    ₹{Number(membership.price).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── TOTALS ── */}
            <div style={{ marginLeft: "auto", width: 280, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 18, fontWeight: 800, color: "#111", borderTop: "2px solid #111", marginTop: 6, fontFamily: f }}>
                <span>Total Paid</span>
                <span>₹{Number(membership.price).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* ── FAMILY MEMBERS SECTION ── */}
            {familyMembers.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", fontWeight: 600, fontFamily: f, marginBottom: 10 }}>
                  Family Members Covered ({familyMembers.length})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#", "Name", "Phone", "Gender", "Date of Birth", "Status"].map((h, i) => (
                        <th key={h} style={{
                          background: "#7c3aed", color: "#fff", padding: "8px 12px",
                          textAlign: i === 0 || i === 1 ? "left" : "center",
                          fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, fontFamily: f,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#faf9ff" : "#fff" }}>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#999", fontFamily: f }}>{idx + 1}</td>
                        <td style={{ padding: "10px 12px", fontFamily: f }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{m.name}</div>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: "#555", fontFamily: f }}>
                          {m.phone ? formatPhone(m.phone) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: "#555", fontFamily: f, textTransform: "capitalize" }}>
                          {m.gender || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: "#555", fontFamily: f }}>
                          {m.dob ? format(parseISO(m.dob), "dd MMM yyyy") : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontFamily: f }}>
                          <span style={{ display: "inline-block", background: "#ede9fe", color: "#7c3aed", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                            ✓ Covered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10, color: "#888", marginTop: 8, fontFamily: f }}>
                  * All family members are covered under the {membership.membershipName} membership plan at no additional cost.
                </div>
              </div>
            )}

            {/* ── FOOTER ── */}
            <div style={{ marginTop: 48, textAlign: "center", borderTop: "1px dashed #ccc", paddingTop: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", fontFamily: f }}>
                Thank you for being a valued member of {SALON.displayName}!
              </div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.8, marginTop: 8, fontFamily: f }}>
                This membership is non-transferable and non-refundable.<br />
                {SALON.phone} &nbsp;|&nbsp; {SALON.email}
              </div>
              <div style={{ fontSize: 10, color: "#bbb", marginTop: 14, letterSpacing: 2, textTransform: "uppercase", fontFamily: f }}>
                {SALON.slogan}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
