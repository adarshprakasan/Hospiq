import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
function PriceEditor({ item, onSaved, onError }) {
  const [price, setPrice] = useState(item.unitPriceMinor == null ? "" : (item.unitPriceMinor / 100).toFixed(2));
  const [unit, setUnit] = useState(item.sellingUnit || "pack");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!/^\d+(\.\d{1,2})?$/.test(price) || !unit.trim()) { onError("Enter a valid AED price and selling unit"); return; }
    setBusy(true);
    try { await axios.patch(`/medications/${item._id}`, { unitPriceMinor: Math.round(Number(price) * 100), sellingUnit: unit }); onSaved(); }
    catch (err) { onError(err.response?.data?.message || "Unable to update price"); }
    finally { setBusy(false); }
  }
  return <Stack direction={{ xs: "column", sm: "row" }} gap={1} mt={2}><TextField label="AED per selling unit" size="small" value={price} onChange={e => setPrice(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} /><TextField label="Selling unit (pack, tablet…)" size="small" value={unit} onChange={e => setUnit(e.target.value)} slotProps={{ htmlInput: { maxLength: 60 } }} /><Button disabled={busy} onClick={save}>Save price</Button></Stack>;
}

export default function MedicationsPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("pack");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { const { data } = await axios.get("/medications"); setItems(data); setError(""); }
    catch (err) { setError(err.response?.data?.message || "Unable to load hospital medications"); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function add(event) {
    event.preventDefault(); setBusy(true); setNotice("");
    if (!/^\d+(\.\d{1,2})?$/.test(price) || !unit.trim()) { setError("Enter a valid AED price and selling unit"); setBusy(false); return; }
    try { await axios.post("/medications", { name, unitPriceMinor: Math.round(Number(price) * 100), sellingUnit: unit }); setName(""); setPrice(""); setNotice("Medication available for prescribing"); await refresh(); }
    catch (err) { setError(err.response?.data?.message || "Could not add medication"); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setNotice("");
    try { await axios.delete(`/medications/${id}`); setNotice("Removed from available list. Existing prescriptions are preserved."); await refresh(); }
    catch (err) { setError(err.response?.data?.message || "Could not remove medication"); }
    finally { setBusy(false); }
  }
  return <Container maxWidth="md" sx={{ mt: 3 }}><Stack gap={3}>
    <div><Typography variant="h4">Hospital medications</Typography><Typography color="text.secondary" mt={1}>Manage the medicines available at your hospital. Include strength and form in each entry; different strengths are separate choices.</Typography></div>
    {error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    <Paper component="form" onSubmit={add} sx={{ p: 3 }}><Stack gap={2}><TextField required fullWidth label="Medication name, strength and form" helperText="For example: medicine name 500 mg tablet" value={name} onChange={e => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} /><Stack direction={{ xs: "column", sm: "row" }} gap={2}><TextField required label="AED per selling unit" value={price} onChange={e => setPrice(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} /><TextField required label="Selling unit" value={unit} onChange={e => setUnit(e.target.value)} slotProps={{ htmlInput: { maxLength: 60 } }} /><Button type="submit" variant="contained" disabled={busy || !name.trim()}>Add medication</Button></Stack></Stack></Paper>
    <TextField label="Search available medications" value={search} onChange={e => setSearch(e.target.value)} />
    {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map(item => <Paper key={item._id} sx={{ p: 2 }}><Stack direction="row" alignItems="center" gap={2}><Typography sx={{ flex: 1 }}>{item.name}</Typography><Button color="error" disabled={busy} onClick={() => remove(item._id)}>Remove</Button></Stack><PriceEditor item={item} onSaved={() => { setNotice("Price updated. Existing pharmacy bills are preserved."); refresh(); }} onError={setError} /></Paper>)}
    {!items.length && !error && <Alert severity="info">Your hospital's list is empty. Add medications above to make them available in the doctor's prescription dropdown.</Alert>}
  </Stack></Container>;
}
