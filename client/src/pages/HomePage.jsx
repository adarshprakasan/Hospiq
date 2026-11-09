import { t as translate, useLocale } from "../i18n";
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Container, Skeleton, Stack, Typography } from '@mui/material';
import PharmacySummary from '../components/PharmacySummary';
import VisitCard from '../features/appointments/VisitCard';
import CareDirectory from '../features/discovery/CareDirectory';
import usePolling from '../hooks/usePolling';
import { activeStatus, storedUser } from '../utils';
export default function HomePage() {
  useLocale();
  const {
    data,
    loading,
    error,
    updatedAt,
    refresh
  } = usePolling('/tokens/mine');
  const visits = (data || []).filter(t => activeStatus(t.status) && (t.isToday || t.date > new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Dubai'
  }))).sort((a, b) => a.date.localeCompare(b.date) || a.tokenNumber - b.tokenNumber);
  return <Container maxWidth="lg" sx={{
    mt: 3
  }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}><Box><Typography variant="h4">Hello{storedUser()?.name ? `, ${storedUser().name.split(' ')[0]}` : ''}</Typography><Typography color="text.secondary">The selected patient’s next step in care, in one place.</Typography></Box><Button component={Link} to="/find-care" variant="contained">{translate("Book a visit")}</Button></Stack>

    {error && <Alert severity="warning" action={<Button onClick={refresh}>{translate("Retry")}</Button>}>{error}</Alert>}

    <Typography variant="h5" mb={2}>{translate("Your upcoming visits")}</Typography>

    {loading ? <Skeleton variant="rounded" height={240} /> : visits.length ? <Stack gap={2}>{visits.slice(0, 3).map(visit => <VisitCard key={visit._id} visit={visit} />)}</Stack> : <Alert severity="info">No upcoming visits. Find a care provider below.</Alert>}

    <Stack direction="row" gap={1} flexWrap="wrap" my={2}><Button component={Link} to="/my-tokens">{translate("All appointments")}</Button><Button component={Link} to="/medical-records">{translate("Records and permissions")}</Button><Button component={Link} to="/pharmacy">{translate("Pharmacy and receipts")}</Button></Stack>

    {updatedAt && <Typography variant="caption" color="text.secondary">Last updated {updatedAt.toLocaleTimeString()} · Updates automatically</Typography>}

    <Box my={3}><PharmacySummary /></Box><CareDirectory />

  </Container>;
}
