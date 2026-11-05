import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Typography, Box, TextField, MenuItem, Button, Alert, Paper, Stack } from "@mui/material";
import axios from "../api/axios";
export default function BookingPage() {
  const { hospitalId } = useParams();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [department, setDepartment] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  useEffect(() => {
    let live = true;
    axios.get(`/hospitals/${hospitalId}`).then(({ data }) => { if (live) setHospital(data); }).catch(() => { if (live) setError("Unable to load this care provider."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [hospitalId]);
  useEffect(() => {
    let live = true;
    setDoctors([]); setDoctorId("");
    if (department) axios.get("/doctors", { params: { hospitalId, department } }).then(({ data }) => { if (live) setDoctors(data); }).catch(() => { if (live) setError("Unable to load doctors. Please try again."); });
    return () => { live = false; };
  }, [department, hospitalId]);
  async function book(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const { data } = await axios.post("/tokens/book", { doctorId }); setToken(data.token); }
    catch (err) { setError(err.response?.data?.message || "Unable to book. Please try again."); }
    finally { setBusy(false); }
  }
  return <Container maxWidth="md" sx={{ mt: 3 }}><Button component={Link} to="/" sx={{ mb: 2 }}>← Back to care providers</Button><Box className="page-hero"><Typography variant="overline">BOOK YOUR VISIT</Typography><Typography variant="h4">{hospital?.name || "Choose your care"}</Typography><Typography sx={{ mt: 1 }}>{hospital?.address || "Select a department and doctor to join today's queue."}</Typography></Box>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {token ? <Paper sx={{ p: 4, textAlign: "center" }}><Alert severity="success">Your appointment is confirmed.</Alert><Typography color="text.secondary" sx={{ mt: 3 }}>Your token number</Typography><Typography variant="h2" color="primary">#{token.tokenNumber}</Typography><Typography sx={{ my: 2 }}>Please arrive during your doctor's scheduled hours.</Typography><Button component={Link} to="/my-tokens" variant="contained">View my appointments</Button></Paper> : <Paper component="form" onSubmit={book} sx={{ p: { xs: 2, sm: 4 } }}><Typography variant="h6" mb={2}>Who would you like to see?</Typography><Stack gap={3}><TextField select required fullWidth label="Department" value={department} onChange={e => { setDepartment(e.target.value); setError(""); }} disabled={loading || !hospital}>{(hospital?.departments || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField><TextField select required fullWidth label="Doctor" value={doctorId} onChange={e => setDoctorId(e.target.value)} disabled={!department || !doctors.length}>{doctors.map(d => <MenuItem key={d._id} value={d._id} disabled={d.availabilityStatus !== "available"}>{d.name} · {d.specialization || d.department}{d.availabilityStatus !== "available" ? " (unavailable)" : ""}</MenuItem>)}</TextField>{department && !doctors.length && <Alert severity="info">No doctors listed for this department yet.</Alert>}<Typography variant="body2" color="text.secondary">Same-day tokens are issued during scheduled consultation hours. Availability is checked when you confirm.</Typography><Button type="submit" variant="contained" disabled={busy || !doctorId}>{busy ? "Confirming…" : "Confirm appointment"}</Button></Stack></Paper>}
  </Container>;
}
