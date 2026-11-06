import { Box, Container, Typography } from "@mui/material";
import PatientIdentityCard from "../components/PatientIdentityCard";
export default function PatientQrPage() {
  return <Container maxWidth="md" sx={{ mt: 3 }}><Box className="page-hero"><Typography variant="overline">READY FOR YOUR NEXT VISIT</Typography><Typography variant="h4">My patient QR card</Typography><Typography sx={{ mt: 1 }}>Keep this card ready when meeting your doctor.</Typography></Box><PatientIdentityCard /></Container>;
}
