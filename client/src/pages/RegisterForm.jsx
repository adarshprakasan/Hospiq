import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Typography, TextField, Button, MenuItem, Stack, Alert } from "@mui/material";
import axios from "../api/axios";
export default function RegisterForm({ professional = false }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: professional ? "hospital_admin" : "patient" });
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const change = e => setForm(previous => ({ ...previous, [e.target.name]: e.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (step === 1) { await axios.post("/auth/send-otp", { email: form.email }); setStep(2); }
      else { const verification = await axios.post("/auth/verify-otp", { email: form.email, otp }); await axios.post("/auth/register", { ...form, verificationToken: verification.data.verificationToken }); navigate("/login", { replace: true }); }
    } catch (err) { setError(err.response?.data?.message || "Unable to complete registration. Please try again."); }
    finally { setBusy(false); }
  }
  return <Container maxWidth="sm" component="form" onSubmit={submit} sx={{ mt: 6, p: { xs: 3, sm: 4 }, borderRadius: 4, bgcolor: "background.paper", border: "1px solid #e0e9e8" }}><Typography variant="h4" color="primary" gutterBottom>✚ Hospiq</Typography><Typography variant="h5">{step === 2 ? "Check your inbox" : professional ? "Connect your care team" : "Your care starts here"}</Typography><Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{step === 2 ? `Enter the six-digit code sent to ${form.email}.` : professional ? "Create a Hospital/Clinic Admin account. Your administrator creates employee accounts." : "Create a patient account to find care and manage appointments."}</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack gap={2}>{step === 1 ? <><TextField label="Full name" name="name" required autoComplete="name" value={form.name} onChange={change} /><TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={change} /><TextField label="Password" name="password" type="password" autoComplete="new-password" required slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} helperText="Use at least 8 characters." value={form.password} onChange={change} />{professional && <TextField label="Role" select name="role" value={form.role} onChange={change}><MenuItem value="hospital_admin">Hospital / Clinic Admin</MenuItem></TextField>}</> : <><TextField label="Verification code" required value={otp} autoComplete="one-time-code" onChange={e => setOtp(e.target.value)} slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 } }} /><Button onClick={() => { setStep(1); setOtp(""); setError(""); }}>Change details or request a new code</Button></>}<Button type="submit" variant="contained" disabled={busy}>{busy ? "Please wait…" : step === 1 ? "Send verification code" : "Verify and create account"}</Button><Button component={Link} to="/login">Already have an account? Sign in</Button></Stack>
  </Container>;
}
