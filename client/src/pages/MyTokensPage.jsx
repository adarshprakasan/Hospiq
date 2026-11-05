import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Paper, Button, TextField, MenuItem, Alert, Chip, Stack, CircularProgress } from "@mui/material";
import axios from "../api/axios";
import PrintableQRCode from "../components/PrintableQRCode";
import { activeStatus, statusColor } from "../utils";
export default function MyTokensPage() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    let live = true;
    axios.get("/tokens/mine").then(({ data }) => { if (live) setTokens(data); }).catch(() => { if (live) setError("Unable to load appointments."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  async function cancel(id) {
    setBusy(id); setError("");
    try { await axios.delete(`/tokens/${id}`); setTokens(previous => previous.map(t => t._id === id ? { ...t, status: "cancelled" } : t)); }
    catch (err) { setError(err.response?.data?.message || "Unable to cancel appointment."); }
    finally { setBusy(null); }
  }
  const visible = tokens.filter(t => (!status || t.status === status) && (!date || t.date === date));
  return <Container maxWidth="lg" sx={{ mt: 3 }}><Box className="page-hero"><Typography variant="overline">YOUR CARE JOURNEY</Typography><Typography variant="h4">My appointments</Typography><Typography sx={{ mt: 1 }}>Your tokens, visit history, and booking details, all together.</Typography></Box>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} mb={3}><TextField select label="Status" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All appointments</MenuItem>{["pending", "called", "skipped", "completed", "cancelled"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField><TextField label="Visit date" type="date" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><Button onClick={() => { setStatus(""); setDate(""); }}>Clear filters</Button><Button component={Link} to="/" sx={{ ml: { sm: "auto" } }} variant="contained">Book a visit</Button></Stack>
    {loading ? <CircularProgress aria-label="Loading appointments" /> : <Box className="responsive-grid">{visible.map(t => <Paper key={t._id} sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" mb={2}><Typography variant="h5">#{t.tokenNumber}</Typography><Chip label={t.status} color={statusColor(t.status)} size="small" /></Stack><Typography variant="h6">{t.doctorName}</Typography><Typography color="text.secondary" mb={2}>{t.departmentName} · {t.date}</Typography><PrintableQRCode token={t} />{activeStatus(t.status) && <Button color="error" disabled={busy === t._id} onClick={() => cancel(t._id)} sx={{ display: "block", mt: 2 }}>{busy === t._id ? "Cancelling…" : "Cancel appointment"}</Button>}</Paper>)}</Box>}
    {!loading && !visible.length && <Alert severity="info">No appointments match your filters.</Alert>}
  </Container>;
}
