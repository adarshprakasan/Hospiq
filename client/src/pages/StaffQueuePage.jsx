import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Stack,
  Paper,
  TextField,
} from "@mui/material";
import axios from "../api/axios";

const StaffQueuePage = () => {
  const [tokens, setTokens] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingTokenId, setLoadingTokenId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tokens for today
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const res = await axios.get("/tokens/my");
        const today = new Date().toISOString().split("T")[0];
        const todayTokens = res.data.filter((t) => {
          const createdAt = new Date(t.createdAt);
          const localDate = createdAt.toISOString().split("T")[0];
          return localDate === today;
        });
        setTokens(todayTokens);
      } catch (err) {
        console.error("Error fetching tokens", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const handleStatusUpdate = async (tokenId, newStatus) => {
    setLoadingTokenId(tokenId);
    try {
      await axios.put(`/tokens/${tokenId}/status`, { status: newStatus });
      setTokens((prev) =>
        prev.map((t) => (t._id === tokenId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error("Status update failed", err);
    } finally {
      setLoadingTokenId(null);
    }
  };

  const filteredTokens = tokens.filter((t) => {
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const matchesSearch =
      t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tokenNumber.toString().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Manage Token Queue
      </Typography>

      <TextField
        label="Search by name or token"
        variant="outlined"
        size="small"
        fullWidth
        sx={{ maxWidth: 300, mb: 2 }}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <FormControl sx={{ minWidth: 180, mb: 2 }}>
        <InputLabel>Status Filter</InputLabel>
        <Select
          value={filterStatus}
          label="Status Filter"
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="called">Called</MenuItem>
          <MenuItem value="skipped">Skipped</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </Select>
      </FormControl>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Stack spacing={2}>
          {filteredTokens.map((token) => (
            <Paper key={token._id} sx={{ p: 2 }}>
              <Typography>
                Token #{token.tokenNumber} -{" "}
                <strong>{token.patientName}</strong>
              </Typography>
              <Typography variant="body2">
                Doctor:{" "}
                <strong>
                  {token.doctor?.name || token.doctorName || "N/A"}
                </strong>
              </Typography>
              <Typography variant="body2" mb={1}>
                Department:{" "}
                <strong>
                  {token.department?.name || token.departmentName || "N/A"}
                </strong>
              </Typography>
              <Typography variant="body2">
                Status:{" "}
                <Chip
                  label={token.status}
                  color={
                    token.status === "completed"
                      ? "success"
                      : token.status === "called"
                      ? "warning"
                      : token.status === "pending"
                      ? "primary"
                      : "default"
                  }
                  size="small"
                />
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={loadingTokenId === token._id}
                  onClick={() => handleStatusUpdate(token._id, "called")}
                >
                  Call
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  disabled={loadingTokenId === token._id}
                  onClick={() => handleStatusUpdate(token._id, "skipped")}
                >
                  Skip
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={loadingTokenId === token._id}
                  onClick={() => handleStatusUpdate(token._id, "completed")}
                >
                  Complete
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default StaffQueuePage;
