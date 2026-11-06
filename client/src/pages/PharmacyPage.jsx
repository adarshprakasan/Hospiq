import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button, Container, MenuItem, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
import { storedUser } from "../utils";
import PharmacyOrderCard from "../components/PharmacyOrderCard";
import PharmacyPayment from "../components/PharmacyPayment";
import { newestOrder } from "../utils/pharmacy";
export default function PharmacyPage() {
  const pharmacist = storedUser()?.role === "pharmacist";
  const [params] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(() => params.get("show") === "paid" ? "paid" : "unpaid");
  const [paymentId, setPaymentId] = useState(null);
  const refresh = useCallback(async () => {
    try { const { data } = await axios.get("/pharmacy/orders"); setOrders(previous => { const known = new Map(previous.map(o => [o._id, o])); return data.map(o => newestOrder(known.get(o._id), o)); }); setError(""); }
    catch (err) { setError(err.response?.data?.message || "Unable to load pharmacy orders"); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);
  const update = data => setOrders(previous => previous.map(o => o._id === data._id ? newestOrder(o, data) : o));
  const closePayment = useCallback(() => setPaymentId(null), []);
  const payment = orders.find(o => o._id === paymentId);
  useEffect(() => { if (payment?.paymentStatus === "paid") setFilter("paid"); }, [payment?.paymentStatus]);
  const visible = orders.filter(o => (!filter || (filter === "unpaid" ? o.paymentStatus !== "paid" : filter === "paid" ? o.paymentStatus === "paid" : o.status === filter && o.paymentStatus !== "paid")) && [o.patientName, o.tokenLabel, o.hospitalName, o.date].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <Container maxWidth="lg" sx={{ mt: 3 }}><Stack gap={3}>
    <div><Typography variant="overline">{pharmacist ? "HOSPITAL PHARMACY" : "YOUR MEDICINE COLLECTION"}</Typography><Typography variant="h4">{pharmacist ? "Pharmacy dashboard" : "My pharmacy tokens"}</Typography><Typography color="text.secondary" mt={1}>{pharmacist ? "Gather prescriptions, confirm bills, and record counter payments." : "Collect your medicine at pharmacy. Show your pharmacy token when the order is ready."}</Typography></div>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction={{ xs: "column", sm: "row" }} gap={2}><TextField fullWidth label="Search token, patient or hospital" value={search} onChange={e => setSearch(e.target.value)} /><TextField select label="Show" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 180 }}>{[["unpaid", "All unpaid"], ["pending", "Pending preparation"], ["ready", "Ready for payment"], ["paid", "Paid history"], ["", "All orders"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField><Button onClick={refresh}>Refresh</Button>{pharmacist && <Button component={Link} to="/medications" variant="contained">Manage medications</Button>}</Stack>
    {visible.map(order => <PharmacyOrderCard key={order._id} order={order} pharmacist={pharmacist} onUpdated={update} onPay={o => setPaymentId(o._id)} />)}
    {!visible.length && !error && <Alert severity="info">{pharmacist ? "No matching pharmacy orders. Prescriptions appear after a doctor sends them to your hospital's pharmacy." : "No matching pharmacy tokens. Your doctor's prescription appears here after it is sent to pharmacy."}</Alert>}
    {payment && <PharmacyPayment order={payment} onClose={closePayment} onUpdated={update} />}
  </Stack></Container>;
}
