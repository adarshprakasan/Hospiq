import { t as translate, useLocale } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export default function PatientIdentityCard({
  compact = false,
  preferredVisit = ""
}) {
  useLocale();
  const [card, setCard] = useState(null);
  const [selected, setSelected] = useState(preferredVisit);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canvas = useRef(null);
  const generation = useRef(0);
  const load = useCallback(async signal => {
    const current = ++generation.current;
    try {
      const {
        data
      } = await axios.get("/qr/me", {
        signal
      });
      if (current !== generation.current || signal?.aborted) return;
      setCard(data);
      setSelected(previous => data.visits.some(v => v.tokenId === previous) ? previous : preferredVisit ? data.visits.some(v => v.tokenId === preferredVisit) ? preferredVisit : "" : data.visits[0]?.tokenId || "");
      setError("");
    } catch (err) {
      if (current === generation.current && !signal?.aborted) {
        setCard(null);
        setError(err.response?.data?.message || "Your visit QR could not be loaded");
      }
    }
  }, [preferredVisit]);
  useEffect(() => {
    const lifetime = generation;
    const controller = new AbortController();
    load(controller.signal);
    const interval = setInterval(() => load(controller.signal), 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
      lifetime.current++;
    };
  }, [load]);
  const visit = card?.visits.find(v => v.tokenId === selected);
  async function copy(value, message) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setError("Copy is unavailable. Select your ID or download the visit QR image instead");
    }
  }
  function download() {
    if (!visit || !canvas.current) return;
    const link = document.createElement("a");
    link.href = canvas.current.toDataURL("image/png");
    link.download = `hospiq-visit-${visit.date}-${visit.tokenId}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  return <Paper sx={{
    p: {
      xs: 2,
      sm: 3
    },
    mb: 3
  }}>
    <Stack direction={{
      xs: "column",
      sm: "row"
    }} gap={3} alignItems={{
      xs: "center",
      sm: "flex-start"
    }}>
      <Box sx={{
        bgcolor: "white",
        p: 1,
        borderRadius: 2,
        flexShrink: 0
      }}>{visit ? <QRCodeCanvas ref={canvas} value={visit.qrValue} size={compact ? 192 : 240} level="M" marginSize={4} title="QR for the selected patient visit" /> : card ? <Box sx={{
          width: compact ? 176 : 224,
          minHeight: 120,
          display: "grid",
          placeItems: "center",
          color: "text.secondary",
          textAlign: "center"
        }}>No active visit selected</Box> : <Skeleton variant="rounded" width={176} height={176} />}</Box>
      <Box sx={{
        minWidth: 0,
        width: "100%"
      }}><Typography variant="overline" color="primary">PATIENT ID & VISIT QR</Typography><Typography variant="h6">{card?.name || "Your visit QR"}</Typography>
        {card && <Typography sx={{
          fontFamily: "monospace",
          fontWeight: 700,
          overflowWrap: "anywhere",
          userSelect: "all",
          my: 1
        }}>{card.publicId}</Typography>}
        <Typography color="text.secondary" sx={{
          my: 1
        }}>Your ID stays the same. Each appointment has a different QR based on your ID, visit date, and appointment ID—even for two visits on the same day.</Typography>
        {card?.visits.length > 0 && <TextField select fullWidth label="Select today's visit" value={visit ? selected : ""} onChange={e => {
          setSelected(e.target.value);
          setNotice("");
        }} sx={{
          mt: 1
        }}>{card.visits.map(v => <MenuItem key={v.tokenId} value={v.tokenId}>{v.doctorName} · {v.date} · Token #{v.tokenNumber}</MenuItem>)}</TextField>}
        {visit && <Box mt={1}><Typography fontWeight={700}>{visit.hospitalName}</Typography><Typography variant="body2">{visit.department} · {visit.date} · {visit.status} · {card.timeZone}</Typography></Box>}
        {card && !card.visits.length && <Alert severity="info" sx={{
          mt: 1
        }}>No active appointments today. Book a visit to receive its QR. Completed, cancelled and previous-day codes cannot be used.</Alert>}
        {card?.visits.length > 0 && !visit && <Alert severity="warning" sx={{
          mt: 1
        }}>This visit is no longer active today. Select another appointment or book a new visit.</Alert>}
        <Stack direction="row" flexWrap="wrap" gap={1} mt={2}><Button variant="outlined" disabled={!visit} onClick={download}>Download visit QR</Button><Button disabled={!card} onClick={() => copy(card.publicId, "Patient ID copied")}>Copy ID</Button><Button disabled={!visit} onClick={() => copy(visit.qrValue, "This visit's QR data copied")}>Copy visit QR data</Button><Button onClick={() => load()}>Refresh visits</Button>{card && !card.visits.length && <Button component={Link} to="/">{translate("Book a visit")}</Button>}</Stack>
        <Typography variant="body2" color="text.secondary" mt={1}>Show the code for the doctor you are meeting. A visit QR never replaces OTP permission for other doctors' records.</Typography>
        {error && <Alert severity="error" sx={{
          mt: 2
        }}>{error}</Alert>}{notice && <Alert severity="success" sx={{
          mt: 2
        }} onClose={() => setNotice("")}>{notice}</Alert>}
      </Box>
    </Stack>
  </Paper>;
}
