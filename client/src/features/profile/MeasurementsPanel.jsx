import { useRef, useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { downloadText } from '../../utils/download';
import { importMeasurements } from './healthImport';

const sourceLabels = { manual: 'Manual entry', 'apple-export': 'Apple Health export', csv: 'CSV import' };

export default function MeasurementsPanel({ measurements, onChange }) {
  const fileInput = useRef(null);
  const [height, setHeight] = useState(measurements?.heightCm ?? '');
  const [weight, setWeight] = useState(measurements?.weightKg ?? '');
  const [source, setSource] = useState(measurements?.source || 'manual');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const validHeight = height === '' || (+height >= 20 && +height <= 300);
  const validWeight = weight === '' || (+weight >= 0.1 && +weight <= 700);
  const bmi = +height > 0 && +weight > 0 && validHeight && validWeight
    ? (+weight / (+height / 100) ** 2).toFixed(1) : null;

  async function save(clear = false) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axios.put('/profile/me/measurements', {
        heightCm: clear || height === '' ? null : Number(height),
        weightKg: clear || weight === '' ? null : Number(weight),
        source: clear ? 'manual' : source,
      });
      if (clear) {
        setHeight('');
        setWeight('');
        setSource('manual');
      }
      await onChange();
      setNotice(clear ? 'Measurements removed.' : 'Measurements saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save measurements.');
    } finally {
      setBusy(false);
    }
  }

  async function readFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const values = await importMeasurements(file);
      setHeight(values.heightCm === undefined ? '' : String(values.heightCm));
      setWeight(values.weightKg === undefined ? '' : String(values.weightKg));
      setSource(values.source);
      setNotice('Review the imported values, then save to add them to your profile.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack sx={{
      gap: 2
    }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack component="form" onSubmit={event => { event.preventDefault(); save(); }} sx={{
          gap: 2
        }}>
          <Typography component="h2" variant="h6">Body measurements</Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>These measurements are private to your account. BMI is calculated from height and weight and is not a diagnosis.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="info">{notice}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{
            gap: 2
          }}>
            <TextField fullWidth label="Height (cm)" type="number" value={height} error={!validHeight} helperText={!validHeight ? 'Enter 20–300 cm' : undefined}
              slotProps={{ htmlInput: { min: 20, max: 300, step: 'any' } }}
              onChange={event => { setHeight(event.target.value); setSource('manual'); }} />
            <TextField fullWidth label="Weight (kg)" type="number" value={weight} error={!validWeight} helperText={!validWeight ? 'Enter 0.1–700 kg' : undefined}
              slotProps={{ htmlInput: { min: 0.1, max: 700, step: 'any' } }}
              onChange={event => { setWeight(event.target.value); setSource('manual'); }} />
          </Stack>
          <Typography aria-live="polite">{bmi ? `BMI: ${bmi} kg/m²` : 'Enter both measurements to calculate BMI.'}</Typography>
          {measurements?.updatedAt && <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Last saved {new Date(measurements.updatedAt).toLocaleDateString()} · {sourceLabels[measurements.source]}
          </Typography>}
          <Stack
            direction="row"
            sx={{
              flexWrap: "wrap",
              gap: 1
            }}>
            <Button type="submit" variant="contained" disabled={busy || !validHeight || !validWeight || (height === '' && weight === '')}>Save measurements</Button>
            {measurements && <Button color="error" disabled={busy} onClick={() => save(true)}>Remove measurements</Button>}
          </Stack>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack sx={{
          gap: 2
        }}>
          <Typography component="h2" variant="h6">Import from health apps</Typography>
          <Alert severity="info">No health providers are connected. Apple Health and Android Health Connect live sync are not available in this web app. Importing a file does not grant ongoing access.</Alert>
          <Typography>For Apple Health, export your health data, unzip the download and choose <strong>export.xml</strong>. For other providers, copy height and weight into the CSV template. This is a one-time import. The original file stays on your device.</Typography>
          <Stack
            direction="row"
            sx={{
              flexWrap: "wrap",
              gap: 1
            }}>
            <Button variant="outlined" disabled={busy} onClick={() => fileInput.current.click()}>Choose Apple Health XML or CSV</Button>
            <input ref={fileInput} hidden type="file" accept=".xml,.csv" onChange={readFile} />
            <Button onClick={() => downloadText('hospiq-measurements.csv', 'height_cm,weight_kg\n,\n')}>Download CSV template</Button>
          </Stack>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography component="h2" variant="h6">Health information</Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>Keep allergies, conditions, medications and emergency contact details in your health summary.</Typography>
        <Button component={Link} to="/health-summary">Open health summary</Button>
        <Button component={Link} to="/medical-records">Medical records</Button>
        <Button component={Link} to="/lab-tests">Lab tests</Button>
        <Button component={Link} to="/pharmacy">Prescriptions and receipts</Button>
      </Paper>
    </Stack>
  );
}
