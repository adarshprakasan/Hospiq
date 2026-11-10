import { t as translate, useLocale } from "../i18n";
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Chip, Container, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
export default function LabTestsPage() {
  useLocale();
  const {
    patientId
  } = useParams();
  const isDoctor = Boolean(patientId);
  const [orders, setOrders] = useState([]),
    [records, setRecords] = useState([]),
    [visits, setVisits] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [tests, setTests] = useState(''),
    [instructions, setInstructions] = useState(''),
    [visitId, setVisitId] = useState(''),
    [selectedResults, setSelectedResults] = useState({}),
    [consent, setConsent] = useState({});
  const refresh = useCallback(async () => {
    try {
      const [ordersResponse, historyResponse, visitResponse] = await Promise.all([axios.get('/labs', {
        params: {
          patientId
        }
      }), axios.get(isDoctor ? `/records/patient/${patientId}` : '/records/mine', {
        params: {
          page: 1,
          limit: 100
        }
      }), isDoctor ? axios.get('/tokens/my') : Promise.resolve({
        data: []
      })]);
      setOrders(ordersResponse.data);
      setRecords(historyResponse.data.items.filter(r => r.status !== 'draft' && r.attachments.some(a => a.kind === 'lab-report')));
      setVisits(visitResponse.data.filter(v => v.patientId === patientId && ['called', 'completed'].includes(v.status)));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load lab orders');
    }
  }, [patientId, isDoctor]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await axios.post('/labs', {
        patientId,
        visitId,
        tests: tests.split('\n').filter(t => t.trim()),
        instructions
      });
      setTests('');
      setInstructions('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to order tests');
    } finally {
      setBusy(false);
    }
  }
  async function status(order, next) {
    setBusy(true);
    setError('');
    try {
      await axios.post(`/labs/${order._id}/status`, {
        status: next,
        version: order.version,
        resultRecordId: selectedResults[order._id],
        shareWithDoctor: consent[order._id] === true
      });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update lab order');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="md" sx={{
      py: 3
    }}><Stack sx={{
      gap: 3
    }}><Typography variant="h4">{translate("Lab tests")}</Typography><Typography>Track ordered tests, specimen collection, uploaded results, and clinician review. Upload reports through Medical records, select the ordering doctor and confirm sharing, then link them below.</Typography><Button component={Link} to={isDoctor ? `/patients/${patientId}/records` : '/medical-records'}>Open medical records / upload results</Button>{error && <Alert severity="error" action={<Button onClick={refresh}>{translate("Refresh")}</Button>}>{error}</Alert>}{isDoctor && <Paper component="form" onSubmit={create} sx={{
          p: 3
        }}><Stack sx={{
      gap: 2
    }}><TextField required select label="Today's called or completed visit" value={visitId} onChange={e => setVisitId(e.target.value)}>{visits.map(v => <MenuItem key={v._id} value={v._id}>#{v.tokenNumber} · {v.date}</MenuItem>)}</TextField><TextField required multiline label={translate("Tests (one per line)")} value={tests} onChange={e => setTests(e.target.value)} /><TextField multiline label={translate("Instructions")} value={instructions} onChange={e => setInstructions(e.target.value)} /><Button type="submit" variant="contained" disabled={busy || !visitId}>{translate("Order tests")}</Button></Stack></Paper>}{orders.map(o => <Paper key={o._id} sx={{
          p: 3
        }}><Stack sx={{
      gap: 2
    }}><Stack direction="row" sx={{
      justifyContent: "space-between"
    }}><Typography variant="h6">{o.tests.join(', ')}</Typography><Chip label={o.status} /></Stack><Typography>{o.doctorId?.name} · {new Date(o.createdAt).toLocaleString()}</Typography><Typography>{o.instructions}</Typography>{['ordered', 'collected'].includes(o.status) && <><TextField select label={translate("Report record to link")} value={selectedResults[o._id] || ''} onChange={e => setSelectedResults(s => ({
                ...s,
                [o._id]: e.target.value
              }))}>{records.map(r => <MenuItem key={r._id} value={r._id}>{new Date(r.visitDate).toLocaleDateString()} · {r.hospitalName} · {r.attachments.map(a => a.originalName).join(', ')}</MenuItem>)}</TextField>{!isDoctor && <FormControlLabel label="Share this entire result record with the ordering doctor" control={<Checkbox checked={consent[o._id] || false} onChange={e => setConsent(s => ({
                ...s,
                [o._id]: e.target.checked
              }))} />} />}<Button disabled={busy || !selectedResults[o._id] || !isDoctor && !consent[o._id]} onClick={() => status(o, 'resulted')}>{translate("Attach result")}</Button></>}{isDoctor && <Stack direction="row" sx={{
      gap: 1
    }}>{o.status === 'ordered' && <Button disabled={busy} onClick={() => status(o, 'collected')}>{translate("Confirm specimen collected")}</Button>}{o.status === 'resulted' && <Button disabled={busy} onClick={() => status(o, 'reviewed')}>{translate("Mark reviewed")}</Button>}{['ordered', 'collected'].includes(o.status) && <Button disabled={busy} color="error" onClick={() => status(o, 'cancelled')}>{translate("Cancel order")}</Button>}</Stack>}{o.resultRecordId && <Button component={Link} to={isDoctor ? `/patients/${patientId}/records` : '/medical-records'}>{translate("Open report in medical records")}</Button>}<Typography variant="caption">{o.history.map(h => `${h.status}: ${new Date(h.at).toLocaleString()}`).join(' · ')}</Typography></Stack></Paper>)}{!orders.length && <Alert severity="info">{translate("No lab orders yet.")}</Alert>}</Stack></Container>
  );
}
