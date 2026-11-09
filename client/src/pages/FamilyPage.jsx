import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Container, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
export default function FamilyPage() {
  useLocale();
  const [data, setData] = useState({
      profiles: [],
      granted: []
    }),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [name, setName] = useState(''),
    [dateOfBirth, setDateOfBirth] = useState(''),
    [guardianConfirmation, setGuardianConfirmation] = useState(false),
    [email, setEmail] = useState(''),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const response = await axios.get('/family');
      setData(response.data);
    } catch {
      setError('Unable to load family access');
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function add(event, kind) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axios.post(`/family/${kind}`, kind === 'dependents' ? {
        name,
        dateOfBirth,
        guardianConfirmation
      } : {
        email,
        confirm
      });
      setNotice(kind === 'dependents' ? 'Dependent profile created. Choose them in Care for.' : 'Access granted for 30 days. You can revoke it below.');
      setName('');
      setDateOfBirth('');
      setGuardianConfirmation(false);
      setEmail('');
      setConfirm(false);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save family access');
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id) {
    setBusy(true);
    try {
      await axios.delete(`/family/delegations/${id}`);
      await refresh();
    } catch {
      setError('Unable to revoke access');
    } finally {
      setBusy(false);
    }
  }
  return <Container maxWidth="md" sx={{
    py: 3
  }}><Stack gap={3}><Typography variant="h4">{translate("Family and delegated access")}</Typography><Typography>These settings belong to your own account, regardless of the person currently selected in Care for.</Typography>{error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}<Paper component="form" onSubmit={e => add(e, 'dependents')} sx={{
        p: 3
      }}><Stack gap={2}><Typography variant="h6">{translate("Add a child you care for")}</Typography><TextField required label={translate("Child's full name")} value={name} onChange={e => setName(e.target.value)} /><TextField required type="date" label={translate("Date of birth")} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} slotProps={{
            inputLabel: {
              shrink: true
            }
          }} /><FormControlLabel label="I confirm I am this child's parent or authorized guardian and may manage their care." control={<Checkbox checked={guardianConfirmation} onChange={e => setGuardianConfirmation(e.target.checked)} />} /><Typography variant="body2">For children under 18. Guardian access stops at 18; contact the facility to arrange an independent account. Consent codes are sent to your email.</Typography><Button type="submit" variant="contained" disabled={busy || !guardianConfirmation}>{translate("Create dependent profile")}</Button></Stack></Paper><Paper component="form" onSubmit={e => add(e, 'delegations')} sx={{
        p: 3
      }}><Stack gap={2}><Typography variant="h6">{translate("Let someone manage my care")}</Typography><TextField required type="email" label={translate("Their registered patient email")} value={email} onChange={e => setEmail(e.target.value)} /><FormControlLabel label="I allow this person to view my medical history and attachments, book/cancel visits, manage my health summary and handle pharmacy orders for 30 days." control={<Checkbox checked={confirm} onChange={e => setConfirm(e.target.checked)} />} /><Button type="submit" variant="outlined" disabled={busy || !confirm}>{translate("Grant access for 30 days")}</Button></Stack></Paper><Typography variant="h6">{translate("People with access to my care")}</Typography>{data.granted.map(g => <Paper key={g._id} sx={{
        p: 2
      }}><Typography>{g.name} · {g.email}</Typography><Typography>Until {new Date(g.expiresAt).toLocaleString()}</Typography><Button color="error" disabled={busy} onClick={() => revoke(g._id)}>{translate("Revoke access")}</Button></Paper>)}{!data.granted.length && <Typography>{translate("No active delegated access.")}</Typography>}</Stack></Container>;
}
