import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';

export function useSavedCare(enabled) {
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    axios.get('/profile/me/saved', { signal: controller.signal }).then(({ data }) => {
      setSaved(data);
      setError('');
    }).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Could not load saved care.');
    });
    return () => controller.abort();
  }, [enabled, revision]);

  async function toggle(kind, id) {
    const key = kind === 'doctor' ? 'doctors' : 'hospitals';
    const exists = saved[key].some(item => item._id === id);
    const path = `/profile/me/saved/${kind}/${id}`;
    setBusy(true);
    setError('');
    try {
      if (exists) await axios.delete(path);
      else await axios.put(path);
      const { data } = await axios.get('/profile/me/saved');
      setSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update saved care. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  }

  return { saved, error, busy, toggle, retry: () => setRevision(value => value + 1) };
}

export function SaveCareButton({ care, kind, id, name }) {
  if (!care.saved) return null;
  const key = kind === 'doctor' ? 'doctors' : 'hospitals';
  const saved = care.saved[key].some(item => item._id === id);
  return <Button disabled={care.busy} aria-pressed={saved} aria-label={`Save ${name}`} onClick={() => care.toggle(kind, id)}>
    {saved ? 'Saved · remove' : `Save ${kind === 'doctor' ? 'doctor' : 'facility'}`}
  </Button>;
}

export default function SavedCare() {
  const care = useSavedCare(true);
  return (
    <Stack sx={{
      gap: 2
    }}>
      {care.error && <Alert severity="error" action={<Button onClick={care.retry}>Retry</Button>}>{care.error}</Alert>}
      {!care.saved && !care.error && <CircularProgress aria-label="Loading saved care" />}
      {care.saved && ['doctors', 'hospitals'].map(key => <Paper variant="outlined" sx={{ p: 3 }} key={key}>
        <Stack sx={{
          gap: 2
        }}>
          <Typography component="h2" variant="h6">{key === 'doctors' ? 'Saved doctors' : 'Saved hospitals and clinics'}</Typography>
          {!care.saved[key].length && <Typography sx={{
            color: "text.secondary"
          }}>Your saved providers will appear here.</Typography>}
          {care.saved[key].map(item => {
            const doctor = key === 'doctors';
            const path = doctor ? `/book/${item.hospitalId._id}?doctor=${item._id}` : `/book/${item._id}`;
            return (
              <Stack
                key={item._id}
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  gap: 1,
                  justifyContent: "space-between"
                }}>
                <div>
                  <Typography sx={{
                    fontWeight: 700
                  }}>{item.name}</Typography>
                  <Typography sx={{
                    color: "text.secondary"
                  }}>{doctor ? [item.department, item.hospitalId.name].filter(Boolean).join(' · ') : item.address}</Typography>
                </div>
                <Stack direction="row" sx={{
                  gap: 1
                }}>
                  <Button component={Link} to={path}>View availability</Button>
                  <Button disabled={care.busy} aria-label={`Remove ${item.name}`} onClick={() => care.toggle(doctor ? 'doctor' : 'hospital', item._id)}>Remove</Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Paper>)}
      <Button component={Link} to="/find-care" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Browse care providers</Button>
    </Stack>
  );
}
