import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Stack,
  CardActionArea,
  CardMedia,
} from "@mui/material";

export default function BookingPage() {
  const [hospitals, setHospitals] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hospitalsRes, tokensRes] = await Promise.all([
          axios.get("/hospitals"),
          axios.get("/tokens/mine"),
        ]);
        setHospitals(hospitalsRes.data);
        setTokens(tokensRes.data);
      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBookRedirect = (hospitalId) => {
    window.location.href = `/book/${hospitalId}`;
  };

  const handleViewAllTokens = () => {
    window.location.href = "/my-tokens";
  };

  const activeTokens = tokens.filter(
    (token) => token.status && token.status.toLowerCase() !== "completed"
  );

  if (loading) {
    return (
      <Box mt={10} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container
      justifyContent="center"
      maxWidth={false}
      sx={{ width: "90%", mt: 4 }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4">Active Tokens</Typography>
        <Button variant="outlined" onClick={handleViewAllTokens}>
          View All Tokens
        </Button>
      </Stack>

      {activeTokens.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          You have no active bookings.
        </Alert>
      ) : (
        <Grid container spacing={2} mb={4}>
          {activeTokens.map((token) => (
            <Grid item xs={12} sm={6} key={token._id}>
              <Card sx={{ backgroundColor: "#f9f9f9" }}>
                <CardContent>
                  <Typography variant="h6">
                    Token #{token.tokenNumber}
                  </Typography>
                  <Typography>Doctor: {token.doctorName}</Typography>
                  <Typography>Department: {token.departmentName}</Typography>
                  <Typography>Status: {token.status}</Typography>
                  {token.estimatedTime && (
                    <Typography>
                      ETA:{" "}
                      {new Date(token.estimatedTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="h4" gutterBottom>
        Hospitals near you
      </Typography>

      <Grid container spacing={3} sx={{ maxWidth: "xl", margin: "0 auto" }}>
        {hospitals.map((hospital) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={4}
            // sx={{ border: "2px solid red" }}
            key={hospital._id}
          >
            <Card
              sx={{
                height: "100%",
                width: "100%",
                transition: "transform 0.3s, box-shadow 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea onClick={() => handleBookRedirect(hospital._id)}>
                {/* Image */}
                <CardMedia
                  component="img"
                  height="180"
                  image={
                    hospital.imageUrl ||
                    "https://via.placeholder.com/300x180?text=Hospital+Image"
                  }
                  alt={hospital.name}
                />

                <CardContent>
                  {/* Hospital Name */}
                  <Typography variant="h6" gutterBottom>
                    {hospital.name}
                  </Typography>

                  {/* Departments */}
                  <Typography variant="subtitle2" color="text.secondary">
                    Departments:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    General Medicine, Cardiology, Paediatrics
                  </Typography>

                  {/* Reviews */}
                  <Typography variant="subtitle2" color="text.secondary">
                    Reviews:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    ★★★★☆ (120 reviews)
                  </Typography>

                  {/* Button (redundant but optional) */}
                  <Button
                    variant="contained"
                    fullWidth
                    // endIcon={<span>&rarr;</span>}
                    sx={{ pointerEvents: "none" }}
                  >
                    Book Appointment
                  </Button>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
