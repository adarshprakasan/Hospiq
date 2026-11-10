import { useRef, useState } from 'react';
import { Alert, Avatar, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../../api/axios';

async function photoData(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPEG or PNG image up to 5 MB.');
  }
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const size = Math.min(image.width, image.height);
    canvas.width = canvas.height = Math.min(size, 256);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is unavailable in this browser.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    image.close();
  }
}

export default function AccountDetails({ profile, onChange }) {
  const fileInput = useRef(null);
  const [fields, setFields] = useState({ name: profile.name, preferredName: profile.preferredName, phone: profile.phone });
  const [photo, setPhoto] = useState(profile.photo);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axios.put('/profile/me', fields);
      const { data } = await axios.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data));
      await onChange();
      setEditing(false);
      setNotice('Profile details saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save profile details.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePhoto(file) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const value = file ? await photoData(file) : null;
      await axios.put('/profile/me/photo', { photo: value });
      setPhoto(value);
      await onChange();
      setNotice(file ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not update the photo.');
    } finally {
      setBusy(false);
    }
  }

  return <Paper variant="outlined" sx={{ p: 3 }}>
    <Stack gap={2}>
      <Typography component="h2" variant="h6">Personal details</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
        <Avatar src={photo || undefined} alt="" sx={{ width: 64, height: 64 }}>{profile.name[0]?.toUpperCase()}</Avatar>
        <Button disabled={busy} onClick={() => fileInput.current.click()}>{photo ? 'Change photo' : 'Add photo'}</Button>
        <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png" onChange={event => {
          const file = event.target.files[0];
          event.target.value = '';
          if (file) updatePhoto(file);
        }} />
        {photo && <Button color="error" disabled={busy} onClick={() => updatePhoto(null)}>Remove photo</Button>}
      </Stack>
      <Typography color="text.secondary">Your photo is private to this account.</Typography>
      <Stack component="form" gap={2} onSubmit={submit}>
        {[['name', 'Full name', 200], ['preferredName', 'Preferred name', 100], ['phone', 'Phone number', 40]].map(([key, label, maxLength]) =>
          <TextField key={key} label={label} required={key === 'name'} type={key === 'phone' ? 'tel' : 'text'} value={fields[key]}
            slotProps={{ htmlInput: { maxLength, readOnly: !editing } }}
            onChange={event => setFields({ ...fields, [key]: event.target.value })} />)}
        <TextField label="Sign-in email" value={profile.email} slotProps={{ htmlInput: { readOnly: true } }} />
        {editing ? <Stack direction="row" gap={1}>
          <Button type="submit" variant="contained" disabled={busy || !fields.name.trim()}>Save profile</Button>
          <Button disabled={busy} onClick={() => {
            setFields({ name: profile.name, preferredName: profile.preferredName, phone: profile.phone });
            setEditing(false);
          }}>Cancel</Button>
        </Stack> : <Button sx={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>Edit profile</Button>}
      </Stack>
    </Stack>
  </Paper>;
}
