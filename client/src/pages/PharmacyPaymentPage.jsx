import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Container, Typography } from "@mui/material";
import axios from "../api/axios";
import PharmacyPayment from "../components/PharmacyPayment";
import { newestOrder } from "../utils/pharmacy";
export default function PharmacyPaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const close = useCallback(() => navigate(order?.paymentStatus === "paid" ? "/pharmacy?show=paid" : "/pharmacy", { replace: true }), [navigate, order?.paymentStatus]);
  useEffect(() => {
    let live = true;
    async function refresh() {
      try { const { data } = await axios.get(`/pharmacy/orders/${orderId}`); if (live) setOrder(previous => newestOrder(previous, data)); }
      catch (err) { if (live) setError(err.response?.data?.message || "Unable to verify payment"); }
    }
    // The server retrieves payment status; a success URL alone is never proof of payment.
    axios.post(`/pharmacy/orders/${orderId}/reconcile`).then(({ data }) => { if (live) setOrder(previous => newestOrder(previous, data)); }).catch(() => refresh());
    const timer = setInterval(refresh, 5000);
    return () => { live = false; clearInterval(timer); };
  }, [orderId]);
  return <Container sx={{ mt: 4 }}><Typography variant="h5">Confirming your pharmacy payment</Typography>{error && <Alert severity="error">{error}</Alert>}{order && <PharmacyPayment order={order} onClose={close} onUpdated={setOrder} />}</Container>;
}
