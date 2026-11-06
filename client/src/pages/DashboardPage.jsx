import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Button, Alert, Chip, Stack, TextField, MenuItem, CircularProgress } from "@mui/material";
import PatientQrScanner from "../components/PatientQrScanner";
import axios from "../api/axios";
import OfflineBookingDialog from "./OfflineBookingDialog";
import { activeStatus, statusColor } from "../utils";
export default function DashboardPage() {
  const [scanAppointment, setScanAppointment] = useState(null);
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [clinicalProfile, setClinicalProfile] = useState(null);
  useEffect(() => { let live = true; if (user?.role === "doctor") axios.get("/doctors/me").then(({ data }) => { if (live) setClinicalProfile(data); }).catch(() => { if (live) setClinicalProfile(null); }); return () => { live = false; }; }, [user?._id, user?.role]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [busy, setBusy] = useState(null);
  const refresh = useCallback(async () => {
    setError("");
    try { const [profile, queue] = await Promise.all([axios.get("/auth/me"), axios.get("/tokens/my")]); setUser(profile.data); setTokens(queue.data); }
    catch { setError("Unable to load the queue. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => clearInterval(timer); }, [refresh]);
  async function update(id, status) {
    setBusy(id); setError("");
    try { await axios.put(`/tokens/${id}/status`, { status }); setTokens(previous => previous.map(t => t._id === id ? { ...t, status } : t)); }
    catch (err) { setError(err.response?.data?.message || "Unable to update token. Refresh to see its latest status."); }
    finally { setBusy(null); }
  }
  async function availability() {
    setBusy("availability");
    try { const { data } = await axios.put(`/doctors/${clinicalProfile._id}/availability`, { available: clinicalProfile.availabilityStatus === "available" ? "unavailable" : "available" }); setClinicalProfile(data); }
    catch (err) { setError(err.response?.data?.message || "Unable to update availability"); }
    finally { setBusy(null); }
  }
  const visible = tokens.filter(t => (filter === "all" || (filter === "active" ? activeStatus(t.status) : t.status === filter)) && [t.patientName, t.doctorName, t.departmentName, t.tokenNumber].join(" ").toLowerCase().includes(search.toLowerCase()));
  if (loading) return <Box p={8} textAlign="center"><CircularProgress aria-label="Loading queue" /></Box>;
  return <Container maxWidth="lg" sx={{ mt: 3 }}><Box className="page-hero"><Typography variant="overline">CARE OPERATIONS</Typography><Typography variant="h4">A clearer view of today's care.</Typography><Typography sx={{ mt: 1 }}>Manage arrivals, keep your queue moving, and give every patient your attention.</Typography></Box>
    {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={refresh}>Retry</Button>}>{error}</Alert>}
    <Box className="stat-grid">{[["Today's appointments", tokens.length], ["Waiting", tokens.filter(t => t.status === "pending").length], ["Called", tokens.filter(t => t.status === "called").length], ["Completed", tokens.filter(t => t.status === "completed").length]].map(([label, count]) => <Paper key={label} sx={{ p: 2.5 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" sx={{ mt: 1 }}>{count}</Typography></Paper>)}</Box>
    <Stack direction="row" flexWrap="wrap" gap={1} mb={3}><Button onClick={refresh} variant="outlined">Refresh queue</Button>{user?.hospitalId ? <>{["staff", "hospital_admin"].includes(user.role) && <Button component={Link} to="/schedule" variant="outlined">Schedules</Button>}{user.role === "hospital_admin" && <Button component={Link} to="/hospital-admin" variant="outlined">Manage hospital</Button>}{user.role === "staff" && <Button onClick={() => setOffline(true)} variant="contained">+ Walk-in patient</Button>}</> : user && <Alert severity="info">Ask your hospital administrator to link your account.</Alert>}</Stack>
    {user?.role === "doctor" && <Paper sx={{ p: 2, mb: 3 }}><Stack direction="row" gap={2} alignItems="center" flexWrap="wrap"><Box sx={{ flex: 1 }}><Typography variant="h6">Clinical workspace</Typography><Typography color="text.secondary">{clinicalProfile ? `${clinicalProfile.department} · ${clinicalProfile.availabilityStatus}. Weekly schedules are managed by hospital staff.` : "Ask your hospital administrator to link your clinical profile."}</Typography></Box>{clinicalProfile && <><Button component={Link} to={`/doctor/${clinicalProfile._id}`}>My clinical profile</Button><Button variant="outlined" disabled={busy === "availability"} onClick={availability}>{clinicalProfile.availabilityStatus === "available" ? "Set unavailable" : "Set available"}</Button></>}</Stack></Paper>}
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} mb={3}><TextField fullWidth label="Search patient, doctor, department, or token" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Show" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 180 }}>{["active", "all", "pending", "called", "skipped", "completed", "cancelled"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Stack>
    <Box className="responsive-grid">{visible.map(t => <Paper key={t._id} sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" mb={2}><Typography variant="h5">#{t.tokenNumber}</Typography><Chip label={t.status} color={statusColor(t.status)} size="small" /></Stack><Typography variant="h6">{t.patientName}</Typography><Typography color="text.secondary">{t.doctorName}</Typography><Typography variant="body2" color="text.secondary" mb={2}>{t.departmentName}{t.isOffline ? " · Walk-in" : ""}</Typography>{user?.role === "doctor" && <Box mb={2}><Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", overflowWrap: "anywhere", mb: 1 }}>{t.patientPublicId || "Unregistered walk-in"}</Typography><Button variant="contained" disabled={!t.patientId || ["cancelled", "completed"].includes(t.status)} onClick={() => setScanAppointment(t)}>Scan patient QR</Button>{!t.patientId && <Typography variant="caption" display="block">A registered patient account is needed for a QR card.</Typography>}</Box>}{user?.role === "doctor" && t.patientId && <Button component={Link} to={`/patients/${t.patientId}/records`} variant="outlined" sx={{ mb: 2 }}>Medical records / visit notes</Button>}{activeStatus(t.status) && <Stack direction="row" gap={1}>{t.status === "called" ? user?.role !== "staff" && <Button variant="contained" disabled={busy === t._id} onClick={() => update(t._id, "completed")}>Complete visit</Button> : <Button variant="contained" disabled={busy === t._id} onClick={() => update(t._id, "called")}>Call patient</Button>}{t.status !== "skipped" && <Button disabled={busy === t._id} onClick={() => update(t._id, "skipped")}>Skip</Button>}</Stack>}</Paper>)}</Box>
    {!visible.length && <Alert severity="info">No appointments match this view.</Alert>}
    {scanAppointment && <PatientQrScanner appointment={scanAppointment} onClose={() => setScanAppointment(null)} onStarted={refresh} />}
    <OfflineBookingDialog open={offline} hospitalId={user?.hospitalId} onClose={success => { setOffline(false); if (success) refresh(); }} />

  </Container>;
}
