import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Button, Alert, Chip, Stack, TextField, MenuItem, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import axios from "../api/axios";
import OfflineBookingDialog from "./OfflineBookingDialog";
import { activeStatus, statusColor } from "../utils";
export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [busy, setBusy] = useState(null);
  const refresh = useCallback(async () => {
    setError("");
    try { const [profile, queue] = await Promise.all([axios.get("/auth/me"), axios.get("/tokens/my")]); setUser(profile.data); setTokens(queue.data); }
    catch { setError("Unable to load the queue. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function update(id, status) {
    setBusy(id); setError("");
    try { await axios.put(`/tokens/${id}/status`, { status }); setTokens(previous => previous.map(t => t._id === id ? { ...t, status } : t)); }
    catch (err) { setError(err.response?.data?.message || "Unable to update token. Refresh to see its latest status."); }
    finally { setBusy(null); }
  }
  async function addDepartment(e) {
    e.preventDefault(); setBusy("department"); setError("");
    try { await axios.post("/departments/add", { name: department.trim(), hospitalId: user.hospitalId }); setDepartmentOpen(false); setDepartment(""); }
    catch (err) { setError(err.response?.data?.message || "Unable to add department."); }
    finally { setBusy(null); }
  }
  const visible = tokens.filter(t => (filter === "all" || (filter === "active" ? activeStatus(t.status) : t.status === filter)) && [t.patientName, t.doctorName, t.departmentName, t.tokenNumber].join(" ").toLowerCase().includes(search.toLowerCase()));
  if (loading) return <Box p={8} textAlign="center"><CircularProgress aria-label="Loading queue" /></Box>;
  return <Container maxWidth="lg" sx={{ mt: 3 }}><Box className="page-hero"><Typography variant="overline">CARE OPERATIONS</Typography><Typography variant="h4">A clearer view of today's care.</Typography><Typography sx={{ mt: 1 }}>Manage arrivals, keep your queue moving, and give every patient your attention.</Typography></Box>
    {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={refresh}>Retry</Button>}>{error}</Alert>}
    <Box className="stat-grid">{[["Today's appointments", tokens.length], ["Waiting", tokens.filter(t => t.status === "pending").length], ["Called", tokens.filter(t => t.status === "called").length], ["Completed", tokens.filter(t => t.status === "completed").length]].map(([label, count]) => <Paper key={label} sx={{ p: 2.5 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" sx={{ mt: 1 }}>{count}</Typography></Paper>)}</Box>
    <Stack direction="row" flexWrap="wrap" gap={1} mb={3}><Button onClick={refresh} variant="outlined">Refresh queue</Button>{user?.hospitalId ? <><Button component={Link} to="/manage-doctors" variant="outlined">Manage doctors</Button><Button component={Link} to="/schedule" variant="outlined">Schedules</Button><Button onClick={() => setDepartmentOpen(true)} variant="outlined">Add department</Button>{user.role === "staff" && <Button onClick={() => setOffline(true)} variant="contained">+ Walk-in patient</Button>}</> : user && <Button component={Link} to="/create-hospital" variant="contained">Set up hospital or clinic</Button>}</Stack>
    {user?.role === "doctor" && !tokens.length && <Alert severity="info" sx={{ mb: 2 }}>Your queue shows visits assigned to your linked doctor profile. Ask your hospital manager to link your registered account when creating your profile.</Alert>}
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} mb={3}><TextField fullWidth label="Search patient, doctor, department, or token" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Show" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 180 }}>{["active", "all", "pending", "called", "skipped", "completed", "cancelled"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Stack>
    <Box className="responsive-grid">{visible.map(t => <Paper key={t._id} sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" mb={2}><Typography variant="h5">#{t.tokenNumber}</Typography><Chip label={t.status} color={statusColor(t.status)} size="small" /></Stack><Typography variant="h6">{t.patientName}</Typography><Typography color="text.secondary">{t.doctorName}</Typography><Typography variant="body2" color="text.secondary" mb={2}>{t.departmentName}{t.isOffline ? " · Walk-in" : ""}</Typography>{user?.role === "doctor" && t.patientId && <Button component={Link} to={`/patients/${t.patientId}/records`} variant="outlined" sx={{ mb: 2 }}>Medical records / visit notes</Button>}{activeStatus(t.status) && <Stack direction="row" gap={1}>{t.status === "called" ? <Button variant="contained" disabled={busy === t._id} onClick={() => update(t._id, "completed")}>Complete visit</Button> : <Button variant="contained" disabled={busy === t._id} onClick={() => update(t._id, "called")}>Call patient</Button>}{t.status !== "skipped" && <Button disabled={busy === t._id} onClick={() => update(t._id, "skipped")}>Skip</Button>}</Stack>}</Paper>)}</Box>
    {!visible.length && <Alert severity="info">No appointments match this view.</Alert>}
    <OfflineBookingDialog open={offline} hospitalId={user?.hospitalId} onClose={success => { setOffline(false); if (success) refresh(); }} />
    <Dialog open={departmentOpen} onClose={() => setDepartmentOpen(false)} fullWidth maxWidth="xs"><Box component="form" onSubmit={addDepartment}><DialogTitle>Add department</DialogTitle><DialogContent><TextField fullWidth autoFocus required margin="dense" label="Department name" value={department} onChange={e => setDepartment(e.target.value)} /></DialogContent><DialogActions><Button onClick={() => setDepartmentOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy === "department" || !department.trim()}>Add department</Button></DialogActions></Box></Dialog>
  </Container>;
}
