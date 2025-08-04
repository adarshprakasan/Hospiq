import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import axios from "../api/axios";

const OfflineBookingDialog = ({ open, onClose, hospitalId }) => {
  console.log("OfflineBookingDialog props:", { open, hospitalId });

  const [patientName, setPatientName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDepartments();
    }
  }, [open]);

  const fetchDepartments = async () => {
    try {
      console.log("Fetching departments for hospitalId:", hospitalId);
      const res = await axios.get(`/departments?hospitalId=${hospitalId}`);
      console.log("Departments fetched:", res.data);
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const handleDepartmentChange = async (e) => {
    const dept = e.target.value;
    console.log("Department selected:", dept);
    setSelectedDepartment(dept);
    setSelectedDoctor("");

    try {
      const res = await axios.get(
        `/doctors?hospitalId=${hospitalId}&department=${encodeURIComponent(
          dept
        )}`
      );
      console.log("Doctors fetched for department:", res.data);
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors", err);
    }
  };

  const handleSubmit = async () => {
    if (!patientName || !selectedDoctor || !selectedDepartment) {
      alert("Please fill in all fields: Patient Name, Department, and Doctor");
      return;
    }

    console.log("Submitting offline token with data:", {
      doctorId: selectedDoctor,
      hospitalId,
      patientName,
      departmentId: selectedDepartment,
    });

    setLoading(true);
    try {
      const res = await axios.post("/tokens/offline", {
        doctorId: selectedDoctor,
        hospitalId,
        patientName,
        departmentId: selectedDepartment,
      });
      console.log("Offline token booked successfully:", res.data);
      onClose(true); // Close modal with success flag
    } catch (err) {
      console.error("Offline booking error:", err);
      const errorMessage = err.response?.data?.message || err.message;
      alert("Failed to book offline token: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetFields = () => {
    setPatientName("");
    setSelectedDepartment("");
    setSelectedDoctor("");
    setDoctors([]);
  };

  const handleClose = () => {
    resetFields();
    onClose(false); // Close with cancel flag
  };

  console.log("Rendering OfflineBookingDialog, open:", open);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      sx={{
        zIndex: 9999,
        "& .MuiDialog-paper": {
          zIndex: 10000,
        },
      }}
    >
      <DialogTitle>Offline Token Booking</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
      >
        <TextField
          label="Patient Name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          fullWidth
        />

        <Select
          value={selectedDepartment}
          onChange={handleDepartmentChange}
          displayEmpty
          fullWidth
          MenuProps={{
            sx: {
              zIndex: 10001,
            },
          }}
        >
          <MenuItem value="" disabled>
            Select Department
          </MenuItem>
          {departments.map((dept, i) => (
            <MenuItem key={i} value={dept}>
              {dept}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          displayEmpty
          fullWidth
          disabled={!doctors.length}
          MenuProps={{
            sx: {
              zIndex: 10001,
            },
          }}
        >
          <MenuItem value="" disabled>
            Select Doctor
          </MenuItem>
          {doctors.map((doc) => (
            <MenuItem key={doc._id} value={doc._id}>
              {doc.name}
            </MenuItem>
          ))}
        </Select>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            loading || !patientName || !selectedDoctor || !selectedDepartment
          }
        >
          {loading ? <CircularProgress size={22} /> : "Book Token"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfflineBookingDialog;
