import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export default function PatientQrScanner({ appointment, onClose, onStarted }) {
  const navigate = useNavigate();
  const video = useRef(null);
  const controls = useRef(null);
  const generation = useRef(0);
  const resolving = useRef(false);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [matched, setMatched] = useState(null);
  const stop = useCallback(() => {
    generation.current++;
    controls.current?.stop(); controls.current = null;
    if (video.current?.srcObject) { video.current.srcObject.getTracks().forEach(track => track.stop()); video.current.srcObject = null; }
  }, []);
  useEffect(() => () => stop(), [stop]);
  async function resolve(qrValue) {
    if (resolving.current) return;
    resolving.current = true; stop(); setCamera(false); setBusy(true); setError("");
    const current = generation.current;
    try { const { data } = await axios.post("/qr/patient/resolve", { tokenId: appointment._id, qrValue: qrValue.trim() }); if (current === generation.current) setMatched(data); }
    catch (err) { if (current === generation.current) setError(err.response?.data?.message || "This patient QR could not be verified"); }
    finally { resolving.current = false; if (current === generation.current) setBusy(false); }
  }
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { setError("Camera access requires HTTPS or localhost and a supported browser. Upload a QR image or paste its data instead"); return; }
    stop(); setError(""); setCamera(true); setBusy(true);
    const current = generation.current;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (current !== generation.current) return;
      const reader = new BrowserQRCodeReader();
      const scanner = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, video.current, (result, _err, scannerControls) => {
        if (result && current === generation.current && !resolving.current) { scannerControls.stop(); resolve(result.getText()); }
      });
      if (current !== generation.current) scanner.stop(); else { controls.current = scanner; setBusy(false); }
    } catch (err) { if (current === generation.current) { stop(); setCamera(false); setBusy(false); setError(err.name === "NotAllowedError" ? "Camera permission was denied. You can upload the QR image or paste the card data" : "The camera could not start. Try an uploaded QR image or pasted visit QR data"); } }
  }
  async function readImage(event) {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPEG or PNG QR image no larger than 5 MB"); return; }
    stop(); setCamera(false); setBusy(true); setError("");
    const current = generation.current;
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (current !== generation.current) return;
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      if (current === generation.current) await resolve(result.getText());
    } catch { if (current === generation.current) setError("No readable patient QR was found. Use a clear image of the patient's Hospiq QR card"); }
    finally { URL.revokeObjectURL(url); if (current === generation.current) setBusy(false); }
  }
  async function startVisit() {
    setBusy(true); setError("");
    const current = generation.current;
    try {
      let status = matched.appointment.status;
      if (["pending", "skipped"].includes(status)) { await axios.put(`/tokens/${matched.appointment.tokenId}/status`, { status: "called" }); status = "called"; if (current === generation.current) onStarted?.(); }
      if (current !== generation.current) return;
      const scannedVisit = { ...matched, appointment: { ...matched.appointment, status } };
      stop();
      navigate(matched.recordsPath, { state: { scannedVisit, openRecordForm: true } });
      onClose();
    } catch (err) { if (current === generation.current) { setError(err.response?.data?.message || "The appointment changed. Refresh the queue and try again"); setBusy(false); } }
  }
  return <Dialog open onClose={() => { stop(); onClose(); }} fullWidth maxWidth="sm"><DialogTitle>Scan patient QR</DialogTitle><DialogContent>
    <Typography fontWeight={700}>{appointment.patientName} · Token #{appointment.tokenNumber}</Typography><Typography variant="body2" color="text.secondary" mb={2}>{appointment.patientPublicId || "Registered patient"}</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {matched ? <Stack gap={2}><Alert severity="success">Patient matched to this appointment</Alert><Box><Typography variant="h6">{matched.patient.name}</Typography><Typography sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{matched.patient.publicId}</Typography></Box><Typography><strong>Doctor:</strong> {matched.doctor.name}</Typography><Typography variant="body2" sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>Doctor ID: {matched.doctor.publicId}</Typography><Typography>{matched.doctor.hospitalName} · {matched.doctor.department}</Typography><Typography>Visit date: {matched.appointment.date} · Token #{matched.appointment.tokenNumber}</Typography><Alert severity="info">Only this doctor's associated records are automatically visible. Other medical history still needs the patient's OTP permission.</Alert></Stack> : <Stack gap={2}>
      <Typography>Ask this patient to show their QR for this visit. The code must match this exact appointment and visit date.</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="contained" disabled={busy || camera} onClick={startCamera}>{camera ? "Camera running" : busy ? "Reading…" : "Start camera"}</Button>{camera && <Button onClick={() => { stop(); setCamera(false); setBusy(false); }}>Stop camera</Button>}<Button component="label" variant="outlined" disabled={busy}>Upload QR image<input type="file" hidden accept="image/png,image/jpeg" aria-label="Upload patient QR image" onChange={readImage} /></Button></Stack>
      <Box sx={{ display: camera ? "block" : "none" }}><video ref={video} muted playsInline style={{ width: "100%", maxHeight: 280, borderRadius: 12 }} aria-label="Patient QR camera preview" /></Box>
      <Box component="form" onSubmit={e => { e.preventDefault(); resolve(value); }}><TextField label="Paste visit QR data (camera fallback)" fullWidth multiline minRows={2} value={value} onChange={e => setValue(e.target.value)} required slotProps={{ htmlInput: { maxLength: 2048 } }} /><Button type="submit" sx={{ mt: 1 }} disabled={busy || !value.trim()}>Verify pasted QR</Button></Box>
      <Typography variant="body2" color="text.secondary">QR images are decoded on this device; only the signed card value is sent to Hospiq. Camera permission is requested only when you start it.</Typography>
    </Stack>}
  </DialogContent><DialogActions><Button onClick={() => { stop(); onClose(); }}>Close</Button>{matched && <Button variant="contained" disabled={busy} onClick={startVisit}>{busy ? "Opening visit…" : ["pending", "skipped"].includes(matched.appointment.status) ? "Start visit & add medical record" : "Add medical record"}</Button>}</DialogActions></Dialog>;
}
