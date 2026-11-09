import { t as translate, useLocale } from "../i18n";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
import usePolling from '../hooks/usePolling';
import VisitCard from '../features/appointments/VisitCard';
import PharmacySummary from '../components/PharmacySummary';
export default function MyTokensPage() {
  useLocale();
  const {
    data,
    loading,
    error,
    updatedAt,
    refresh
  } = usePolling('/tokens/mine');
  const [claimCode, setClaimCode] = useState("");
  const [claimNotice, setClaimNotice] = useState("");
  const [status, setStatus] = useState(''),
    [date, setDate] = useState(''),
    [action, setAction] = useState(null),
    [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('');
  async function claimWalkIn() {
    setBusy(true);
    setActionError('');
    setClaimNotice('');
    try {
      const {
        data
      } = await axios.post('/tokens/claim', {
        code: claimCode.trim()
      });
      setClaimNotice(data.message);
      setClaimCode('');
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to link walk-in');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setActionError('');
    try {
      if (action.type === 'cancel') await axios.delete(`/tokens/${action.visit._id}`);else await axios.post(`/tokens/${action.visit._id}/reschedule`, {
        date: newDate
      });
      setAction(null);
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to update appointment');
    } finally {
      setBusy(false);
    }
  }
  const choose = (type, visit) => {
    setAction({
      type,
      visit
    });
    setNewDate(visit.date);
    setActionError('');
  };
  const visible = (data || []).filter(t => (!status || t.status === status) && (!date || t.date === date));
  return <Container maxWidth="lg" sx={{
    mt: 3
  }}><Stack direction="row" justifyContent="space-between" mb={3}><Typography variant="h4">{translate("My appointments")}</Typography><Button component={Link} to="/find-care" variant="contained">{translate("Book a visit")}</Button></Stack>{error && <Alert severity="warning" action={<Button onClick={refresh}>{translate("Retry")}</Button>}>{error}</Alert>}<Stack direction={{
      xs: 'column',
      sm: 'row'
    }} gap={2} mb={3}><TextField select label={translate("Status")} value={status} onChange={e => setStatus(e.target.value)} sx={{
        minWidth: 200
      }}><MenuItem value="">{translate("All appointments")}</MenuItem>{[['pending', 'Booked / waiting'], ['called', 'Called / consulting'], ['completed', 'Completed'], ['skipped', translate("Missed call")], ['cancelled', translate("Cancelled")]].map(([value, label]) => <MenuItem key={value} value={value}>{translate(label)}</MenuItem>)}</TextField><TextField label={translate("Visit date")} type="date" value={date} onChange={e => setDate(e.target.value)} slotProps={{
        inputLabel: {
          shrink: true
        }
      }} /><Button onClick={() => {
        setStatus('');
        setDate('');
      }}>{translate("Clear filters")}</Button></Stack>
    <Stack direction={{
      xs: 'column',
      sm: 'row'
    }} gap={1} mb={3}><TextField size="small" label={translate("Walk-in link code from reception")} value={claimCode} onChange={e => setClaimCode(e.target.value)} /><Button disabled={busy || !claimCode.trim()} onClick={claimWalkIn}>{translate("Link my walk-in")}</Button></Stack>{claimNotice && <Alert severity="success">{claimNotice}</Alert>}{!action && actionError && <Alert severity="error">{actionError}</Alert>}
    {loading ? <Skeleton variant="rounded" height={240} /> : <Stack gap={2}>{visible.map(visit => <VisitCard key={visit._id} visit={visit} busy={busy} onCancel={v => choose('cancel', v)} onReschedule={!visit.checkedInAt && visit.status !== 'called' ? v => choose('reschedule', v) : undefined} />)}</Stack>}{!loading && !visible.length && <Alert severity="info">No appointments match your filters.</Alert>}
    {updatedAt && <Typography variant="caption" display="block" my={2}>Last updated {updatedAt.toLocaleTimeString()}</Typography>}<PharmacySummary />
    <Dialog open={Boolean(action)} onClose={busy ? undefined : () => setAction(null)} fullWidth maxWidth="sm"><DialogTitle>{action?.type === 'cancel' ? translate("Cancel this visit?") : translate("Reschedule your visit")}</DialogTitle><DialogContent><Typography mb={2}>{action?.visit.doctorName} · {action?.visit.date}</Typography>{actionError && <Alert severity="error">{actionError}</Alert>}{action?.type === 'reschedule' ? <TextField fullWidth label={translate("New visit date")} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} slotProps={{
          inputLabel: {
            shrink: true
          }
        }} /> : <Typography>Your queue place will be released. You can book again if needed.</Typography>}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setAction(null)}>{translate("Keep appointment")}</Button><Button disabled={busy} variant="contained" onClick={submit}>{busy ? translate("Saving\u2026") : translate("Confirm")}</Button></DialogActions></Dialog>
  </Container>;
}
