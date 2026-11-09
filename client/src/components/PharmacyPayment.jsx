import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import axios from "../api/axios";
import { money } from "./PharmacyOrderCard";
export default function PharmacyPayment({
  order,
  onClose,
  onUpdated
}) {
  useLocale();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (order.paymentStatus !== "paid") return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [order.paymentStatus, onClose]);
  async function pay(method) {
    setBusy(true);
    setError("");
    try {
      const {
        data
      } = await axios.post(`/pharmacy/orders/${order._id}/${method}`, {}, {
        timeout: 60000
      });
      if (method === "counter") onUpdated(data);else if (data.paid) {
        const result = await axios.get(`/pharmacy/orders/${order._id}`);
        onUpdated(result.data);
      } else if (data.url && new URL(data.url).protocol === "https:" && new URL(data.url).hostname === "checkout.stripe.com") window.location.assign(data.url);else throw new Error("Checkout URL unavailable");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to open payment. Retry or use Pay at counter");
    } finally {
      setBusy(false);
    }
  }
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm"><DialogTitle>Pharmacy payment · {order.tokenLabel}</DialogTitle><DialogContent><Stack gap={2}>
    <Typography variant="h5">{money(order.totalMinor)}</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {order.paymentStatus === "paid" ? <Alert severity="success">Payment confirmed. This payment view will close automatically. Collect your medicine with token {order.tokenLabel}.</Alert> : <>
      {order.paymentState === "counter" && <Alert severity="info">Proceed to counter. Show token {order.tokenLabel} and pay {money(order.totalMinor)}. This view closes once the pharmacist confirms payment.</Alert>}
      <Button variant="outlined" disabled={busy} onClick={() => pay("counter")}>{translate("Pay at counter")}</Button>
      <Button variant="contained" disabled={busy || !order.onlinePaymentAvailable || order.totalMinor < 200} onClick={() => pay("checkout")}>{translate("Pay Online")}</Button>
      <Typography variant="body2" color="text.secondary">Debit/credit cards and eligible Apple Pay or Google Pay wallets are offered on Stripe's secure checkout.</Typography>
      {!order.onlinePaymentAvailable && <Alert severity="info">Online checkout is awaiting hospital payment setup. Counter payment is available.</Alert>}
      {order.totalMinor < 200 && <Typography variant="body2">Bills below AED 2.00 are payable at the counter.</Typography>}
    </>}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>{translate("Close")}</Button></DialogActions></Dialog>;
}
