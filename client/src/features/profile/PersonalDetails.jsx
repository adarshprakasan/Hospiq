import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../../api/axios';

export default function PersonalDetails({ profile, onChange }) {
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '');
  const [address, setAddress] = useState(profile.address || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await axios.put('/profile/me/personal', { dateOfBirth, address });
      await onChange();
      setNotice('Personal information saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save personal information.');
    } finally { setBusy(false); }
  }
  return <Paper variant="outlined" sx={{ p: 3 }}>
    <Stack component="form" gap={2} onSubmit={save}>
      <Typography component="h2" variant="h6">Additional personal information</Typography>
      <Typography color="text.secondary">Optional and private to your account. Clear a field and save to remove it. These details do not change family access permissions.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <TextField label="Date of birth" type="date" value={dateOfBirth} disabled={busy}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: '1900-01-01', max: new Date().toISOString().slice(0, 10) } }}
        onChange={event => setDateOfBirth(event.target.value)} />
      <TextField label="Address" multiline maxRows={4} value={address} disabled={busy}
        slotProps={{ htmlInput: { maxLength: 500 } }} onChange={event => setAddress(event.target.value)} />
      <Button type="submit" variant="outlined" disabled={busy} sx={{ alignSelf: 'flex-start' }}>Save personal information</Button>
    </Stack>
  </Paper>;
}
