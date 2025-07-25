import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  Link,
} from "@mui/material";
import axios from "../api/axios";
import { format } from "date-fns";
import { useMemo } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const profileRes = await axios.get("/auth/me");
        setUser(profileRes.data);

        const tokensRes = await axios.get("/tokens/my");

        // Get today's date in YYYY-MM-DD format (local time)
        const today = new Date().toISOString().split("T")[0];

        const todayTokens = tokensRes.data.filter((t) => {
          const createdAtDate = new Date(t.createdAt);
          const localDate = createdAtDate.toISOString().split("T")[0];
          return localDate === today;
        });

        setTokens(todayTokens);
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const grouped = useMemo(() => {
    return {
      waiting: tokens.filter((t) => t.status === "pending"),
      completed: tokens.filter((t) => t.status === "completed"),
    };
  }, [tokens]);

  const renderTokenCard = (token, index, statusGroup) => (
    <Paper key={token._id || index} sx={{ p: 2, my: 1 }}>
      <Typography variant="subtitle1">
        Token #{token.tokenNumber} — <strong>Patient:</strong>{" "}
        <Link href={`/profile/doctor/${token.patientId}`} underline="hover">
          {token.patientName}
        </Link>
      </Typography>

      <Typography variant="body2">
        Department: {token.departmentName || "N/A"}
      </Typography>
      <Typography variant="body2">
        Doctor: {token.doctorName || "N/A"}
      </Typography>
      <Typography variant="body2">
        ETA: {token.estimatedTime || "N/A"}
      </Typography>
      {token.consultationTime && (
        <Typography variant="body2">
          Check-in Time: {format(new Date(token.consultationTime), "hh:mm a")}
        </Typography>
      )}

      <Chip
        label={token.status}
        color={token.status === "waiting" ? "warning" : "success"}
        sx={{ mt: 1 }}
      />

      {user.role === "staff" && token.status !== "completed" && (
        <Button
          variant="contained"
          size="small"
          sx={{ mt: 2 }}
          onClick={async () => {
            await axios.patch(`/tokens/${token._id}/complete`);
            const updated = [...tokens];
            updated[index].status = "completed";
            setTokens(updated);
          }}
        >
          Mark as Completed
        </Button>
      )}
    </Paper>
  );

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
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Typography variant="h4" gutterBottom>
        {user.role === "doctor" ? "Doctor" : "Staff"} Dashboard
      </Typography>

      {tokens.length === 0 ? (
        <Alert severity="info">No tokens available for today.</Alert>
      ) : (
        <>
          {/* Waiting Section */}
          <Typography variant="h6" sx={{ mt: 3 }}>
            Waiting Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {grouped.waiting.map((t, i) => renderTokenCard(t, i, "waiting"))}

          {/* Completed Section */}
          <Typography variant="h6" sx={{ mt: 4 }}>
            Completed Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {grouped.completed.map((t, i) => renderTokenCard(t, i, "completed"))}
        </>
      )}
    </Container>
  );
}
