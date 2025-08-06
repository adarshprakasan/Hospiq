import React, { useEffect, useState, useMemo } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
  Snackbar,
  Grid,
  IconButton,
} from "@mui/material";
import axios from "../api/axios";
import OfflineBookingDialog from "./OfflineBookingDialog";
import CloseIcon from "@mui/icons-material/Close";
import RestoreIcon from "@mui/icons-material/Restore";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [addingDept, setAddingDept] = useState(false);

  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctorData, setDoctorData] = useState({
    name: "",
    department: "",
    specialization: "",
    qualifications: "",
    status: "available",
  });
  const [addingDoctor, setAddingDoctor] = useState(false);

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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOfflineBooked = (success) => {
    setOfflineOpen(false);

    if (success) {
      setSnack({
        open: true,
        message: "Offline token booked successfully!",
        severity: "success",
      });

      // Refresh dashboard data
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
        }
      };

      fetchDashboard();
    } else {
      setSnack({
        open: true,
        message: "Failed to book offline token.",
        severity: "error",
      });
    }
  };

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

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`/departments?hospitalId=${user.hospitalId}`);
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const handleOpenDoctorDialog = () => {
    fetchDepartments();
    setDoctorDialogOpen(true);
  };

  const handleAddDoctor = async () => {
    if (!doctorData.name || !doctorData.department) return;

    try {
      setAddingDoctor(true);
      await axios.post("/doctors/create", {
        ...doctorData,
        hospitalId: user.hospitalId,
      });
      setDoctorDialogOpen(false);
      setDoctorData({
        name: "",
        department: "",
        specialization: "",
        qualifications: "",
        status: "available",
      });
    } catch (err) {
      alert("Failed to add doctor.");
    } finally {
      setAddingDoctor(false);
    }
  };

  const grouped = useMemo(
    () => ({
      waiting: tokens.filter((t) => t.status !== "completed"),
      completed: tokens.filter((t) => t.status === "completed"),
    }),
    [tokens]
  );

  const renderTokenCard = (token, index, isCompleted = false) => (
    <Paper
      key={token._id || index}
      sx={{
        p: 2,
        m: 1,
        minWidth: 220,
        maxWidth: 260,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        position: "relative",
        boxShadow: 3,
        borderRadius: 2,
        backgroundColor: isCompleted ? "#f5f5f5" : "#fff",
      }}
    >
      <Typography fontWeight={600} gutterBottom>
        Token #{token.tokenNumber}
      </Typography>
      <Typography variant="body2" gutterBottom>
        <strong>{token.patientName}</strong>
      </Typography>
      <Typography variant="body2">
        Doctor:{" "}
        <strong>{token.doctor?.name || token.doctorName || "N/A"}</strong>
      </Typography>
      <Typography variant="body2">
        Department:{" "}
        <strong>
          {token.department?.name || token.departmentName || "N/A"}
        </strong>
      </Typography>
      <Typography variant="body2" mt={1}>
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
      {!isCompleted && (
        <Stack direction="row" spacing={1} mt={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleStatusUpdate(token._id, "called")}
          >
            Call
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleStatusUpdate(token._id, "skipped")}
          >
            Skip
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleStatusUpdate(token._id, "completed")}
          >
            Complete
          </Button>
        </Stack>
      )}
      {isCompleted && (
        <IconButton
          size="small"
          sx={{ position: "absolute", top: 4, right: 4 }}
          onClick={() => handleStatusUpdate(token._id, "pending")}
          aria-label="Move to in-progress"
        >
          <RestoreIcon fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );

  const handleStatusUpdate = async (tokenId, newStatus) => {
    try {
      await axios.put(`/tokens/${tokenId}/status`, { status: newStatus });
      setTokens((prev) =>
        prev.map((t) => (t._id === tokenId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error("Status update failed", err);
    }
  };

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
      <Typography variant="h4" gutterBottom>
        {user.role === "doctor" ? "Doctor" : "Staff"} Dashboard
      </Typography>
      <Box display="flex" justifyContent="flex-end" gap={2} mb={2}>
        <Button variant="outlined" onClick={() => setOfflineOpen(true)}>
          Book Offline Token
        </Button>
        <OfflineBookingDialog
          open={offlineOpen}
          onClose={handleOfflineBooked}
          hospitalId={user.hospitalId}
        />
        {!user?.hospitalId ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => (window.location.href = "/create-hospital")}
          >
            Add Clinic/Hospital
          </Button>
        ) : user?.hospital?.type === "clinic" ? (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={() => (window.location.href = "/schedule")}
            >
              Schedule
            </Button>
          </>
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
              onClick={() => (window.location.href = "/manage-doctors")}
            >
              Manage Doctors
            </Button>
          </>
        )}
      </Box>

      {tokens.length === 0 ? (
        <Alert severity="info">No tokens available for today.</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mt: 3 }}>
            In Progress Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {grouped.waiting.map((t, i) => (
              <Grid item key={t._id || i} xs={12} sm={6} md={4} lg={3}>
                {renderTokenCard(t, i, false)}
              </Grid>
            ))}
          </Grid>
          <Typography variant="h6" sx={{ mt: 4 }}>
            Completed Tokens
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Grid container spacing={2}>
            {grouped.completed.map((t, i) => (
              <Grid item key={t._id || i} xs={12} sm={6} md={4} lg={3}>
                {renderTokenCard(t, i, true)}
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Add Department Dialog */}
      <Dialog
        open={deptDialogOpen}
        onClose={() => setDeptDialogOpen(false)}
        sx={{
          zIndex: 9999,
          "& .MuiDialog-paper": {
            zIndex: 10000,
          },
        }}
      >
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

      {/* Add Doctor Dialog */}
      <Dialog
        open={doctorDialogOpen}
        onClose={() => setDoctorDialogOpen(false)}
        sx={{
          zIndex: 9999,
          "& .MuiDialog-paper": {
            zIndex: 10000,
          },
        }}
      >
        <DialogTitle>Add Doctor</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Doctor Name"
            fullWidth
            margin="dense"
            value={doctorData.name}
            onChange={(e) =>
              setDoctorData({ ...doctorData, name: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Department</InputLabel>
            <Select
              value={doctorData.department}
              onChange={(e) =>
                setDoctorData({ ...doctorData, department: e.target.value })
              }
              label="Department"
              MenuProps={{
                sx: {
                  zIndex: 10001,
                },
              }}
            >
              {departments.map((dept, idx) => (
                <MenuItem key={idx} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Specialization"
            fullWidth
            margin="dense"
            value={doctorData.specialization}
            onChange={(e) =>
              setDoctorData({ ...doctorData, specialization: e.target.value })
            }
          />
          <TextField
            label="Qualifications"
            fullWidth
            margin="dense"
            value={doctorData.qualifications}
            onChange={(e) =>
              setDoctorData({ ...doctorData, qualifications: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoctorDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddDoctor}
            disabled={addingDoctor}
          >
            {addingDoctor ? "Adding..." : "Add Doctor"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
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
