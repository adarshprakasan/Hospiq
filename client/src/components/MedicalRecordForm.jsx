import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, DialogActions, DialogContent, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
const blankMedication = () => ({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function MedicalRecordForm({ patientId, visitTokenId, isDoctor, onSaved, onCancel }) {
  const [form, setForm] = useState({ visitDate: localNow(), doctorName: "", hospitalName: "", department: "", diagnosis: "", notes: "", prescription: "", kind: "lab-report" });
  const [medications, setMedications] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [associate, setAssociate] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospital, setHospital] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [share, setShare] = useState(false);
  const change = e => setForm(previous => ({ ...previous, [e.target.name]: e.target.value }));
  useEffect(() => {
    let live = true;
    if (associate) axios.get("/hospitals").then(({ data }) => { if (live) setHospitals(data); }).catch(() => { if (live) setError("Could not load hospitals"); });
    return () => { live = false; };
  }, [associate]);
  useEffect(() => {
    let live = true;
    setDoctorId(""); setDoctors([]); setShare(false);
    if (hospital) axios.get(`/doctors/hospital/${hospital}`).then(({ data }) => { if (live) setDoctors(data); }).catch(() => { if (live) setError("Could not load doctors"); });
    return () => { live = false; };
  }, [hospital]);
  function selectFiles(event) {
    const chosen = [...event.target.files];
    event.target.value = "";
    if (chosen.length + files.length > 5 || chosen.some(f => f.size > 10 * 1024 * 1024)) { setError("Choose at most 5 files, each no larger than 10 MB"); return; }
    setFiles(previous => [...previous, ...chosen]); setError("");
  }
  async function save(event) {
    event.preventDefault(); setError("");
    const visitDate = new Date(form.visitDate);
    if (!Number.isFinite(visitDate.getTime()) || visitDate > new Date()) { setError("Choose a valid visit date/time in the past or present"); return; }
    if (associate && (!doctorId || !share)) { setError("Choose a doctor and confirm access to this uploaded record"); return; }
    const data = { ...form, visitDate: visitDate.toISOString(), medications, ...(isDoctor ? { patientId, visitTokenId } : associate ? { doctorId, shareWithDoctor: share } : {}) };
    const body = new FormData(); body.append("data", JSON.stringify(data)); files.forEach(file => body.append("files", file));
    setBusy(true);
    try { await axios.post(isDoctor ? "/records/add" : "/records/mine", body, { headers: { "Content-Type": undefined }, timeout: 60000 }); onSaved(); }
    catch (err) { setError(err.response?.data?.message || "Record could not be saved. Please retry"); }
    finally { setBusy(false); }
  }
  return <Box component="form" onSubmit={save}>
    <DialogContent><Stack gap={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField required type="datetime-local" name="visitDate" label="Visit date and time (your local time)" value={form.visitDate} onChange={change} slotProps={{ inputLabel: { shrink: true } }} />
      {isDoctor ? <Alert severity="info">Your doctor, hospital, and department are recorded automatically. Call the patient first, or add notes for a prior completed visit.</Alert> : <>
        <FormControlLabel control={<Checkbox checked={associate} onChange={e => { setAssociate(e.target.checked); setShare(false); }} />} label="This visit was with a doctor listed in Hospiq" />
        {associate ? <><TextField select required label="Hospital" value={hospital} onChange={e => setHospital(e.target.value)}>{hospitals.map(h => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField><TextField select required label="Treating doctor" value={doctorId} onChange={e => { setDoctorId(e.target.value); setShare(false); }} disabled={!doctors.length}>{doctors.map(d => <MenuItem key={d._id} value={d._id}>{d.name} · {d.department}</MenuItem>)}</TextField><FormControlLabel control={<Checkbox checked={share} onChange={e => setShare(e.target.checked)} />} label="I confirm this doctor treated me and may view this record without requesting a new OTP." /></> : <><TextField required label="Doctor name" name="doctorName" value={form.doctorName} onChange={change} /><TextField required label="Hospital / clinic" name="hospitalName" value={form.hospitalName} onChange={change} /><TextField required label="Department" name="department" value={form.department} onChange={change} /></>}
        <Typography variant="body2" color="text.secondary">Patient uploads are labeled as patient-entered. Other doctors need your permission to view them.</Typography>
      </>}
      <TextField label="Diagnosis / reason for visit" name="diagnosis" value={form.diagnosis} onChange={change} multiline minRows={2} />
      <Typography variant="h6">Prescribed medications</Typography>
      {medications.map((medication, index) => <Box key={index} sx={{ border: "1px solid #e0e9e8", borderRadius: 2, p: 2 }}><Stack gap={1}>{[["name", "Medication name"], ["dose", "Dose"], ["frequency", "Frequency"], ["duration", "Duration"], ["instructions", "Instructions"]].map(([field, label]) => <TextField key={field} size="small" required={field === "name"} label={label} value={medication[field]} onChange={e => setMedications(previous => previous.map((m, i) => i === index ? { ...m, [field]: e.target.value } : m))} />)}<Button color="error" onClick={() => setMedications(previous => previous.filter((_, i) => i !== index))}>Remove medication</Button></Stack></Box>)}
      <Button variant="outlined" disabled={medications.length >= 40} onClick={() => setMedications(previous => [...previous, blankMedication()])}>+ Add medication</Button>
      <TextField label="Prescription text" name="prescription" value={form.prescription} onChange={change} multiline minRows={2} />
      <TextField label="Visit notes" name="notes" value={form.notes} onChange={change} multiline minRows={2} />
      <Typography variant="h6">Prescription or lab files</Typography>
      <TextField select label="Attachment type" name="kind" value={form.kind} onChange={change}><MenuItem value="lab-report">Lab report</MenuItem><MenuItem value="prescription">Prescription</MenuItem></TextField>
      <Stack direction="row" gap={1} flexWrap="wrap"><Button component="label" variant="outlined" disabled={busy}>Upload files<input aria-label="Upload medical files" type="file" multiple accept="image/jpeg,image/png,application/pdf" hidden onChange={selectFiles} /></Button><Button component="label" variant="outlined" disabled={busy}>Scan / take photo<input aria-label="Take photo of medical document" type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={selectFiles} /></Button></Stack>
      <Typography variant="body2" color="text.secondary">Up to 5 JPEG, PNG, or PDF files, 10 MB each. Camera support depends on your device. Images are stored as documents; no automatic text extraction.</Typography>
      {files.map((file, index) => <Stack key={`${file.name}-${index}`} direction="row" alignItems="center" gap={1}><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{file.name}</Typography><Button color="error" disabled={busy} onClick={() => setFiles(previous => previous.filter((_, i) => i !== index))}>Remove</Button></Stack>)}
    </Stack></DialogContent><DialogActions><Button onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving record…" : "Save medical record"}</Button></DialogActions>
  </Box>;
}
