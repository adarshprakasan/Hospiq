import MedicalRecordsPage from "./MedicalRecordsPage";
import { t as translate, useLocale } from "../i18n";
import OperationalMetrics from "../components/OperationalMetrics";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Button, Alert, Chip, Stack, TextField, MenuItem, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PatientQrScanner from "../components/PatientQrScanner";
import axios from "../api/axios";
import OfflineBookingDialog from "./OfflineBookingDialog";
import { activeStatus, statusColor, statusLabel } from "../utils";
export default function DashboardPage() {
  useLocale();
  const desktop = useMediaQuery("(min-width:900px)");
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [claim, setClaim] = useState(null);
  const [scanAppointment, setScanAppointment] = useState(null);
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [clinicalProfile, setClinicalProfile] = useState(null);
  useEffect(() => {
    let live = true;
    if (user?.role === "doctor") axios.get("/doctors/me").then(({
      data
    }) => {
      if (live) setClinicalProfile(data);
    }).catch(() => {
      if (live) setClinicalProfile(null);
    });
    return () => {
      live = false;
    };
  }, [user?._id, user?.role]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [busy, setBusy] = useState(null);
  const refresh = useCallback(async () => {
    setError("");
    try {
      const [profile, queue] = await Promise.all([axios.get("/auth/me"), axios.get("/tokens/my")]);
      setUser(profile.data);
      setTokens(queue.data);
      setLastUpdated(new Date());
    } catch {
      setError("Unable to load the queue. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function update(id, status) {
    setBusy(id);
    setError("");
    try {
      await axios.put(`/tokens/${id}/status`, {
        status
      });
      setTokens(previous => previous.map(t => t._id === id ? {
        ...t,
        status
      } : t));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update token. Refresh to see its latest status.");
    } finally {
      setBusy(null);
    }
  }
  async function visitAction(id, action) {
    setBusy(id);
    setError("");
    try {
      await axios.post(`/tokens/${id}/actions/${action}`);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update visit");
    } finally {
      setBusy(null);
    }
  }
  async function issueClaim(t) {
    setBusy(t._id);
    setError('');
    try {
      const {
        data
      } = await axios.post(`/tokens/${t._id}/claim-code`);
      setClaim(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create link code');
    } finally {
      setBusy(null);
    }
  }
  function actions(t) {
    return (
      <Stack
        direction="row"
        sx={{
          gap: 1,
          flexWrap: "wrap"
        }}>
        {!t.patientId && ['staff', 'hospital_admin'].includes(user?.role) && activeStatus(t.status) && <Button disabled={busy === t._id} onClick={() => issueClaim(t)}>Link patient account</Button>}
        {activeStatus(t.status) && !t.checkedInAt && <Button disabled={busy === t._id} onClick={() => visitAction(t._id, 'check-in')}>{translate("Check in")}</Button>}
        {activeStatus(t.status) && t.status !== 'called' && <Button disabled={busy === t._id || !t.checkedInAt} onClick={() => update(t._id, 'called')}>{translate("Call patient")}</Button>}
        {user?.role === 'doctor' && t.status === 'called' && !t.consultationOpen && <Button disabled={busy === t._id || !t.checkedInAt} onClick={() => visitAction(t._id, 'start')}>{translate("Start consultation")}</Button>}
        {user?.role === 'doctor' && t.patientId && <Button component={Link} to={`/patients/${t.patientId}/labs`}>{translate("Lab tests")}</Button>}
        {user?.role === 'doctor' && t.patientId && <Button onClick={() => setSelectedVisit(t)}>{translate("Notes / history")}</Button>}
        {user?.role === 'doctor' && t.patientId && activeStatus(t.status) && <Button disabled={busy === t._id} onClick={() => setScanAppointment(t)}>{translate("Scan QR")}</Button>}
        {activeStatus(t.status) && t.status !== 'skipped' && <Button disabled={busy === t._id} onClick={() => update(t._id, 'skipped')}>{translate("Missed call")}</Button>}
      </Stack>
    );
  }
  async function availability() {
    setBusy("availability");
    try {
      const {
        data
      } = await axios.put(`/doctors/${clinicalProfile._id}/availability`, {
        available: clinicalProfile.availabilityStatus === "available" ? "unavailable" : "available"
      });
      setClinicalProfile(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update availability");
    } finally {
      setBusy(null);
    }
  }
  const visible = tokens.filter(t => (filter === "all" || (filter === "active" ? activeStatus(t.status) : t.status === filter)) && [t.patientName, t.doctorName, t.departmentName, t.tokenNumber].join(" ").toLowerCase().includes(search.toLowerCase()));
  if (loading) return (
    <Box
      sx={{
        p: 8,
        textAlign: "center"
      }}><CircularProgress aria-label="Loading queue" /></Box>
  );
  return (
    <Container maxWidth="lg" sx={{
      mt: 3
    }}><Box className="page-hero"><Typography variant="overline">CARE OPERATIONS</Typography><Typography variant="h4">A clearer view of today's care.</Typography><Typography sx={{
          mt: 1
        }}>Manage arrivals, keep your queue moving, and give every patient your attention.</Typography></Box>
      {error && <Alert severity="error" sx={{
        mb: 2
      }} action={<Button onClick={refresh}>{translate("Retry")}</Button>}>{error}</Alert>}
      <Box className="stat-grid">{[["Today's appointments", tokens.length], [translate("Waiting"), tokens.filter(t => t.status === "pending").length], ["Called", tokens.filter(t => t.status === "called").length], ["Completed", tokens.filter(t => t.status === "completed").length]].map(([label, count]) => <Paper key={translate(label)} sx={{
          p: 2.5
        }}><Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{translate(label)}</Typography><Typography variant="h4" sx={{
            mt: 1
          }}>{count}</Typography></Paper>)}</Box>
      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          gap: 1,
          mb: 3
        }}><Button onClick={refresh} variant="outlined">Refresh queue</Button>{user?.hospitalId ? <>{["staff", "hospital_admin"].includes(user.role) && <Button component={Link} to="/schedule" variant="outlined">{translate("Schedules")}</Button>}{user.role === "hospital_admin" && <Button component={Link} to="/hospital-admin" variant="outlined">Manage hospital</Button>}{user.role === "staff" && <Button onClick={() => setOffline(true)} variant="contained">+ Walk-in patient</Button>}</> : user && <Alert severity="info">Ask your hospital administrator to link your account.</Alert>}</Stack>
      {user?.role === "doctor" && <Paper sx={{
        p: 2,
        mb: 3
      }}><Stack
        direction="row"
        sx={{
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap"
        }}><Box sx={{
            flex: 1
          }}><Typography variant="h6">{translate("Clinical workspace")}</Typography><Typography sx={{
        color: "text.secondary"
      }}>{clinicalProfile ? `${clinicalProfile.department} · ${clinicalProfile.availabilityStatus}. Weekly schedules are managed by hospital staff.` : "Ask your hospital administrator to link your clinical profile."}</Typography></Box>{clinicalProfile && <><Button component={Link} to={`/doctor/${clinicalProfile._id}`}>My clinical profile</Button><Button variant="outlined" disabled={busy === "availability"} onClick={availability}>{clinicalProfile.availabilityStatus === "available" ? "Set unavailable" : "Set available"}</Button></>}</Stack></Paper>}
      <Stack
        direction={{
          xs: "column",
          sm: "row"
        }}
        sx={{
          gap: 2,
          mb: 3
        }}><TextField fullWidth label="Search patient, doctor, department, or token" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Show" value={filter} onChange={e => setFilter(e.target.value)} sx={{
          minWidth: 180
        }}>{["active", "all", "pending", "called", "skipped", "completed", "cancelled"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Stack>
      {lastUpdated && <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 2
        }}>Last updated {lastUpdated.toLocaleTimeString()}</Typography>}
      {desktop ? <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Token', 'Patient', translate("Doctor"), translate("Status"), translate("Waiting"), 'Actions'].map(label => <TableCell key={translate(label)}>{translate(label)}</TableCell>)}</TableRow></TableHead><TableBody>{visible.map(t => <TableRow key={t._id}><TableCell>#{t.tokenNumber}</TableCell><TableCell>{t.patientName}{t.isOffline && <Typography variant="caption" sx={{
        display: "block"
      }}>Walk-in</Typography>}</TableCell><TableCell>{t.doctorName}</TableCell><TableCell><Chip size="small" label={statusLabel(t)} color={statusColor(t.status)} /></TableCell><TableCell>{t.checkedInAt && !t.consultationOpen && activeStatus(t.status) ? `${Math.max(0, Math.floor((Date.now() - new Date(t.checkedInAt)) / 60000))} min` : '—'}</TableCell><TableCell>{actions(t)}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Stack sx={{
        gap: 2
      }}>{visible.map(t => <Paper key={t._id} sx={{
          p: 2
        }}><Typography variant="h6">#{t.tokenNumber} · {t.patientName}</Typography><Typography>{t.doctorName}</Typography><Chip label={statusLabel(t)} color={statusColor(t.status)} sx={{
            my: 1
          }} />{actions(t)}</Paper>)}</Stack>}
      <Dialog open={Boolean(selectedVisit)} onClose={() => setSelectedVisit(null)} fullWidth maxWidth="xl"><DialogTitle>{selectedVisit?.patientName} · Token #{selectedVisit?.tokenNumber}</DialogTitle><DialogContent><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 2 }}><Stack component="nav" aria-label="Clinical queue" sx={{
        gap: 1
      }}>{visible.filter(v => v.patientId).map(v => <Button key={v._id} variant={selectedVisit?._id === v._id ? 'contained' : 'text'} onClick={() => setSelectedVisit(v)}>#{v.tokenNumber} · {v.patientName}</Button>)}</Stack>{selectedVisit && <MedicalRecordsPage key={selectedVisit._id} patientIdOverride={selectedVisit.patientId} visitTokenOverride={selectedVisit._id} />}</Box></DialogContent><DialogActions><Button onClick={() => { setSelectedVisit(null); refresh(); }}>Back to queue</Button></DialogActions></Dialog>
      <OperationalMetrics />
      {!visible.length && <Alert severity="info">No appointments match this view.</Alert>}
      <Dialog open={Boolean(claim)} onClose={() => setClaim(null)}><DialogTitle>Link this walk-in</DialogTitle><DialogContent><Typography>Verify the patient's identity at reception, then give them this code. They must sign in and choose “Link my walk-in” in Appointments.</Typography><Typography sx={{
            fontFamily: 'monospace',
            my: 2,
            overflowWrap: 'anywhere'
          }}>{claim?.code}</Typography><Typography>Expires {claim && new Date(claim.expiresAt).toLocaleTimeString()}. Single use.</Typography></DialogContent><DialogActions><Button onClick={() => setClaim(null)}>{translate("Done")}</Button></DialogActions></Dialog>
      {scanAppointment && <PatientQrScanner appointment={scanAppointment} onClose={() => setScanAppointment(null)} onStarted={refresh} />}
      <OfflineBookingDialog open={offline} hospitalId={user?.hospitalId} onClose={success => {
        setOffline(false);
        if (success) refresh();
      }} />

    </Container>
  );
}
