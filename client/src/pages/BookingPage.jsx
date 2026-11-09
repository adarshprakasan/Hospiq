import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Container, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material';
import axios from '../api/axios';
import { storedUser } from '../utils';
export default function BookingPage() {
  useLocale();
  const {
    hospitalId
  } = useParams();
  const [params] = useSearchParams();
  const [hospital, setHospital] = useState(null),
    [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState(params.get('doctor') || ''),
    [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Dubai'
  }));
  const [schedule, setSchedule] = useState(null),
    [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([axios.get(`/hospitals/${hospitalId}`, {
      signal: controller.signal
    }), axios.get(`/doctors/hospital/${hospitalId}`, {
      signal: controller.signal
    })]).then(([h, d]) => {
      setHospital(h.data);
      setDoctors(d.data);
      setError('');
    }).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Unable to load this provider. Please retry.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [hospitalId, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setSchedule(null);
    if (doctorId) {
      setScheduleLoading(true);
      axios.get(`/schedule/${doctorId}`, {
        signal: controller.signal
      }).then(({
        data
      }) => setSchedule(data)).catch(err => {
        if (err.code !== 'ERR_CANCELED') setError('No schedule is available for this doctor. Choose another doctor or contact the facility.');
      }).finally(() => {
        if (!controller.signal.aborted) setScheduleLoading(false);
      });
    }
    return () => controller.abort();
  }, [doctorId, retry]);
  const doctor = doctors.find(d => d._id === doctorId);
  const day = date && Number.isFinite(Date.parse(date)) ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC'
  }) : '';
  const hours = schedule?.weeklySchedule.find(d => d.day === day && d.isAvailable),
    closed = schedule?.closedDates?.includes(date);
  const user = storedUser();
  async function book() {
    setBusy(true);
    setError('');
    try {
      const {
        data
      } = await axios.post('/tokens/book', {
        doctorId,
        date
      });
      setToken(data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to book. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return <Container maxWidth="lg" sx={{
    py: 3
  }}><Button component={Link} to="/find-care">{translate("Back to care providers")}</Button><Typography variant="h4" mt={2}>{hospital?.name || 'Choose your care'}</Typography><Typography color="text.secondary" mb={3}>{hospital?.address}</Typography>
    {error && <Alert severity="error" action={<Button onClick={() => setRetry(v => v + 1)}>{translate("Retry")}</Button>} sx={{
      mb: 2
    }}>{error}</Alert>}
    {token ? <Paper sx={{
      p: 4
    }}><Alert severity="success">{translate("Your queue booking is confirmed.")}</Alert><Typography variant="h3" my={2}>#{token.tokenNumber}</Typography><Typography>{doctor?.name} · {token.date} · {hours?.startTime}–{hours?.endTime}</Typography><Typography my={2}>Arrive during consultation hours and check in at reception. Your queue number is not a fixed appointment time. You can cancel or reschedule before check-in.</Typography><Button component={Link} to="/my-tokens" variant="contained">{translate("View appointment and QR")}</Button></Paper> : <Stack direction={{
      xs: 'column',
      md: 'row'
    }} gap={3} alignItems="flex-start"><Box sx={{
        flex: 1,
        width: '100%'
      }}><TextField fullWidth label={translate("Search doctor or specialty")} value={search} onChange={e => setSearch(e.target.value)} sx={{
          mb: 2
        }} />{loading ? <Skeleton variant="rounded" height={200} /> : <Stack gap={2}>{doctors.filter(d => [d.name, d.specialization, d.department].join(' ').toLowerCase().includes(search.toLowerCase())).map(d => <Paper key={d._id} sx={{
            p: 3,
            border: '2px solid',
            borderColor: doctorId === d._id ? 'primary.main' : 'divider'
          }}><Typography variant="h6">{d.name}</Typography><Typography>{d.specialization || d.department}</Typography><Typography color="text.secondary">{(d.qualifications || []).join(' · ')}</Typography>{d.languages?.length > 0 && <Typography>Languages: {d.languages.join(', ')}</Typography>}<Chip size="small" label={d.availabilityStatus === 'available' ? translate("Available today") : translate("Unavailable today")} sx={{
              my: 1
            }} /><Button fullWidth variant={doctorId === d._id ? 'contained' : 'outlined'} onClick={() => {
              setDoctorId(d._id);
              setError('');
            }}>{doctorId === d._id ? translate("Selected") : translate("Choose doctor")}</Button></Paper>)}{!doctors.length && <Alert severity="info">No doctors are listed at this facility yet.</Alert>}</Stack>}</Box><Paper sx={{
        p: 3,
        width: {
          xs: '100%',
          md: 360
        },
        position: {
          md: 'sticky'
        },
        top: 24
      }}><Stack gap={2}><Typography variant="h6">{translate("Review your visit")}</Typography><TextField type="date" label={translate("Visit date")} value={date} onChange={e => setDate(e.target.value)} slotProps={{
            inputLabel: {
              shrink: true
            }
          }} /><Typography>{doctor?.name || translate("Choose a doctor")}</Typography>{scheduleLoading ? <Skeleton /> : doctorId && <Alert severity={hours && !closed ? 'info' : 'warning'}>{hours && !closed ? `Consultation hours: ${hours.startTime}–${hours.endTime}. Dates use the facility scheduling timezone.` : 'No consultation hours on this date. Choose another date.'}</Alert>}<Typography variant="body2">Join the queue up to 90 days ahead. This does not reserve an exact time. Cancel or reschedule before check-in; availability is checked at confirmation.</Typography>{user?.role === 'patient' ? <Button variant="contained" disabled={busy || !doctor || !hours || closed || scheduleLoading} onClick={book}>{busy ? 'Confirming…' : translate("Confirm queue booking")}</Button> : <Button component={Link} to={`/login?returnTo=${encodeURIComponent(`/book/${hospitalId}?doctor=${doctorId}`)}`} variant="contained">{translate("Sign in to book")}</Button>}</Stack></Paper></Stack>}
  </Container>;
}
