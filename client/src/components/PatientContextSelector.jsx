import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import axios from '../api/axios';
export default function PatientContextSelector({
  user
}) {
  useLocale();
  const [profiles, setProfiles] = useState([]),
    [error, setError] = useState('');
  const selected = sessionStorage.getItem('patientContext') || '';
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/family', {
      signal: controller.signal
    }).then(({
      data
    }) => setProfiles(data.profiles || [])).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Unable to load family profiles');
    });
    return () => controller.abort();
  }, []);
  function change(value) {
    if (value) sessionStorage.setItem('patientContext', value);else sessionStorage.removeItem('patientContext');
    window.location.assign('/');
  }
  return (
    <Stack
      direction={{
        xs: 'column',
        sm: 'row'
      }}
      sx={{
        gap: 1,

        alignItems: {
          sm: 'center'
        },

        px: 3,
        py: 1,
        bgcolor: selected ? '#fff4dc' : 'background.paper'
      }}>{error && <Alert severity="warning">{error}</Alert>}<TextField select size="small" label={translate("Care for")} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} value={selected} onChange={e => change(e.target.value)} sx={{
        minWidth: 220
      }}><MenuItem value="">Myself — {user.name}</MenuItem>{profiles.map(p => <MenuItem key={p._id} value={p._id}>{p.name} · {p.relationship}</MenuItem>)}</TextField>{selected && <Alert severity="info">Bookings, records and pharmacy now belong to the selected person.</Alert>}<Button component={Link} to="/family">{translate("Manage family access")}</Button></Stack>
  );
}
