export function storedUser() {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
}
export const activeStatus = status => ["pending", "called", "skipped"].includes(status);
export const statusLabel = visit => visit.status === 'pending' ? (visit.checkedInAt ? 'Checked in · waiting' : 'Booked') : visit.status === 'called' ? (visit.consultationStartedAt ? 'In consultation' : 'Your turn') : ({ skipped: 'Missed call', completed: 'Consultation complete', cancelled: 'Cancelled' }[visit.status] || visit.status);
export const statusColor = status => ({ pending: "info", called: "warning", completed: "success", cancelled: "default", skipped: "default" }[status] || "default");
export const roleLabel = role => ({ admin: "Hospiq Admin", hospital_admin: "Hospital / Clinic Admin", patient: "Patient", staff: "Hospital staff", doctor: "Doctor", pharmacist: "Pharmacist" }[role] || role);
export const roleHome = user => user?.mustChangePassword ? "/change-password" : user?.role === "admin" ? "/admin" : user?.role === "hospital_admin" ? "/hospital-admin" : user?.role === "patient" ? "/" : user?.role === "pharmacist" ? "/pharmacy" : "/dashboard";
