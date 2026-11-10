import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem } from '@mui/material';
import axios from '../api/axios';
import { signOut } from '../utils/session';

export default function SignOutMenuItem({ label }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true); setError('');
    try {
      await axios.post('/auth/sign-out');
      signOut();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke your session. Please retry.');
    } finally { setBusy(false); }
  }
  return <>
    <MenuItem onClick={() => setOpen(true)}>{label}</MenuItem>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} aria-labelledby="menu-signout-title">
      <DialogTitle id="menu-signout-title">Sign out of this browser?</DialogTitle>
      <DialogContent>Save any unfinished changes before signing out.
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        <Button disabled={busy} color="error" onClick={confirm}>Sign out</Button>
      </DialogActions>
    </Dialog>
  </>;
}
