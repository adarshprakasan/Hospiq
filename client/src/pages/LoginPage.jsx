import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Container, Typography, TextField, Button, Alert } from "@mui/material";
import axios from "../api/axios";
import { storedUser } from "../utils";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = storedUser();
  if (user && localStorage.getItem("token")) return <Navigate to={user.role === "patient" ? "/" : user.role === "pharmacist" ? "/pharmacy" : "/dashboard"} replace />;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { data } = await axios.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "patient" ? "/" : data.user.role === "pharmacist" ? "/pharmacy" : "/dashboard", { replace: true });
    } catch (err) { setError(err.response?.data?.message || "Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  }
  return <Container component="form" onSubmit={submit} maxWidth="xs" sx={{ mt: 8, p: 4, bgcolor: "background.paper", borderRadius: 4, border: "1px solid #e0e9e8" }}>
    <Typography variant="h4" color="primary" gutterBottom>✚ Hospiq</Typography><Typography variant="h5">Welcome back</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Your care, connected.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField fullWidth margin="normal" label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
    <TextField fullWidth margin="normal" label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
    <Button fullWidth variant="contained" type="submit" disabled={busy} sx={{ mt: 2 }}>{busy ? "Signing in…" : "Sign in"}</Button>
    <Button fullWidth component={Link} to="/register" sx={{ mt: 2 }}>Create a patient account</Button><Button fullWidth component={Link} to="/hospital-register">Register a hospital or clinic</Button>
  </Container>;
}
