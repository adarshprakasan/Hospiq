import React from "react";
import { Button, Container, Typography } from "@mui/material";

export default function App() {
  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 10 }}>
      <Typography variant="h3" gutterBottom>
        Welcome to Hospiq
      </Typography>
      <Button variant="contained" color="primary">
        Book OPD Token
      </Button>
    </Container>
  );
}
