import { t as translate, useLocale } from "../i18n";
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Alert, Button, Container, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
export default function PasswordRecoveryPage() {
  useLocale();
  const location = useLocation();
  const reset = location.pathname === '/reset-password';
  const [token] = useState(() => location.hash.slice(1));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (reset && password !== confirmation) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const {
        data
      } = await axios.post(reset ? '/auth/reset-password' : '/auth/forgot-password', reset ? {
        token,
        password
      } : {
        email
      });
      setMessage(data.message);
      if (reset) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.history.replaceState(null, '', '/reset-password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process your request. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  return <Container maxWidth="xs" sx={{
    py: 6
  }}><Stack component="form" onSubmit={submit} gap={3}><Typography variant="h4">{reset ? translate("Choose a new password") : translate("Recover your account")}</Typography>{error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}{!message && <>{reset ? <><TextField required type="password" label={translate("New password")} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} slotProps={{
            htmlInput: {
              minLength: 8
            }
          }} /><TextField required type="password" label={translate("Confirm password")} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></> : <TextField required type="email" autoComplete="email" label={translate("Account email")} value={email} onChange={e => setEmail(e.target.value)} />}<Button type="submit" variant="contained" disabled={busy}>{busy ? translate("Please wait\u2026") : reset ? translate("Reset password") : translate("Email reset link")}</Button></>}<Button component={Link} to="/login">{translate("Back to sign in")}</Button></Stack></Container>;
}
