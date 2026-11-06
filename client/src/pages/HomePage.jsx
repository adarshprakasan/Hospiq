import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button, Alert, TextField, Chip, Stack, Skeleton, MenuItem } from "@mui/material";
import PatientIdentityCard from "../components/PatientIdentityCard";
import axios from "../api/axios";
import { activeStatus, statusColor, storedUser } from "../utils";
export default function HomePage() {
  const [hospitals, setHospitals] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  useEffect(() => {
    let live = true;
    Promise.allSettled([axios.get("/hospitals"), axios.get("/tokens/mine")]).then(results => {
      if (!live) return;
      if (results[0].status === "fulfilled") setHospitals(results[0].value.data);
      if (results[1].status === "fulfilled") setTokens(results[1].value.data);
      if (results.some(r => r.status === "rejected")) setError("Some information could not be loaded. Please refresh to try again.");
      setLoading(false);
    });
    return () => { live = false; };
  }, []);
  const active = tokens.filter(t => activeStatus(t.status));
  const visible = hospitals.filter(h => (!type || h.type === type) && [h.name, h.address, ...(h.departments || [])].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <Container maxWidth="lg" sx={{ mt: 3 }}>
    <Box className="page-hero"><Typography variant="overline">YOUR HEALTH, SIMPLIFIED</Typography><Typography variant="h4" sx={{ mt: 1 }}>A little less waiting.<br />A lot more care.</Typography><Typography sx={{ mt: 2 }}>Welcome{storedUser()?.name ? `, ${storedUser().name.split(" ")[0]}` : ""}. Find a hospital or clinic, choose your doctor, and keep your appointments in one place.</Typography><Button component={Link} to="/my-tokens" variant="contained" sx={{ mt: 2, bgcolor: "white", color: "primary.dark" }}>My appointments →</Button></Box>
    <PatientIdentityCard compact />
    {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h6">Your active appointments</Typography><Chip label={`${active.length} active`} color="primary" variant="outlined" /></Stack>
    {active.length ? <Box className="responsive-grid" mb={4}>{active.map(t => <Card key={t._id}><CardContent><Stack direction="row" justifyContent="space-between"><Typography variant="h5">#{t.tokenNumber}</Typography><Chip label={t.status} color={statusColor(t.status)} size="small" /></Stack><Typography sx={{ mt: 1 }}>{t.doctorName}</Typography><Typography color="text.secondary" variant="body2">{t.departmentName} · {t.date}</Typography></CardContent></Card>)}</Box> : !loading && <Alert severity="info" sx={{ mb: 4 }}>No active appointments. Find a care provider below to get started.</Alert>}
    <Typography variant="h5">Find your next care provider</Typography><Typography color="text.secondary" sx={{ mt: .5, mb: 2 }}>Explore hospitals, clinics, and their departments.</Typography>
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} mb={3}><TextField fullWidth label="Search by hospital, location, or department" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Facility type" value={type} onChange={e => setType(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All facilities</MenuItem><MenuItem value="Hospital">Hospitals</MenuItem><MenuItem value="Clinic">Clinics</MenuItem></TextField></Stack>
    {loading ? <Box className="responsive-grid">{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={220} />)}</Box> : <Box className="responsive-grid">{visible.map(h => <Card key={h._id}><CardContent sx={{ p: 3 }}><Chip size="small" label={h.type} sx={{ mb: 2 }} /><Typography variant="h6">{h.name}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 1, minHeight: 40 }}>{h.address}</Typography><Stack direction="row" gap={.5} flexWrap="wrap" my={2}>{(h.departments || []).slice(0, 4).map(d => <Chip key={d} label={d} size="small" variant="outlined" />)}</Stack><Button fullWidth variant="outlined" component={Link} to={`/book/${h._id}`}>Find a doctor →</Button></CardContent></Card>)}</Box>}
    {!loading && !visible.length && <Alert severity="info">{hospitals.length ? "No facilities match your search. Try another name or department." : "No care providers have been added yet."}</Alert>}
  </Container>;
}
