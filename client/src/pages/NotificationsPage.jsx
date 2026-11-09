import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, Container, Paper, Skeleton, Stack, Typography } from '@mui/material';
import axios from '../api/axios';
import usePolling from '../hooks/usePolling';
export default function NotificationsPage() {
  useLocale();
  const [preferences, setPreferences] = useState(null),
    [preferenceError, setPreferenceError] = useState(''),
    [deliveries, setDeliveries] = useState([]);
  useEffect(() => {
    let live = true;
    Promise.all([axios.get('/notifications/preferences'), axios.get('/notifications/deliveries')]).then(([p, d]) => {
      if (live) {
        setPreferences(p.data);
        setDeliveries(d.data);
      }
    }).catch(() => {
      if (live) setPreferenceError('Unable to load reminder preferences.');
    });
    return () => {
      live = false;
    };
  }, []);
  async function preference(enabled) {
    try {
      const {
        data
      } = await axios.put('/notifications/preferences', {
        emailReminders: enabled
      });
      setPreferences(data);
      setPreferenceError('');
    } catch {
      setPreferenceError('Unable to save reminder preference.');
    }
  }
  const {
    data,
    loading,
    error,
    refresh
  } = usePolling('/notifications');
  return <Container maxWidth="md" sx={{
    py: 3
  }}><Stack gap={2}><Typography variant="h4">{translate("Notifications")}</Typography><Typography color="text.secondary">Updates about your visits and pharmacy orders.</Typography>{preferenceError && <Alert severity="error">{preferenceError}</Alert>}{preferences && <Paper sx={{
        p: 2
      }}><FormControlLabel label={translate("Email me a reminder the day before a visit")} control={<Checkbox checked={preferences.emailReminders} onChange={e => preference(e.target.checked)} />} /><Typography variant="body2">{translate("Optional. You can turn reminders off at any time.")}</Typography>{deliveries.map(d => <Typography key={d._id} variant="caption" display="block">Reminder {new Date(d.createdAt).toLocaleDateString()}: {d.state} {d.sentAt ? `at ${new Date(d.sentAt).toLocaleTimeString()}` : ''}</Typography>)}</Paper>}{error && <Alert severity="warning" action={<Button onClick={refresh}>{translate("Retry")}</Button>}>{error}</Alert>}{loading ? <Skeleton height={160} /> : (data || []).map(n => <Paper key={n._id} sx={{
        p: 3,
        borderLeft: n.readAt ? undefined : '4px solid',
        borderColor: 'primary.main'
      }}><Typography fontWeight={n.readAt ? 400 : 700}>{n.title}</Typography><Typography variant="caption" display="block">{new Date(n.createdAt).toLocaleString()}</Typography><Button component={Link} to={n.path}>{translate("View details")}</Button>{!n.readAt && <Button onClick={async () => {
          try {
            await axios.post(`/notifications/${n._id}/read`);
            refresh();
          } catch {
            refresh();
          }
        }}>{translate("Mark read")}</Button>}</Paper>)}{!loading && !data?.length && <Alert severity="info">{translate("No notifications yet.")}</Alert>}</Stack></Container>;
}
