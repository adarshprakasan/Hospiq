import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Alert, Button, Container, Paper, Stack, TablePagination, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
import { storedUser } from '../utils';
export default function HealthSummaryPage() {
  useLocale();
  const [summary, setSummary] = useState(null),
    [events, setEvents] = useState([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(0);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const user = storedUser();
    axios.get(`/health-profile/summary/${sessionStorage.getItem("patientContext") || user._id || user.id}`, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      setSummary(data);
      setError('');
    }).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Unable to load your health summary.');
    });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/health-profile/access-history', {
      signal: controller.signal,
      params: {
        page: page + 1
      }
    }).then(({
      data
    }) => {
      setEvents(data.items);
      setTotal(data.total);
    }).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Unable to load access history.');
    });
    return () => controller.abort();
  }, [page, retry]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const {
        data
      } = await axios.put('/health-profile/summary', summary);
      setSummary(data);
      setNotice('Health summary saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save summary.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="md" sx={{
      py: 3
    }}><Stack sx={{
      gap: 3
    }}><Typography variant="h4">{translate("My health summary")}</Typography><Alert severity="info">This is information you report yourself. Keep it up to date and confirm it with your clinician. A doctor needs your temporary record-access permission to read this shared summary.</Alert>{error && <Alert severity="error" action={<Button onClick={() => setRetry(v => v + 1)}>{translate("Reload")}</Button>}>{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}{summary && <Paper component="form" onSubmit={save} sx={{
          p: 3
        }}><Stack sx={{
      gap: 2
    }}>{[['allergies', translate("Allergies and reactions")], ['conditions', translate("Ongoing conditions")], ['currentMedications', translate("Current medications and doses")], ['emergencyContact', translate("Emergency contact")]].map(([key, label]) => <TextField key={key} label={translate(label)} multiline minRows={key === 'emergencyContact' ? 1 : 2} value={summary[key]} onChange={e => setSummary(s => ({
              ...s,
              [key]: e.target.value
            }))} />)}<Typography variant="caption">Source: patient-reported · {summary.updatedAt ? `Updated ${new Date(summary.updatedAt).toLocaleString()}` : 'Not yet saved'}</Typography><Button type="submit" variant="contained" disabled={busy}>{busy ? translate("Saving\u2026") : translate("Save summary")}</Button></Stack></Paper>}<Typography variant="h5">{translate("Who accessed my information?")}</Typography><Typography sx={{
      color: "text.secondary"
    }}>Successful history, health-summary and attachment requests are recorded here, including your own access. Entries begin when this feature was enabled.</Typography>{events.map(e => <Paper key={e._id} sx={{
          p: 2
        }}><Typography>{e.actorName} · {e.actorRole}</Typography><Typography variant="body2">{{
              'history-read': 'Opened medical history',
              'summary-read': 'Opened health summary',
              'attachment-download': 'Downloaded an attachment'
            }[e.action]} · {new Date(e.createdAt).toLocaleString()}</Typography></Paper>)}<TablePagination component="div" count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_event, value) => setPage(value)} /></Stack></Container>
  );
}
