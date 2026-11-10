import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from 'react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import axios from '../api/axios';
export default function OperationalMetrics() {
  useLocale();
  const [data, setData] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/operations/metrics', {
      signal: controller.signal
    }).then(({
      data
    }) => setData(data)).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Operational metrics are temporarily unavailable.');
    });
    return () => controller.abort();
  }, []);
  if (error) return <Alert severity="info">{error}</Alert>;
  if (!data) return null;
  return (
    <Paper sx={{
      p: 3,
      my: 3
    }}><Typography variant="h6">{translate("Last 30 days")}</Typography><Stack
      direction={{
          xs: 'column',
          sm: 'row'
        }}
      sx={{
        gap: 3,
        mt: 2
      }}>{[['waiting', translate("Average waiting time")], ['consultation', translate("Average consultation")], ['pharmacy', translate("Average pharmacy preparation")]].map(([key, label]) => <div key={key}><Typography variant="body2">{translate(label)}</Typography><Typography variant="h5">{data[key].minutes == null ? 'No measurements yet' : `${data[key].minutes} min`}</Typography><Typography variant="caption">{data[key].sample} measured visits</Typography></div>)}</Stack><Typography variant="body2" sx={{
      mt: 2
    }}>Completed: {data.counts.completed || 0} · Cancelled: {data.counts.cancelled || 0} · Missed calls: {data.counts.skipped || 0}</Typography><Typography variant="caption">Based on recorded timestamps. Missed calls are not confirmed no-shows.</Typography></Paper>
  );
}
