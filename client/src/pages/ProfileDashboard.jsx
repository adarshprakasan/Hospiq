import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Paper, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import axios from '../api/axios';
import AccountDetails from '../features/profile/AccountDetails';
import PersonalDetails from '../features/profile/PersonalDetails';
import MeasurementsPanel from '../features/profile/MeasurementsPanel';
import SavedCare from '../features/profile/SavedCare';
import { LanguageSwitcher } from '../i18n';
import { downloadText } from '../utils/download';
import { signOut } from '../utils/session';
import { roleLabel } from '../utils';

const patientSections = [['health', 'Health & measurements'], ['saved', 'Saved care']];
const supportUrl = 'https://github.com/adarshprakasan/Hospiq/blob/master/SUPPORT.md';

function ProfileLinks({ title, description, links }) {
  return <Paper variant="outlined" sx={{ p: 3 }}>
    <Stack gap={1}>
      <Typography component="h2" variant="h6">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {links.map(([label, path]) => <Button key={path} component={Link} to={path}>{label}</Button>)}
      </Stack>
    </Stack>
  </Paper>;
}

export default function ProfileDashboard() {
  const [params, setParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [logout, setLogout] = useState(null);
  const [logoutError, setLogoutError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    axios.get('/profile/me', { signal: controller.signal }).then(({ data }) => setProfile(data)).catch(err => {
      if (err.code !== 'ERR_CANCELED') setLoadError('Could not load your profile.');
    });
    return () => controller.abort();
  }, [revision]);

  async function refresh() {
    const { data } = await axios.get('/profile/me');
    setProfile(data);
  }

  async function confirmSignOut() {
    setBusy(true);
    setLogoutError('');
    try {
      await axios.post(logout === 'all' ? '/auth/sign-out-all' : '/auth/sign-out');
      signOut();
    } catch (err) {
      setLogoutError(err.response?.data?.message || 'Could not revoke your session. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <Container maxWidth="md" sx={{ py: 4 }}>
    <Alert severity="error" action={<Button onClick={() => { setLoadError(''); setRevision(value => value + 1); }}>Retry</Button>}>{loadError}</Alert>
  </Container>;
  if (!profile) return <Box textAlign="center" py={8}><CircularProgress aria-label="Loading profile" /></Box>;

  const patient = profile.role === 'patient';
  const sections = [['account', 'Account'], ...(patient ? patientSections : []), ['privacy', 'Privacy & security'], ['help', 'Help & about']];
  const section = sections.some(([key]) => key === params.get('section')) ? params.get('section') : 'account';
  const name = profile.preferredName || profile.name;
  const openLogout = mode => { setLogoutError(''); setLogout(mode); };

  function exportProfile() {
    const { photo, savedDoctorIds, savedHospitalIds, ...details } = profile;
    downloadText('hospiq-profile.json', JSON.stringify({
      ...details, hasPhoto: Boolean(photo), savedDoctorIds, savedHospitalIds,
    }, null, 2));
  }

  return <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
    <Stack gap={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Avatar src={profile.photo || undefined} alt="" sx={{ width: 62, height: 62 }}>{name[0]?.toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography component="h1" variant="h4">My profile</Typography>
            <Typography fontWeight={700}>{name}</Typography>
            <Typography color="text.secondary">{roleLabel(profile.role)} · {profile.publicId}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ mt: 2 }} />
        <Tabs value={section} onChange={(_, value) => setParams({ section: value })} variant="scrollable"
          scrollButtons="auto" aria-label="Profile sections" allowScrollButtonsMobile>
          {sections.map(([key, label]) => <Tab key={key} value={key} id={`profile-tab-${key}`} aria-controls="profile-panel" label={label} />)}
        </Tabs>
      </Paper>
      {sessionStorage.getItem('patientContext') && <Alert severity="info">
        This page shows your signed-in account. Family care pages use the person selected under Care for.
      </Alert>}
      <Stack id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${section}`} gap={2}>
        {section === 'account' && <>
          <AccountDetails profile={profile} onChange={refresh} />
          <PersonalDetails profile={profile} onChange={refresh} />
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">Preferences</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Typography>Language</Typography>
              <LanguageSwitcher />
              {patient && <Button component={Link} to="/notifications">Notifications and email reminders</Button>}
            </Stack>
          </Paper>
          {patient && <ProfileLinks title="Patient access" description="Open a visit QR or manage who can act on your behalf."
            links={ [['Visit QR', '/my-qr'], ['Appointments', '/my-tokens'], ['Family access', '/family']] } />}
          <Button color="error" variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => openLogout('device')}>Sign out</Button>
        </>}
        {section === 'health' && <MeasurementsPanel measurements={profile.measurements} onChange={refresh} />}
        {section === 'saved' && <SavedCare />}
        {section === 'privacy' && <>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack gap={1}>
              <Typography component="h2" variant="h6">Account security</Typography>
              <Typography color="text.secondary">Manage your password and revoke access from other browsers or devices.</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button component={Link} to="/change-password">Change password</Button>
                <Button color="error" onClick={() => openLogout('all')}>Sign out everywhere</Button>
              </Stack>
            </Stack>
          </Paper>
          {patient && <ProfileLinks title="Health data and sharing" description="Review recorded access in Health summary. Manage temporary doctor grants in Medical records and adult delegation in Family access."
            links={ [['Health summary and access history', '/health-summary'], ['Temporary doctor access', '/medical-records'], ['Family access', '/family']] } />}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">Your profile data</Typography>
            <Typography color="text.secondary">Download account details, measurements and saved provider IDs. Visit summaries and other clinical records are available separately in Medical records.</Typography>
            <Button onClick={exportProfile}>Download profile data</Button>
            <Button href={supportUrl} target="_blank" rel="noreferrer">Get help with a privacy request</Button>
          </Paper>
        </>}
        {section === 'help' && <>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">Help</Typography>
            <Typography>Contact your care facility for questions about appointments, care or prescription collection. For app support, follow the support guide and keep health information out of public issues.</Typography>
            <Button href={supportUrl} target="_blank" rel="noreferrer">Support guide</Button>
            <Button href="https://github.com/adarshprakasan/Hospiq/blob/master/docs/USER_GUIDE.md" target="_blank" rel="noreferrer">User guide</Button>
          </Paper>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">About Hospiq</Typography>
            <Typography>Hospiq helps patients find care, manage queue visits and access records, and gives hospital teams a workspace for care and pharmacy coordination.</Typography>
            <Button href="https://github.com/adarshprakasan/Hospiq" target="_blank" rel="noreferrer">Project and release notes</Button>
          </Paper>
        </>}
      </Stack>
    </Stack>
    <Dialog open={Boolean(logout)} onClose={() => { if (!busy) setLogout(null); }} aria-labelledby="profile-signout">
      <DialogTitle id="profile-signout">{logout === 'all' ? 'Sign out everywhere?' : 'Sign out of this browser?'}</DialogTitle>
      <DialogContent>
        <Typography>{logout === 'all' ? 'You will need to sign in again on every device.' : 'Save any unfinished changes before signing out.'}</Typography>
        {logoutError && <Alert severity="error">{logoutError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setLogout(null)}>Cancel</Button>
        <Button color="error" disabled={busy} onClick={confirmSignOut}>Sign out</Button>
      </DialogActions>
    </Dialog>
  </Container>;
}
