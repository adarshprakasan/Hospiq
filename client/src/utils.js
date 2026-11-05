export function storedUser() {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
}
export const activeStatus = status => ["pending", "called", "skipped"].includes(status);
export const statusColor = status => ({ pending: "info", called: "warning", completed: "success", cancelled: "default", skipped: "default" }[status] || "default");
