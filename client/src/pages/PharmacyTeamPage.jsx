import { useEffect, useState } from "react";
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export default function PharmacyTeamPage() {
  const [team, setTeam] = useState([]), [email, setEmail] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  async function refresh() { try { setTeam((await axios.get("/pharmacy/team")).data); } catch (err) { setError(err.response?.data?.message || "Unable to load pharmacy team"); } }
  useEffect(() => { refresh(); }, []);
  async function link(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const { data } = await axios.post("/pharmacy/team", { email }); setNotice(data.message); setEmail(""); await refresh(); }
    catch (err) { setError(err.response?.data?.message || "Unable to link pharmacist"); }
    finally { setBusy(false); }
  }
  return (
    <Container maxWidth="md" sx={{ mt: 3 }}><Stack sx={{
      gap: 3
    }}><Typography variant="h4">Pharmacy team</Typography><Typography>Link a registered pharmacist to your hospital. Accounts already assigned elsewhere cannot be moved here.</Typography>{error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}<Paper component="form" onSubmit={link} sx={{ p: 3 }}><Stack sx={{
      gap: 2
    }}><TextField required type="email" label="Registered pharmacist email" value={email} onChange={e => setEmail(e.target.value)} /><Button type="submit" disabled={busy} variant="contained">Assign to this hospital</Button></Stack></Paper>{team.map(user => <Paper key={user._id} sx={{ p: 2 }}><Typography>{user.name}</Typography><Typography sx={{
      color: "text.secondary"
    }}>{user.email}</Typography></Paper>)}</Stack></Container>
  );
}
