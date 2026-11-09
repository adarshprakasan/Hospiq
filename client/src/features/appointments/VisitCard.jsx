import { t as translate, useLocale } from "../../i18n";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, Paper, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import axios from '../../api/axios';
import { activeStatus, statusColor, statusLabel } from '../../utils';
export default function VisitCard({
  visit,
  onCancel,
  onReschedule,
  busy
}) {
  useLocale();
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const active = activeStatus(visit.status);
  async function showQr() {
    if (qr) {
      setQr('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const {
        data
      } = await axios.get('/qr/me');
      const match = data.visits.find(v => v.tokenId === visit._id);
      if (!match) throw new Error('This visit code is no longer active. Refresh your appointments.');
      setQr(match.qrValue);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load QR');
    } finally {
      setLoading(false);
    }
  }
  const step = visit.status === 'completed' ? 4 : visit.consultationStartedAt ? 3 : visit.checkedInAt ? 2 : 1;
  return <Paper sx={{
    p: {
      xs: 2,
      sm: 3
    }
  }}>
    <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="h6">{visit.doctorName}</Typography><Chip label={translate(statusLabel(visit))} color={statusColor(visit.status)} /></Stack>
    <Typography color="text.secondary">{visit.hospitalName} · {visit.departmentName}</Typography>
    <Typography sx={{
      my: 2
    }} fontWeight={700}>{visit.date} · Queue #{visit.tokenNumber}</Typography>
    {visit.peopleAhead !== undefined && <Typography variant="body2" mb={1}>{visit.peopleAhead} checked-in patients ahead of you. Priority changes may affect the order.</Typography>}
    {visit.waitEstimate && <Alert severity="info" sx={{
      mb: 2
    }}>Estimated wait: {visit.waitEstimate.lowMinutes}–{visit.waitEstimate.highMinutes} minutes, based on {visit.waitEstimate.sampleSize} measured consultations. Delays can change this estimate.</Alert>}
    {visit.status !== 'cancelled' && <Stepper activeStep={step} alternativeLabel sx={{
      mb: 3
    }}>{[translate("Booked"), translate("Check in"), translate("Waiting"), translate("Consultation")].map(label => <Step key={translate(label)}><StepLabel>{translate(label)}</StepLabel></Step>)}</Stepper>}
    <Typography variant="body2" mb={2}>{visit.status === 'completed' ? 'Consultation complete. Check your records and any pharmacy order below.' : visit.consultationStartedAt ? translate("Your consultation is in progress.") : visit.status === 'called' ? translate("Your doctor has called you. Please go to the consultation room.") : visit.checkedInAt ? translate("You are checked in. Please wait for your doctor to call you.") : 'Check in with reception when you arrive. This is a queue booking, not a fixed-time appointment.'}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap">
      {active && visit.isToday && <Button variant="contained" disabled={loading} onClick={showQr}>{loading ? translate("Loading\u2026") : qr ? translate("Hide visit QR") : translate("Show visit QR")}</Button>}
      {visit.address && <Button component="a" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.address)}`}>{translate("Directions")}</Button>}
      {visit.hospitalId && <Button component={Link} to={`/book/${visit.hospitalId}?doctor=${visit.doctorId}`}>{visit.status === 'completed' ? translate("Book follow-up") : translate("Book again")}</Button>}
      {active && !visit.consultationStartedAt && onReschedule && <Button disabled={busy} onClick={() => onReschedule(visit)}>{translate("Reschedule")}</Button>}
      {active && !visit.consultationStartedAt && onCancel && <Button color="error" disabled={busy} onClick={() => onCancel(visit)}>{translate("Cancel visit")}</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{
      mt: 2
    }}>{error}</Alert>}
    {qr && active && visit.isToday && <Box sx={{
      mt: 3,
      textAlign: 'center',
      bgcolor: 'white',
      p: 2
    }}><QRCodeSVG value={qr} size={200} title="Signed QR for this appointment" /><Typography variant="caption" display="block">{translate("Show this code to your treating doctor.")}</Typography></Box>}
  </Paper>;
}
