import { Link } from "react-router-dom";
import { Button, Typography } from "@mui/material";
export default function PrintableQRCode({ token }) {
  const active = ["pending", "called", "skipped"].includes(token.status) && token.isToday !== false;
  return active ? <Button component={Link} to={`/my-qr?visit=${token._id}`} variant="outlined" size="small">Show this visit's QR</Button> : <Typography variant="caption" sx={{
    color: "text.secondary"
  }}>This visit has ended. Its QR is no longer active.</Typography>;
}
