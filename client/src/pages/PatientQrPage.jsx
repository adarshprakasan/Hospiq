import { useSearchParams } from "react-router-dom";
import { Box, Container, Typography } from "@mui/material";
import PatientIdentityCard from "../components/PatientIdentityCard";
export default function PatientQrPage() {
  const [params] = useSearchParams();
  return <Container maxWidth="md" sx={{ mt: 3 }}><Box className="page-hero"><Typography variant="overline">READY FOR YOUR NEXT VISIT</Typography><Typography variant="h4">My visit QR</Typography><Typography sx={{ mt: 1 }}>Choose the correct appointment and show its visit-specific code.</Typography></Box><PatientIdentityCard preferredVisit={params.get("visit") || ""} /></Container>;
}
