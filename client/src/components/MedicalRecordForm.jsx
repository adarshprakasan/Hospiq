import { useEffect, useState } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, DialogActions, DialogContent, FormControlLabel, FormGroup, MenuItem, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const blankMedication = () => ({ name: "", times: [], startDate: today(), endDate: "", foodTiming: "", instructions: "" });
const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function MedicalRecordForm({ patientId, visitTokenId, isDoctor, onSaved, onCancel }) {
  const [form, setForm] = useState({ visitDate: localNow(), doctorName: "", hospitalName: "", department: "", diagnosis: "", notes: "", prescription: "", kind: "lab-report" });
  const [medications, setMedications] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueVersion, setCatalogueVersion] = useState(0);
  useEffect(() => {
    if (!isDoctor) return;
    let live = true;
    setCatalogueLoading(true); setCatalogueError("");
    axios.get("/medications").then(({ data }) => { if (live) setCatalogue(data); }).catch(err => { if (live) setCatalogueError(err.response?.data?.message || "Could not load hospital medications"); }).finally(() => { if (live) setCatalogueLoading(false); });
    return () => { live = false; };
  }, [isDoctor, catalogueVersion]);
  const updateMedication = (index, changes) => setMedications(previous => previous.map((m, i) => i === index ? { ...m, ...changes } : m));
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
    if (medications.some(m => !m.name.trim() || (isDoctor && !catalogue.some(item => item._id === m.medicationId)) || !m.times.length || !m.endDate || m.endDate < m.startDate)) { setError("For each medication select a medicine, at least one time of day, and an end date on or after its start date"); return; }
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
      {isDoctor && <Box><Typography variant="body2" color="text.secondary">Choose a medicine with its strength from your hospital's available list.</Typography>{catalogueError && <Alert severity="error">{catalogueError}</Alert>}{!catalogueLoading && !catalogueError && !catalogue.length && <Alert severity="info">No medications available. Add them in the Medications page, then refresh this list.</Alert>}<Button size="small" onClick={() => window.open("/medications", "_blank", "noopener,noreferrer")}>Manage hospital medications</Button><Button size="small" disabled={catalogueLoading} onClick={() => setCatalogueVersion(v => v + 1)}>Refresh medication list</Button></Box>}
      {medications.map((medication, index) => <Box key={index} sx={{ border: "1px solid #e0e9e8", borderRadius: 2, p: 2 }}><Stack gap={2}>
        <Typography fontWeight={700}>Medication {index + 1}</Typography>
        {isDoctor ? <Autocomplete options={catalogue} loading={catalogueLoading} value={catalogue.find(item => item._id === medication.medicationId) || null} getOptionLabel={item => item.name} isOptionEqualToValue={(a, b) => a._id === b._id} onChange={(_event, item) => updateMedication(index, { medicationId: item?._id, name: item?.name || "" })} renderInput={params => <TextField {...params} required label="Search hospital medication and strength" />} /> : <TextField required label="Medication name and strength" value={medication.name} onChange={e => updateMedication(index, { name: e.target.value })} />}
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}><Typography component="legend" variant="body2">Frequency — select at least one</Typography><FormGroup row>{["morning", "noon", "night"].map(time => <FormControlLabel key={time} label={time[0].toUpperCase() + time.slice(1)} control={<Checkbox checked={medication.times.includes(time)} onChange={e => updateMedication(index, { times: e.target.checked ? [...medication.times, time] : medication.times.filter(t => t !== time) })} />} />)}</FormGroup></Box>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}><TextField required fullWidth type="date" label="Start date" value={medication.startDate} onChange={e => updateMedication(index, { startDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField required fullWidth type="date" label="End date" value={medication.endDate} onChange={e => updateMedication(index, { endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: medication.startDate } }} /></Stack>
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}><Typography component="legend" variant="body2">Food timing (optional)</Typography><FormGroup row>{[["before", "Before food"], ["after", "After food"]].map(([value, label]) => <FormControlLabel key={value} label={label} control={<Checkbox checked={medication.foodTiming === value} onChange={e => updateMedication(index, { foodTiming: e.target.checked ? value : "" })} />} />)}</FormGroup></Box>
        <TextField label="Instructions" value={medication.instructions} onChange={e => updateMedication(index, { instructions: e.target.value })} multiline minRows={2} />
        <Button color="error" onClick={() => setMedications(previous => previous.filter((_, i) => i !== index))}>Remove medication</Button>
      </Stack></Box>)}
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
