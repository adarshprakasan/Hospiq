import { t as translate, useLocale } from "../../i18n";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Skeleton, Stack, TextField, Typography, TablePagination } from '@mui/material';
import axios from '../../api/axios';
import { storedUser } from '../../utils';
import { SaveCareButton, useSavedCare } from '../profile/SavedCare';
export default function CareDirectory() {
  useLocale();
  const savedCare = useSavedCare(storedUser()?.role === 'patient');
  const [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [query, setQuery] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    axios.get('/hospitals', {
      signal: controller.signal,
      params: {
        page: page + 1,
        limit: 12,
        q: query,
        type
      }
    }).then(({
      data
    }) => {
      setHospitals(data.items || data);
      setTotal(data.total ?? data.length);
      setError('');
    }).catch(err => {
      if (err.code !== 'ERR_CANCELED') setError('Unable to load care providers.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [retry, page, query, type]);
  const visible = hospitals.filter(h => (!type || h.type === type) && [h.name, h.address, ...(h.departments || [])].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <Box><Typography variant="h5" mb={2}>{translate("Find care")}</Typography><Stack direction={{
      xs: 'column',
      sm: 'row'
    }} gap={2} mb={3}><TextField fullWidth label={translate("Hospital, location or department")} value={search} onChange={e => setSearch(e.target.value)} /><TextField select label={translate("Facility type")} value={type} onChange={e => {
        setType(e.target.value);
        setPage(0);
      }} sx={{
        minWidth: 180
      }}><MenuItem value="">{translate("All facilities")}</MenuItem><MenuItem value="Hospital">{translate("Hospitals")}</MenuItem><MenuItem value="Clinic">{translate("Clinics")}</MenuItem></TextField></Stack>{error && <Alert severity="error" action={<Button onClick={() => setRetry(v => v + 1)}>{translate("Retry")}</Button>}>{error}</Alert>}{savedCare.error && <Alert severity="warning" action={<Button onClick={savedCare.retry}>Retry</Button>}>{savedCare.error}</Alert>}{loading ? <Skeleton variant="rounded" height={180} /> : <Box className="responsive-grid">{visible.map(h => <Card key={h._id}><CardContent><Chip size="small" label={h.type} /><Typography variant="h6" mt={2}>{h.name}</Typography><Typography color="text.secondary" my={1}>{h.address}</Typography><Stack direction="row" gap={1} flexWrap="wrap" mb={2}>{(h.departments || []).slice(0, 4).map(d => <Chip key={d} label={d} size="small" variant="outlined" />)}</Stack><Button component={Link} to={`/book/${h._id}`} variant="outlined" fullWidth>{translate("View doctors and availability")}</Button><SaveCareButton care={savedCare} kind="hospital" id={h._id} name={h.name} /></CardContent></Card>)}</Box>}{!loading && !error && !visible.length && <Alert severity="info">No matching providers. Try a different search.</Alert>}<TablePagination component="div" count={total} page={page} rowsPerPage={12} rowsPerPageOptions={[12]} onPageChange={(_event, value) => setPage(value)} /></Box>;
}
