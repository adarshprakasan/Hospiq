import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export const money = minor => `AED ${(Number(minor || 0) / 100).toFixed(2)}`;
export const schedule = m => [m.times?.length ? m.times.join(" / ") : m.frequency, m.startDate && m.endDate ? `${m.startDate} to ${m.endDate}` : m.duration, m.foodTiming === "before" ? "Before food" : m.foodTiming === "after" ? "After food" : "", m.dose, m.instructions].filter(Boolean).join(" · ");
const draftLines = lines => lines.map(l => ({ ...l, price: l.unitPriceMinor == null ? "" : (l.unitPriceMinor / 100).toFixed(2) }));
const minorPrice = value => /^\d+(\.\d{1,2})?$/.test(String(value)) ? Math.round(Number(value) * 100) : NaN;
export default function PharmacyOrderCard({ order, pharmacist = false, onUpdated, onPay, apiBase = "/pharmacy/orders" }) {
  const [lines, setLines] = useState(() => draftLines(order.lines));
  const [baseVersion, setBaseVersion] = useState(order.version);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!dirty) { setLines(draftLines(order.lines)); setBaseVersion(order.version); } }, [order.lines, order.version, dirty]);
  function edit(index, changes) { setDirty(true); setLines(previous => previous.map((line, i) => i === index ? { ...line, ...changes } : line)); }
  const valid = lines.every(l => Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0 && Number(l.quantity) <= 10000 && Number.isSafeInteger(minorPrice(l.price)) && minorPrice(l.price) >= 0);
  const stale = dirty && baseVersion !== order.version;
  const total = valid ? lines.reduce((sum, l) => sum + minorPrice(l.price) * Number(l.quantity), 0) : null;
  async function prepare(ready) {
    setBusy(true); setError("");
    try {
      const { data } = await axios.patch(`${apiBase}/${order._id}/prepare`, { version: baseVersion, lines: lines.map(l => ({ _id: l._id, gathered: l.gathered, quantity: Number(l.quantity), unitPriceMinor: minorPrice(l.price) })) });
      setDirty(false); onUpdated(data);
      if (ready) { const result = await axios.post(`${apiBase}/${order._id}/ready`, { version: data.version }); onUpdated(result.data); }
    } catch (err) { setError(err.response?.data?.message || "Unable to save preparation"); }
    finally { setBusy(false); }
  }
  async function paid() {
    setBusy(true); setError("");
    try { const { data } = await axios.post(`${apiBase}/${order._id}/paid`, { version: order.version }); onUpdated(data); }
    catch (err) { setError(err.response?.data?.message || "Unable to confirm counter payment"); }
    finally { setBusy(false); }
  }
  return <Paper sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={2}>
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography variant="h5" sx={{ mr: "auto" }}>Pharmacy {order.tokenLabel}</Typography><Chip label={order.status} color={order.status === "ready" ? "success" : "warning"} /><Chip label={order.paymentStatus} color={order.paymentStatus === "paid" ? "success" : "default"} /></Stack>
    <Typography>{pharmacist ? `${order.patientName} · ${order.patientPublicId}` : "Collect your medicine at pharmacy"}</Typography>
    <Typography variant="body2" color="text.secondary">{order.hospitalName} · {order.doctorName} · {order.date}</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {stale && <Alert severity="warning" action={<Button onClick={() => { setDirty(false); setError(""); }}>Discard draft</Button>}>Another pharmacist changed this order. Discard your draft to load the latest version.</Alert>}
    {pharmacist && order.status === "pending" && <Alert severity="info">Confirm the number of selling units/packs and price for each medicine. Quantities are not inferred from its dosing schedule.</Alert>}
    {(pharmacist && order.status === "pending" ? lines : order.lines).map((line, index) => <Box key={line._id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      {pharmacist && order.status === "pending" ? <><FormControlLabel label={line.name} control={<Checkbox checked={line.gathered} disabled={busy || stale} onChange={e => edit(index, { gathered: e.target.checked })} />} /><Typography variant="body2" color="text.secondary" mb={2}>{schedule(line)}</Typography><Stack direction={{ xs: "column", sm: "row" }} gap={2}><TextField label={`Quantity (${line.sellingUnit})`} type="number" value={line.quantity} disabled={busy || stale} onChange={e => edit(index, { quantity: e.target.value })} slotProps={{ htmlInput: { min: 1, max: 10000, step: 1 } }} /><TextField label={`AED per ${line.sellingUnit}`} value={line.price} disabled={busy || stale} onChange={e => edit(index, { price: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} /></Stack></> : <><Typography fontWeight={700}>{line.name}</Typography><Typography variant="body2">{schedule(line)}</Typography><Typography variant="body2" color="text.secondary">{line.quantity} {line.sellingUnit} · {line.unitPriceMinor == null ? "Price awaiting pharmacy confirmation" : money(line.quantity * line.unitPriceMinor)}</Typography></>}
    </Box>)}
    <Typography variant="h6">{order.status === "ready" ? `Total: ${money(order.totalMinor)}` : pharmacist ? `Estimated total: ${total == null ? "Enter all prices" : money(total)}` : "Total confirmed when your medication is ready"}</Typography>
    {pharmacist && order.status === "pending" && <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" disabled={busy || !valid || stale} onClick={() => prepare(false)}>Save checklist</Button><Button variant="contained" disabled={busy || !valid || stale || !lines.every(l => l.gathered)} onClick={() => prepare(true)}>Done — mark ready</Button></Stack>}
    {pharmacist && order.status === "ready" && order.paymentStatus !== "paid" && <><Typography variant="body2">{["online", "creating"].includes(order.paymentState) ? "Online checkout is active. The patient must switch to counter payment before collecting cash." : "Confirm Paid only after collecting the displayed total at the counter."}</Typography><Button variant="contained" disabled={busy || !["none", "counter"].includes(order.paymentState)} onClick={paid}>Paid at counter</Button></>}
    {!pharmacist && order.status === "ready" && order.paymentStatus !== "paid" && <Button variant="contained" onClick={() => onPay(order)}>Proceed to payment</Button>}
    {order.paymentStatus === "paid" && <Alert severity="success">Paid {money(order.totalMinor)} · {order.paymentMethod === "online" ? "Online" : "At counter"}. Your medicine is ready for collection. Show token {order.tokenLabel}.</Alert>}
  </Stack></Paper>;
}
