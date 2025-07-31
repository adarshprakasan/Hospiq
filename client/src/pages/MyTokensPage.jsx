import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
} from "@mui/material";
import axios from "../api/axios";
import { isSameDay } from "date-fns";
import PrintableQRCode from "../components/PrintableQRCode";

const MyTokensPage = () => {
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const res = await axios.get("/tokens/mine");
        console.log("res is ", res);
        setTokens(res.data);
        setFilteredTokens(res.data);
      } catch (err) {
        setError("Failed to load tokens.");
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  useEffect(() => {
    let filtered = [...tokens];

    if (filterStatus) {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    if (filterDate) {
      filtered = filtered.filter((t) =>
        isSameDay(new Date(t.createdAt), new Date(filterDate))
      );
    }

    setFilteredTokens(filtered);
    setCurrentPage(1);
  }, [filterStatus, filterDate, tokens]);

  const handleCancel = async (id) => {
    try {
      await axios.delete(`/tokens/${id}`);
      setTokens((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert("Failed to cancel token.");
    }
  };

  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);
  const paginatedTokens = filteredTokens.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading)
    return (
      <Box mt={10} textAlign="center">
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box mt={10} textAlign="center">
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Typography variant="h4" gutterBottom>
        My Booked Tokens
      </Typography>

      {/* Filters */}
      <Box display="flex" gap={2} my={3} flexWrap="wrap">
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="booked">Booked</MenuItem>
            <MenuItem value="called">Called</MenuItem>
            <MenuItem value="consulting">Consulting</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="no-show">No Show</MenuItem>
          </Select>
        </FormControl>

        <TextField
          type="date"
          label="Filter by Date"
          InputLabelProps={{ shrink: true }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </Box>

      {/* Token list */}
      {paginatedTokens.length === 0 ? (
        <Alert severity="info">No tokens match your filters.</Alert>
      ) : (
        paginatedTokens.map((token) => {
          const isToday = isSameDay(new Date(token.createdAt), new Date());
          return (
            <Paper
              key={token._id}
              sx={{
                p: 2,
                my: 2,
                backgroundColor: isToday ? "#f0f8ff" : "white",
              }}
            >
              <Typography variant="h6">
                Token #{token.tokenNumber} - Doctor: {token.doctorName || "N/A"}
              </Typography>
              <Typography>
                Department: {token.departmentName || "N/A"}
              </Typography>
              <Typography>Status: {token.status}</Typography>
              <Typography>
                ETA:{" "}
                {token.estimatedTime
                  ? new Date(token.estimatedTime).toLocaleTimeString()
                  : "Not calculated"}
              </Typography>
              {token.consultationTime && (
                <Typography>
                  Checked-in at:{" "}
                  {new Date(token.consultationTime).toLocaleTimeString()}
                </Typography>
              )}

              {/* QR Code with more details */}
              <PrintableQRCode token={token} />

              {token.status === "booked" && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCancel(token._id)}
                  >
                    Cancel Token
                  </Button>
                </Box>
              )}
            </Paper>
          );
        })
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Box mt={3} display="flex" justifyContent="center" gap={2}>
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Typography mt={1}>Page {currentPage}</Typography>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default MyTokensPage;
