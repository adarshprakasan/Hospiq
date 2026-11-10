import { t as translate, useLocale } from "../i18n";
import { LanguageSwitcher } from "../i18n";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Container, Typography, TextField, Button, Alert } from "@mui/material";
import axios from "../api/axios";
import { storedUser, roleHome } from "../utils";
export default function LoginPage() {
  useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");
  const destination = user => user.role === "patient" && returnTo?.startsWith("/book/") && !returnTo.includes("//") ? returnTo : roleHome(user);
  const user = storedUser();
  if (user && localStorage.getItem("token")) return <Navigate to={destination(user)} replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const {
        data
      } = await axios.post("/auth/login", {
        email,
        password
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(destination(data.user), {
        replace: true
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container component="form" onSubmit={submit} maxWidth="xs" sx={{
      mt: 8,
      p: 4,
      bgcolor: "background.paper",
      borderRadius: 4,
      border: "1px solid #e0e9e8"
    }}>
      <LanguageSwitcher /><Typography variant="h4" color="primary" gutterBottom>✚ Hospiq</Typography><Typography variant="h5">{translate("Welcome back")}</Typography><Typography
      sx={{
        color: "text.secondary",
        mb: 2
      }}>{translate("Your care, connected.")}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField fullWidth margin="normal" label={translate("Email")} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <TextField fullWidth margin="normal" label={translate("Password")} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      <Button fullWidth variant="contained" type="submit" disabled={busy} sx={{
        mt: 2
      }}>{busy ? "Signing in…" : translate("Sign in")}</Button>
      <Button fullWidth component={Link} to="/forgot-password">{translate("Forgot password?")}</Button><Button fullWidth component={Link} to="/find-care">{translate("Browse care providers")}</Button><Button fullWidth component={Link} to="/register" sx={{
        mt: 2
      }}>{translate("Create a patient account")}</Button><Button fullWidth component={Link} to="/hospital-register">{translate("Register a hospital or clinic")}</Button>
    </Container>
  );
}
