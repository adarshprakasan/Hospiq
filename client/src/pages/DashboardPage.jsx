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
} from "@mui/material";
import axios from "../api/axios";
import { format } from "date-fns";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              onClick={handleOpenDoctorDialog}
            >
              Add Doctor
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={() => (window.location.href = "/schedule")}
            >
              Schedule
            </Button>
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

      {/* Add Department Dialog */}
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

      {/* Add Doctor Dialog */}
      <Dialog
        open={doctorDialogOpen}
        onClose={() => setDoctorDialogOpen(false)}
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
    </Container>
  );
}
