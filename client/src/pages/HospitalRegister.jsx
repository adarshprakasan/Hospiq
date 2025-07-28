import React, { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Container,
  Alert,
} from "@mui/material";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function HospitalRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const sendOtp = async () => {
    try {
      await axios.post("/auth/send-otp", { email: form.email });
      setInfo("OTP sent to your email");
      setStep(2);
    } catch (err) {
      setError("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      await axios.post("/auth/verify-otp", { email: form.email, otp });
      await axios.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError("OTP verification or registration failed");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" align="center" gutterBottom>
          {step === 1
            ? "Register"
            : step === 2
            ? "Enter OTP"
            : "Creating Account..."}
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="info">{info}</Alert>}

        {step === 1 && (
          <Box
            component="form"
            sx={{ mt: 2 }}
            onSubmit={(e) => e.preventDefault()}
          >
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <TextField
              label="Password"
              fullWidth
              margin="normal"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <TextField
              select
              label="Role"
              fullWidth
              margin="normal"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <MenuItem value="doctor">Doctor</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
            <Button
              variant="contained"
              fullWidth
              onClick={sendOtp}
              sx={{ mt: 2 }}
            >
              Send OTP
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <TextField
              label="Enter OTP"
              fullWidth
              margin="normal"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={verifyOtp}
              sx={{ mt: 2 }}
            >
              Verify & Create Account
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}
