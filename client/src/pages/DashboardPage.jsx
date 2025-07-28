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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import axios from "../api/axios";
import { format } from "date-fns";
import { useMemo } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [addingDept, setAddingDept] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const profileRes = await axios.get("/auth/me");
        setUser(profileRes.data);

        const tokensRes = await axios.get("/tokens/my");

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

  const handleAddDepartment = async () => {
    if (!newDept.trim()) return;

    try {
      setAddingDept(true);
      await axios.post("/departments/add", {
        name: newDept,
        hospitalId: user.hospitalId,
      });
      setDeptDialogOpen(false);
      setNewDept("");
    } catch (err) {
      alert("Failed to add department.");
    } finally {
      setAddingDept(false);
    }
  };

  const grouped = useMemo(() => {
    return {
      waiting: tokens.filter((t) => t.status === "pending"),
      completed: tokens.filter((t) => t.status === "completed"),
    };
  }, [tokens]);

  const renderTokenCard = (token, index) => (
    <Paper key={token._id || index} sx={{ p: 2, my: 1 }}>
      {/* Token details... */}
    </Paper>
  );

  if (loading) {
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={10}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Box display="flex" justifyContent="flex-end" gap={2} mb={2}>
        {!user?.hospitalId ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => (window.location.href = "/create-hospital")}
          >
            Add Clinic/Hospital
          </Button>
        ) : user?.hospital?.type === "clinic" ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => (window.location.href = "/schedule")}
          >
            Schedule Doctor
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setDeptDialogOpen(true)}
            >
              Add Department
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={() => (window.location.href = "/doctors/add")}
            >
              Add Doctor
            </Button>

            {user?.doctors?.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => (window.location.href = "/schedule")}
              >
                Schedule
              </Button>
            )}
          </>
        )}
      </Box>

      <Typography variant="h4" gutterBottom>
        {user.role === "doctor" ? "Doctor" : "Staff"} Dashboard
      </Typography>

      {tokens.length === 0 ? (
        <Alert severity="info">No tokens available for today.</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mt: 3 }}>
            Waiting Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {grouped.waiting.map((t, i) => renderTokenCard(t, i))}

          <Typography variant="h6" sx={{ mt: 4 }}>
            Completed Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {grouped.completed.map((t, i) => renderTokenCard(t, i))}
        </>
      )}

      <Dialog open={deptDialogOpen} onClose={() => setDeptDialogOpen(false)}>
        <DialogTitle>Add Department</DialogTitle>
        <DialogContent>
          <TextField
            label="Department Name"
            fullWidth
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddDepartment}
            disabled={addingDept}
          >
            {addingDept ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
