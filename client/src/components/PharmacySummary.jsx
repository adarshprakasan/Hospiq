import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Stack } from "@mui/material";
import axios from "../api/axios";
export default function PharmacySummary() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    let live = true;
    async function refresh() { try { const { data } = await axios.get("/pharmacy/orders"); if (live) setOrders(data.filter(o => o.paymentStatus !== "paid")); } catch { /* Full pharmacy page provides retry/error details. */ } }
    refresh(); const timer = setInterval(refresh, 5000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return orders.length > 0 && <Stack gap={1} mb={3}>{orders.map(order => <Alert key={order._id} severity={order.status === "ready" ? "success" : "info"} action={<Button component={Link} to="/pharmacy">{order.status === "ready" ? "Proceed to payment" : "View token"}</Button>}>Collect your medicine at pharmacy · {order.tokenLabel} · {order.hospitalName} · {order.status}</Alert>)}</Stack>;
}
