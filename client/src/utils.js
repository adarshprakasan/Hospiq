export function storedUser() {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
}
export const activeStatus = status => ["pending", "called", "skipped"].includes(status);
export const statusColor = status => ({ pending: "info", called: "warning", completed: "success", cancelled: "default", skipped: "default" }[status] || "default");
export const roleLabel = role => ({ admin: "Hospiq Admin", hospital_admin: "Hospital / Clinic Admin", patient: "Patient", staff: "Hospital staff", doctor: "Doctor", pharmacist: "Pharmacist" }[role] || role);
export const roleHome = user => user?.mustChangePassword ? "/change-password" : user?.role === "admin" ? "/admin" : user?.role === "hospital_admin" ? "/hospital-admin" : user?.role === "patient" ? "/" : user?.role === "pharmacist" ? "/pharmacy" : "/dashboard";
