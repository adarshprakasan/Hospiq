import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Alert, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
export default function InventoryPage() {
  useLocale();
  const [batches, setBatches] = useState([]),
    [medications, setMedications] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState('');
  const [form, setForm] = useState({
    medicationId: '',
    batchNumber: '',
    expiresOn: '',
    quantity: ''
  });
  const [selected, setSelected] = useState(null),
    [delta, setDelta] = useState(''),
    [reason, setReason] = useState('Received'),
    [history, setHistory] = useState(null);
  async function refresh() {
    try {
      const [b, m] = await Promise.all([axios.get('/inventory'), axios.get('/medications')]);
      setBatches(b.data);
      setMedications(m.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load inventory');
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function add(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await axios.post('/inventory', {
        ...form,
        quantity: Number(form.quantity)
      });
      setForm({
        medicationId: '',
        batchNumber: '',
        expiresOn: '',
        quantity: ''
      });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add batch');
    } finally {
      setBusy(false);
    }
  }
  async function adjust() {
    setBusy(true);
    setError('');
    try {
      await axios.post(`/inventory/${selected._id}/movements`, {
        delta: Number(delta),
        reason,
        version: selected.version,
        requestId: selected.requestId
      });
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update stock');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="lg" sx={{
      py: 3
    }}><Stack sx={{
      gap: 3
    }}><Typography variant="h4">{translate("Stock and expiry")}</Typography><Alert severity="info">Record stock movements when goods physically arrive, are dispensed, or are discarded. Pharmacy payment and handover do not automatically change these batch counts. Quantities use the medication's selling unit.</Alert>{error && <Alert severity="error" action={<Button onClick={refresh}>{translate("Refresh")}</Button>}>{error}</Alert>}<Paper component="form" onSubmit={add} sx={{
          p: 3
        }}><Stack sx={{
      gap: 2
    }}><Typography variant="h6">{translate("Receive a new batch")}</Typography><TextField required select label={translate("Medication")} value={form.medicationId} onChange={e => setForm(f => ({
              ...f,
              medicationId: e.target.value
            }))}>{medications.map(m => <MenuItem key={m._id} value={m._id}>{m.name} · {m.sellingUnit}</MenuItem>)}</TextField><Stack direction={{
              xs: 'column',
              sm: 'row'
            }} sx={{
      gap: 2
    }}>{[['batchNumber', translate("Batch number"), 'text'], ['expiresOn', translate("Expiry date"), 'date'], ['quantity', translate("Opening quantity"), 'number']].map(([key, label, type]) => <TextField key={key} required type={type} label={translate(label)} value={form[key]} onChange={e => setForm(f => ({
                ...f,
                [key]: e.target.value
              }))} slotProps={{
                inputLabel: {
                  shrink: true
                },
                htmlInput: type === 'number' ? {
                  min: 0,
                  step: 1
                } : {}
              }} />)}</Stack><Button type="submit" disabled={busy} variant="contained">{translate("Add batch")}</Button></Stack></Paper><TextField label="Search medicine or batch" value={search} onChange={e => setSearch(e.target.value)} />{batches.filter(b => `${b.medicationId?.name} ${b.batchNumber}`.toLowerCase().includes(search.toLowerCase())).map(b => <Paper key={b._id} sx={{
          p: 3
        }}><Stack
      direction="row"
      sx={{
        gap: 1,
        flexWrap: "wrap"
      }}><Typography variant="h6" sx={{
              flex: 1
            }}>{b.medicationId?.name}</Typography>{b.expired ? <Chip color="error" label="Expired — do not dispense" /> : b.expiringSoon && <Chip color="warning" label="Expires within 30 days" />}{b.lowStock && <Chip label="Low stock (5 or fewer)" color="warning" />}</Stack><Typography>Batch {b.batchNumber} · Expires {b.expiresOn} · {b.quantity} {b.medicationId?.sellingUnit}</Typography><Button onClick={() => {
            setSelected({
              ...b,
              requestId: crypto.randomUUID()
            });
            setDelta('');
            setReason('Received');
          }}>{translate("Record movement")}</Button><Button onClick={async () => {
            try {
              const {
                data
              } = await axios.get(`/inventory/${b._id}/movements`);
              setHistory(data);
            } catch {
              setError('Unable to load movement history');
            }
          }}>{translate("Movement history")}</Button></Paper>)}</Stack><Dialog open={Boolean(selected)} onClose={busy ? undefined : () => setSelected(null)}><DialogTitle>Record stock movement</DialogTitle><DialogContent><Stack
      sx={{
        gap: 2,
        mt: 1
      }}><Typography>Use positive quantities for stock received and negative quantities for dispensing or waste. The current balance is {selected?.quantity}.</Typography><TextField type="number" label="Quantity change" value={delta} onChange={e => setDelta(e.target.value)} /><TextField select label={translate("Reason")} value={reason} onChange={e => setReason(e.target.value)}>{['Received', 'Dispensed', 'Stock correction', 'Wasted / expired'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField></Stack></DialogContent><DialogActions><Button onClick={() => setSelected(null)}>{translate("Cancel")}</Button><Button disabled={busy || !delta} onClick={adjust}>{translate("Save movement")}</Button></DialogActions></Dialog><Dialog open={Boolean(history)} onClose={() => setHistory(null)}><DialogTitle>Batch movement history</DialogTitle><DialogContent>{history?.map((m, i) => <Typography key={i}>{new Date(m.at).toLocaleString()} · {m.reason} · {m.delta > 0 ? '+' : ''}{m.delta}</Typography>)}</DialogContent><DialogActions><Button onClick={() => setHistory(null)}>{translate("Close")}</Button></DialogActions></Dialog></Container>
  );
}
