import PatientIdentityCard from "../components/PatientIdentityCard";
import { Link } from "react-router-dom";
import { roleLabel } from "../utils";
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
        <Typography sx={{ overflowWrap: "anywhere", fontFamily: "monospace", mb: 1 }}>User ID: {user?.publicId}</Typography>
        <Typography>Email: {user?.email}</Typography>
        <Typography>Role: {roleLabel(user?.role)}</Typography>
        <Button component={Link} to="/change-password" sx={{ mt: 2 }}>Change password</Button>
      </Paper>
      {user?.role === "patient" && <Box mt={3}><PatientIdentityCard /></Box>}
    </Container>
  );
};

export default ProfileDashboard;
