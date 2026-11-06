import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from "@mui/material";
import axios from "../api/axios";
export default function PatientIdentityCard({ compact = false }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canvas = useRef(null);
  const load = useCallback(async signal => {
    try { const { data } = await axios.get("/qr/me", { signal }); setCard(data); setError(""); }
    catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || "Your patient QR card could not be loaded"); }
  }, []);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  async function copy(value, message) {
    try { await navigator.clipboard.writeText(value); setNotice(message); }
    catch { setError("Copy is unavailable in this browser. Select the displayed ID or download the QR image instead"); }
  }
  function download() {
    const link = document.createElement("a"); link.href = canvas.current.toDataURL("image/png"); link.download = "hospiq-patient-qr.png"; document.body.appendChild(link); link.click(); link.remove();
  }
  return <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
    <Stack direction={{ xs: "column", sm: "row" }} gap={3} alignItems={{ xs: "center", sm: "flex-start" }}>
      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, flexShrink: 0 }}>{card ? <QRCodeCanvas ref={canvas} value={card.qrValue} size={compact ? 176 : 224} level="M" marginSize={4} title="My Hospiq patient identity QR" /> : <Skeleton variant="rounded" width={176} height={176} />}</Box>
      <Box sx={{ minWidth: 0, width: "100%" }}><Typography variant="overline" color="primary">PATIENT ID CARD</Typography><Typography variant="h6">{card?.name || "Your patient QR"}</Typography><Typography color="text.secondary" sx={{ my: 1 }}>Show this QR to your doctor at every visit. It identifies you and the matched appointment.</Typography>
        {card && <Typography component="p" sx={{ fontFamily: "monospace", fontWeight: 700, overflowWrap: "anywhere", userSelect: "all" }}>{card.publicId}</Typography>}
        <Stack direction="row" flexWrap="wrap" gap={1} mt={2}><Button variant="outlined" disabled={!card} onClick={download}>Download QR</Button><Button disabled={!card} onClick={() => copy(card.publicId, "Patient ID copied")}>Copy ID</Button><Button disabled={!card} onClick={() => copy(card.qrValue, "QR data copied for the doctor's scanner")}>Copy QR data</Button></Stack>
        <Typography variant="body2" color="text.secondary" mt={1}>Your ID stays the same. This card does not unlock other doctors' records; your permission code is still required.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }} action={<Button onClick={() => load()}>Retry</Button>}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
      </Box>
    </Stack>
  </Paper>;
}
