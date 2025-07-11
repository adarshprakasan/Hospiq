import React, { useEffect, useState } from "react";
import axios from "../api/axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Container,
} from "@mui/material";

const ProfileDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box textAlign="center" mt={10}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Welcome, {user?.name}
        </Typography>
        <Typography>Email: {user?.email}</Typography>
        <Typography>Role: {user?.role}</Typography>

        {/* Add role-based navigation */}
        <Box sx={{ mt: 3 }}>
          {user.role === "patient" ? (
            <Button variant="outlined" href="/my-tokens">
              View My Tokens
            </Button>
          ) : user.role === "doctor" ? (
            <Button variant="outlined" href="/doctor-tokens">
              View My Appointments
            </Button>
          ) : (
            <Button variant="outlined" href="/staff-queue">
              Manage Token Queue
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfileDashboard;
