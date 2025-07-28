import React, { useEffect, useState } from "react";
import axios from "../api/axios";
import {
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (token && user) {
      navigate(user.role === "patient" ? "/" : "/dashboard");
    }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await axios.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setSnack({
        open: true,
        message: "Login successful!",
        severity: "success",
      });

      // Navigate based on role
      const r = res.data.user.role;
      navigate(r === "patient" ? "/" : "/dashboard");
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Login failed",
      });
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>
        Login
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        label="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handleLogin}
      >
        Login
      </Button>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Container>
  );
}
