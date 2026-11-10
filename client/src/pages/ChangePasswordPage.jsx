import { t as translate, useLocale } from "../i18n";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Container, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export default function ChangePasswordPage() {
  useLocale();
  const [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("The new passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await axios.post("/auth/change-password", {
        currentPassword,
        password
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", {
        replace: true
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to change password");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="sm" component="form" onSubmit={submit} sx={{
      mt: 6
    }}><Stack sx={{
      gap: 3
    }}><Typography variant="h4">Choose your own password</Typography><Typography>Temporary credentials must be replaced before accessing your workspace. Changing your password signs out existing sessions.</Typography>{error && <Alert severity="error">{error}</Alert>}<TextField required label="Current / temporary password" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrent(e.target.value)} /><TextField required label={translate("New password")} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} slotProps={{
          htmlInput: {
            minLength: 8,
            maxLength: 72
          }
        }} /><TextField required label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /><Button variant="contained" type="submit" disabled={busy}>Change password and sign out</Button></Stack></Container>
  );
}
