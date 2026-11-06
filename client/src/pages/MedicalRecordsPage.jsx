import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography, TablePagination } from "@mui/material";
import axios from "../api/axios";
import MedicalRecordForm from "../components/MedicalRecordForm";
export default function MedicalRecordsPage() {
  const { patientId } = useParams();
  const location = useLocation();
  const candidateVisit = location.state?.scannedVisit;
  const scannedVisit = patientId && candidateVisit?.patient?.patientId === patientId ? candidateVisit : null;
  const isDoctor = Boolean(patientId);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [grants, setGrants] = useState([]);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(Boolean(scannedVisit && location.state?.openRecordForm));
  const [busy, setBusy] = useState("");
  const [request, setRequest] = useState(null);
  const [otp, setOtp] = useState("");
  const [search, setSearch] = useState("");
  const [pharmacyRecord, setPharmacyRecord] = useState(null);
  const [pharmacyError, setPharmacyError] = useState("");
  async function sendPharmacy() {
    setBusy("pharmacy"); setPharmacyError("");
    try { const { data } = await axios.post(`/pharmacy/send/${pharmacyRecord._id}`); setNotice(`Medication sent to pharmacy. Token ${data.tokenLabel} · ${data.date}. The patient can collect medicine at pharmacy.`); setPharmacyRecord(null); await refresh(); }
    catch (err) { setPharmacyError(err.response?.data?.message || "Unable to send medication. The record is saved; retry sending from its history card."); }
    finally { setBusy(""); }
  }
  const [source, setSource] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(0); }, [source]);
  const generation = useRef(0);
  const base = `/records/patient/${patientId}`;
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const [history, status] = await Promise.all([axios.get(isDoctor ? `/records/patient/${patientId}` : "/records/mine", { params: { page: page + 1, limit: 20, q: query || undefined, source: source || undefined } }), axios.get(isDoctor ? `/records/patient/${patientId}/access` : "/records/access/grants")]);
      if (current !== generation.current) return;
      setRecords(history.data.items || history.data); setTotal(history.data.total ?? history.data.length);
      if (isDoctor) setAccess(status.data); else setGrants(status.data);
      setError("");
    } catch (err) { if (current !== generation.current) return; setRecords([]); setAccess(null); setError(err.response?.data?.message || "Unable to load medical records"); }
    finally { if (current === generation.current) setLoading(false); }
  }, [isDoctor, patientId, page, query, source]);
  useEffect(() => { setRecords([]); setLoading(true); setRequest(null); setOtp(""); refresh(); const interval = setInterval(refresh, 30000); return () => { clearInterval(interval); generation.current++; }; }, [refresh]);
  useEffect(() => {
    if (!isDoctor || !access?.expiresAt) return;
    const timeout = setTimeout(() => { setRecords([]); setAccess(previous => ({ ...previous, fullAccess: false, expiresAt: null })); refresh(); }, Math.max(0, new Date(access.expiresAt).getTime() - Date.now()) + 10);
    return () => clearTimeout(timeout);
  }, [isDoctor, access?.expiresAt, refresh]);
  async function requestAccess() {
    setBusy("request"); setError(""); setNotice("");
    try { const { data } = await axios.post(`${base}/access/request`); setRequest(data); setOtp(""); setNotice(data.message); }
    catch (err) { setError(err.response?.data?.message || "Unable to send permission code"); }
    finally { setBusy(""); }
  }
  async function verify(event) {
    event.preventDefault(); setBusy("verify"); setError("");
    try { const { data } = await axios.post(`${base}/access/verify`, { requestId: request.requestId, otp }); setRequest(null); setOtp(""); setNotice(data.message); await refresh(); }
    catch (err) { setError(err.response?.data?.message || "Permission code could not be verified"); }
    finally { setBusy(""); }
  }
  async function revoke(id) {
    setBusy(id);
    try { await axios.delete(`/records/access/grants/${id}`); setNotice("Doctor access revoked"); await refresh(); }
    catch (err) { setError(err.response?.data?.message || "Could not revoke access"); }
    finally { setBusy(""); }
  }
  async function download(record, file) {
    setBusy(file._id); setError("");
    try {
      const { data } = await axios.get(`/records/${record._id}/attachments/${file._id}`, { responseType: "blob", timeout: 30000 });
      const url = URL.createObjectURL(data); const link = document.createElement("a"); link.href = url; link.download = file.originalName || "medical-record"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Unable to download this file. Your permission may have expired or been revoked."); await refresh(); }
    finally { setBusy(""); }
  }
  const visible = records.filter(r => (!source || r.source === source) && [r.doctorName, r.hospitalName, r.department, r.diagnosis, r.notes, r.prescription, ...(r.medications || []).map(m => m.name)].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <Container maxWidth="lg" sx={{ mt: 3 }}>
    <Box className="page-hero"><Typography variant="overline">PATIENT-OWNED MEDICAL HISTORY</Typography><Typography variant="h4">{isDoctor ? `${access?.patient?.name || "Patient"} — medical records` : "My medical records"}</Typography><Typography sx={{ mt: 1 }}>Visits, prescriptions, medications, and lab reports in one place.</Typography></Box>
    {scannedVisit && <Alert severity="success" sx={{ mb: 2 }}>QR identified: {scannedVisit.patient.name} ({scannedVisit.patient.publicId}) · {scannedVisit.doctor.name}, {scannedVisit.doctor.department} · Token #{scannedVisit.appointment.tokenNumber}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
    <Stack direction="row" gap={1} mb={3} flexWrap="wrap"><Button variant="contained" onClick={() => setOpen(true)}>+ {isDoctor ? "Record this visit" : "Add visit / upload documents"}</Button><Button variant="outlined" onClick={refresh}>Refresh records</Button></Stack>
    {isDoctor ? <Paper sx={{ p: 3, mb: 3 }}><Typography variant="h6">Patient permission</Typography>{access?.fullAccess ? <Alert severity="success" sx={{ mt: 1 }}>Read-only access to other doctors' records until {new Date(access.expiresAt).toLocaleTimeString()}. The patient can revoke it sooner.</Alert> : <><Typography color="text.secondary" sx={{ my: 1 }}>You can view your own previous visit records. To see records from other doctors or hospitals, request a code sent to the patient's registered email and enter it only if the patient agrees to share it.</Typography><Button variant="outlined" disabled={Boolean(busy) || !access?.canRequest} onClick={requestAccess}>{busy === "request" ? "Sending…" : request ? "Send a new permission code" : "Request patient permission"}</Button>{!access?.canRequest && <Typography variant="body2" sx={{ mt: 1 }}>A pending or called appointment today is required to request permission.</Typography>}{request && <Box component="form" onSubmit={verify} sx={{ mt: 2 }}><Stack direction={{ xs: "column", sm: "row" }} gap={2}><TextField required label="Code shared by patient" value={otp} onChange={e => setOtp(e.target.value)} autoComplete="off" slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 } }} /><Button type="submit" variant="contained" disabled={Boolean(busy)}>{busy === "verify" ? "Verifying…" : "Verify permission"}</Button></Stack><Typography variant="body2" color="text.secondary" mt={1}>Code expires at {new Date(request.expiresAt).toLocaleTimeString()} and can be used once.</Typography></Box>}</>}</Paper> : <Paper sx={{ p: 3, mb: 3 }}><Typography variant="h6">Doctors with temporary access</Typography><Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>A permission code approves 30 minutes of read-only access to your other records. Share it only if you agree. Revoking access prevents new reads; it cannot retract information already viewed or downloaded.</Typography>{grants.length ? grants.map(g => <Stack key={g._id} direction="row" gap={2} alignItems="center" sx={{ mt: 2 }}><Box sx={{ flex: 1 }}><Typography>{g.doctorName}</Typography><Typography variant="body2" color="text.secondary">Expires {new Date(g.expiresAt).toLocaleString()}</Typography></Box><Button color="error" disabled={busy === g._id} onClick={() => revoke(g._id)}>Revoke access</Button></Stack>) : <Typography variant="body2">No active temporary permissions.</Typography>}</Paper>}
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} mb={3}><TextField fullWidth label="Search doctor, hospital, medication, or diagnosis" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Added by" value={source} onChange={e => setSource(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">Everyone</MenuItem><MenuItem value="doctor">Doctor</MenuItem><MenuItem value="patient">Patient upload</MenuItem></TextField></Stack>
    {loading ? <CircularProgress aria-label="Loading medical history" /> : <Stack gap={3}>{visible.map(record => <Paper key={record._id} sx={{ p: 3 }}><Stack direction="row" gap={1} justifyContent="space-between" flexWrap="wrap"><Typography variant="h6">{new Date(record.visitDate).toLocaleString()}</Typography><Chip size="small" label={record.source === "patient" ? "Patient-entered" : "Doctor-entered"} color={record.source === "patient" ? "default" : "primary"} variant="outlined" /></Stack><Typography sx={{ mt: 1 }}>{record.doctorName} · {record.department}</Typography><Typography color="text.secondary" gutterBottom>{record.hospitalName}</Typography>{record.diagnosis && <Typography sx={{ mt: 2, whiteSpace: "pre-wrap" }}><strong>Diagnosis / reason:</strong> {record.diagnosis}</Typography>}{record.medications.length > 0 && <Box mt={2}><Typography fontWeight={700}>Medications</Typography>{record.medications.map((m, i) => <Typography key={i} sx={{ mt: .5 }}>{[m.name, m.dose, m.times?.length ? m.times.map(t => t[0].toUpperCase() + t.slice(1)).join(" / ") : m.frequency, m.startDate && m.endDate ? `${m.startDate} to ${m.endDate}` : m.duration, m.foodTiming === "before" ? "Before food" : m.foodTiming === "after" ? "After food" : "", m.instructions].filter(Boolean).join(" · ")}</Typography>)}</Box>}{record.canSendToPharmacy && <Button variant="outlined" sx={{ mt: 2 }} onClick={() => { setPharmacyError(""); setPharmacyRecord(record); }}>Send medication to pharmacy</Button>}{record.prescription && <Typography sx={{ mt: 2, whiteSpace: "pre-wrap" }}><strong>Prescription:</strong> {record.prescription}</Typography>}{record.notes && <Typography sx={{ mt: 2, whiteSpace: "pre-wrap" }}><strong>Visit notes:</strong> {record.notes}</Typography>}<Stack direction="row" gap={1} flexWrap="wrap" mt={2}>{record.attachments.map(file => <Button key={file._id} variant="outlined" disabled={busy === file._id} onClick={() => download(record, file)} sx={{ overflowWrap: "anywhere" }}>{file.kind === "prescription" ? "Prescription" : "Lab report"}: {file.originalName}</Button>)}</Stack>{record.legacyAttachmentCount > 0 && <Alert severity="warning" sx={{ mt: 2 }}>This record has older public-link attachments. Re-upload them using protected storage; old URLs are hidden here.</Alert>}</Paper>)}</Stack>}
    {!loading && !visible.length && <Alert severity="info">{isDoctor && !access?.fullAccess ? "No matching records from your own visits. Other records remain private until the patient approves." : "No medical records match this view. Add a visit or upload a prescription/lab report to get started."}</Alert>}
    {!loading && <TablePagination component="div" count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_event, value) => setPage(value)} />}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md"><DialogTitle>{isDoctor ? "Record patient visit" : "Add visit or scanned document"}</DialogTitle>{open && <MedicalRecordForm visitTokenId={scannedVisit?.appointment.tokenId} patientId={patientId} isDoctor={isDoctor} onCancel={() => setOpen(false)} onSaved={data => { setOpen(false); setNotice(isDoctor ? data.visitCompleted ? "Medical record saved. Visit completed." : "Medical record saved. Visit completion needs retry; sending to pharmacy will retry it." : "Medical record saved"); if (isDoctor && data.record.medications.length) { setPharmacyError(""); setPharmacyRecord(data.record); } refresh(); }} />}</Dialog>
    <Dialog open={Boolean(pharmacyRecord)} onClose={busy === "pharmacy" ? undefined : () => setPharmacyRecord(null)} fullWidth maxWidth="sm"><DialogTitle>Send medication to pharmacy?</DialogTitle><DialogContent><Typography>The medical record is saved. Send the prescribed medications to your hospital pharmacy and generate the patient's pharmacy token.</Typography>{pharmacyError && <Alert severity="error" sx={{ mt: 2 }}>{pharmacyError}</Alert>}</DialogContent><DialogActions><Button disabled={busy === "pharmacy"} onClick={() => setPharmacyRecord(null)}>Later</Button><Button variant="contained" disabled={busy === "pharmacy"} onClick={sendPharmacy}>{busy === "pharmacy" ? "Sending…" : "Send medication to pharmacy"}</Button></DialogActions></Dialog>
  </Container>;
}
