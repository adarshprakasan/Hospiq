import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Stack, TextField, Typography } from "@mui/material";
import { downloadText } from "../utils/download";
import axios from "../api/axios";
export const money = minor => `AED ${(Number(minor || 0) / 100).toFixed(2)}`;
export const schedule = m => [m.times?.length ? m.times.join(" / ") : m.frequency, m.startDate && m.endDate ? `${m.startDate} to ${m.endDate}` : m.duration, m.foodTiming === "before" ? translate("Before food") : m.foodTiming === "after" ? translate("After food") : "", m.dose, m.instructions].filter(Boolean).join(" · ");
const draftLines = lines => lines.map(l => ({
  ...l,
  price: l.unitPriceMinor == null ? "" : (l.unitPriceMinor / 100).toFixed(2)
}));
const minorPrice = value => /^\d+(\.\d{1,2})?$/.test(String(value)) ? Math.round(Number(value) * 100) : NaN;
export default function PharmacyOrderCard({
  order,
  pharmacist = false,
  onUpdated,
  onPay,
  apiBase = "/pharmacy/orders"
}) {
  useLocale();
  const [refundOpen, setRefundOpen] = useState(false),
    [refundReason, setRefundReason] = useState("");
  const [lines, setLines] = useState(() => draftLines(order.lines));
  const [baseVersion, setBaseVersion] = useState(order.version);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!dirty) {
      setLines(draftLines(order.lines));
      setBaseVersion(order.version);
    }
  }, [order.lines, order.version, dirty]);
  function edit(index, changes) {
    setDirty(true);
    setLines(previous => previous.map((line, i) => i === index ? {
      ...line,
      ...changes
    } : line));
  }
  const valid = lines.every(l => l.unavailable ? l.quantity === 0 && Boolean(l.unavailableReason?.trim()) : Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0 && Number(l.quantity) <= 10000 && Number.isSafeInteger(minorPrice(l.price)) && minorPrice(l.price) >= 0);
  const stale = dirty && baseVersion !== order.version;
  const total = valid ? lines.reduce((sum, l) => sum + minorPrice(l.price) * Number(l.quantity), 0) : null;
  async function prepare(ready) {
    setBusy(true);
    setError("");
    try {
      const {
        data
      } = await axios.patch(`${apiBase}/${order._id}/prepare`, {
        version: baseVersion,
        lines: lines.map(l => ({
          _id: l._id,
          gathered: l.gathered,
          quantity: Number(l.quantity),
          unitPriceMinor: l.unavailable ? 0 : minorPrice(l.price),
          unavailable: Boolean(l.unavailable),
          unavailableReason: l.unavailableReason || ""
        }))
      });
      setDirty(false);
      onUpdated(data);
      if (ready) {
        const result = await axios.post(`${apiBase}/${order._id}/ready`, {
          version: data.version
        });
        onUpdated(result.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save preparation");
    } finally {
      setBusy(false);
    }
  }
  async function refund() {
    setBusy(true);
    setError('');
    try {
      const {
        data
      } = await axios.post(`${apiBase}/${order._id}/refund`, {
        version: order.version,
        reason: refundReason,
        confirm: true
      });
      onUpdated(data);
      setRefundOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Refund could not be confirmed. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  }
  async function collect() {
    setBusy(true);
    setError("");
    try {
      const {
        data
      } = await axios.post(`${apiBase}/${order._id}/collect`, {
        version: order.version
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record collection");
    } finally {
      setBusy(false);
    }
  }
  async function paid() {
    setBusy(true);
    setError("");
    try {
      const {
        data
      } = await axios.post(`${apiBase}/${order._id}/paid`, {
        version: order.version
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to confirm counter payment");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Paper sx={{
      p: {
        xs: 2,
        sm: 3
      }
    }}><Stack sx={{
      gap: 2
    }}>
      <Stack
        direction="row"
        sx={{
          gap: 1,
          alignItems: "center",
          flexWrap: "wrap"
        }}><Typography variant="h5" sx={{
            mr: "auto"
          }}>Pharmacy {order.tokenLabel}</Typography><Chip label={order.status} color={order.status === "ready" ? "success" : "warning"} /><Chip label={order.paymentStatus} color={order.paymentStatus === "paid" ? "success" : "default"} /></Stack>
      <Typography>{pharmacist ? `${order.patientName} · ${order.patientPublicId}` : order.collectedAt ? translate("Medicine collected") : translate("Your pharmacy order")}</Typography>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{order.hospitalName} · {order.doctorName} · {order.date}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {stale && <Alert severity="warning" action={<Button onClick={() => {
          setDirty(false);
          setError("");
        }}>Discard draft</Button>}>Another pharmacist changed this order. Discard your draft to load the latest version.</Alert>}
      {pharmacist && order.status === "pending" && <Alert severity="info">Confirm the number of selling units/packs and price for each medicine. Quantities are not inferred from its dosing schedule.</Alert>}
      {(pharmacist && order.status === "pending" ? lines : order.lines).map((line, index) => <Box key={line._id} sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2
        }}>
        {pharmacist && order.status === "pending" ? <><FormControlLabel label={line.name} control={<Checkbox checked={line.gathered} disabled={busy || stale} onChange={e => edit(index, {
              gathered: e.target.checked
            })} />} /><Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 2
          }}>{schedule(line)}</Typography><FormControlLabel label="Unavailable — do not bill this medicine" control={<Checkbox checked={Boolean(line.unavailable)} disabled={busy || stale} onChange={e => edit(index, {
              unavailable: e.target.checked,
              quantity: e.target.checked ? 0 : 1,
              price: e.target.checked ? '0.00' : line.price,
              gathered: false
            })} />} />{line.unavailable && <TextField fullWidth label="Reason unavailable / next steps" value={line.unavailableReason || ''} onChange={e => edit(index, {
              unavailableReason: e.target.value
            })} />}<Stack direction={{
              xs: "column",
              sm: "row"
            }} sx={{
          gap: 2
        }}><TextField label={`Quantity (${line.sellingUnit})`} type="number" value={line.quantity} disabled={busy || stale || line.unavailable} onChange={e => edit(index, {
                quantity: e.target.value
              })} slotProps={{
                htmlInput: {
                  min: 1,
                  max: 10000,
                  step: 1
                }
              }} /><TextField label={`AED per ${line.sellingUnit}`} value={line.price} disabled={busy || stale || line.unavailable} onChange={e => edit(index, {
                price: e.target.value
              })} slotProps={{
                htmlInput: {
                  inputMode: "decimal"
                }
              }} /></Stack></> : <><Typography sx={{
          fontWeight: 700
        }}>{line.name}</Typography>{line.unavailable && <Alert severity="warning">Not supplied or billed: {line.unavailableReason}</Alert>}<Typography variant="body2">{schedule(line)}</Typography><Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{line.quantity} {line.sellingUnit} · {line.unitPriceMinor == null ? "Price awaiting pharmacy confirmation" : money(line.quantity * line.unitPriceMinor)}</Typography></>}
      </Box>)}
      <Typography variant="h6">{order.status === "unavailable" ? "No items available — no payment due" : order.status === "ready" ? `Total: ${money(order.totalMinor)}` : pharmacist ? `Estimated total: ${total == null ? "Enter all prices" : money(total)}` : "Total confirmed when your medication is ready"}</Typography>
      {pharmacist && order.status === "pending" && <Stack
        direction="row"
        sx={{
          gap: 1,
          flexWrap: "wrap"
        }}><Button variant="outlined" disabled={busy || !valid || stale} onClick={() => prepare(false)}>{translate("Save checklist")}</Button><Button variant="contained" disabled={busy || !valid || stale || !lines.every(l => l.gathered || l.unavailable)} onClick={() => prepare(true)}>{translate("Complete preparation")}</Button></Stack>}
      {pharmacist && order.status === "ready" && order.paymentStatus !== "paid" && <><Typography variant="body2">{["online", "creating"].includes(order.paymentState) ? "Online checkout is active. The patient must switch to counter payment before collecting cash." : "Confirm Paid only after collecting the displayed total at the counter."}</Typography><Button variant="contained" disabled={busy || !["none", "counter"].includes(order.paymentState)} onClick={paid}>{translate("Paid at counter")}</Button></>}
      {!pharmacist && order.status === "ready" && order.paymentStatus !== "paid" && <Button variant="contained" onClick={() => onPay(order)}>{translate("Proceed to payment")}</Button>}
      {order.status === "unavailable" && <Alert severity="warning">None of the prescribed medicines could be supplied. No payment is due. Contact your doctor or pharmacy for next steps.</Alert>}
      {order.refundState === "refunded" && <Alert severity="success">Full refund recorded: {money(order.totalMinor)} · {new Date(order.refundedAt).toLocaleString()}</Alert>}
      {order.refundState === "failed" && <Alert severity="error">The refund failed. Contact the pharmacy to arrange a new attempt.</Alert>}
      {order.refundState === "processing" && <Alert severity="warning">Refund is processing. Medicine handover is paused.</Alert>}
      {order.paymentStatus === "paid" && !["processing", "refunded"].includes(order.refundState) && <Alert severity="success">Paid {money(order.totalMinor)} · {order.paymentMethod === "online" ? "Online" : "At counter"}. {order.collectedAt ? `Collected ${new Date(order.collectedAt).toLocaleString()}.` : `Your medicine is ready for collection. Show token ${order.tokenLabel}.`}</Alert>}
      {order.paymentStatus === "paid" && <Button onClick={() => downloadText(`hospiq-receipt-${order._id}.txt`, ['Hospiq payment receipt', order.hospitalName, `Order: ${order._id}`, `Token: ${order.tokenLabel}`, `Paid: ${new Date(order.paidAt).toLocaleString()}`, ...order.lines.map(l => `${l.name}: ${l.quantity} ${l.sellingUnit} - ${money(l.quantity * l.unitPriceMinor)}`), `Total: ${money(order.totalMinor)}`, `Method: ${order.paymentMethod}`, order.collectedAt ? `Collected: ${new Date(order.collectedAt).toLocaleString()}` : 'Awaiting medicine collection'].join('\n'))}>{translate("Download receipt")}</Button>}
      {pharmacist && order.paymentStatus === "paid" && !order.collectedAt && !["processing", "refunded"].includes(order.refundState) && <Button variant="contained" disabled={busy} onClick={collect}>{translate("Confirm medicine handed over")}</Button>}
      {pharmacist && order.paymentStatus === 'paid' && !order.collectedAt && order.refundState !== 'refunded' && <Button color="error" disabled={busy} onClick={() => setRefundOpen(true)}>{order.refundState === 'processing' ? 'Retry refund confirmation' : 'Refund uncollected order'}</Button>}
      <Dialog open={refundOpen} onClose={busy ? undefined : () => setRefundOpen(false)}><DialogTitle>Full refund: {money(order.totalMinor)}</DialogTitle><DialogContent><Typography>{order.paymentMethod === 'counter' ? 'Return the full amount to the patient before confirming. This records the cash refund.' : 'This requests a full refund to the original online payment method.'} The original receipt is retained. Collected orders require your facility return process.</Typography><TextField fullWidth label="Refund reason" value={refundReason} onChange={e => setRefundReason(e.target.value)} sx={{
              mt: 2
            }} /></DialogContent><DialogActions><Button disabled={busy} onClick={() => setRefundOpen(false)}>{translate("Cancel")}</Button><Button color="error" disabled={busy || !refundReason.trim()} onClick={refund}>{order.paymentMethod === 'counter' ? 'Confirm cash returned' : 'Confirm online refund'}</Button></DialogActions></Dialog>
    </Stack></Paper>
  );
}
