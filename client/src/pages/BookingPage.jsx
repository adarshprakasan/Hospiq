import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import {
  Box,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function BookingPage() {
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");

  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  //Fetch Hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await axios.get("/hospitals");
        setHospitals(res.data);
      } catch (err) {
        setHospitals([{ _id: "1", name: "City Hospital" }]);
        console.error("Failed to fetch hospitals:", err);
      }
    };

    fetchHospitals();
  }, []);

  // Handle Hospital Change → Load Departments
  const handleHospitalChange = async (e) => {
    const hospitalId = e.target.value;
    setSelectedHospital(hospitalId);
    setSelectedDepartment("");
    setSelectedDoctor("");

    try {
      const res = await axios.get(`/departments?hospitalId=${hospitalId}`);
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  // Handle Department Change → Load Doctors
  const handleDepartmentChange = async (e) => {
    const dept = e.target.value;
    setSelectedDepartment(dept);
    setSelectedDoctor("");

    // console.log("Departments:", departments);
    // console.log("Searching for dept:", dept);

    // Find selected department object
    const selectedDept = departments.find(
      // (d) => String(d.name) == String(dept)
      (d) => d === dept
    );

    if (!selectedDept) {
      console.error("Department not found", {
        dept,
        departments: departments.map((d) => ({
          id: d._id || "undefined",
          name: d.name || "undefined",
        })),
      });
      return;
    }

    const departmentName = selectedDept;

    try {
      const res = await axios.get(
        `/doctors?hospitalId=${selectedHospital}&department=${encodeURIComponent(
          departmentName
        )}`
      );
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      setDoctors([]);
    }
  };

  //Handle Booking
  const handleBook = async () => {
    if (!selectedHospital || !selectedDepartment || !selectedDoctor) {
      return setSnack({
        open: true,
        message: "Please fill all fields",
        severity: "error",
      });
    }

    setLoading(true);
    try {
      const res = await axios.post("/tokens/book", {
        doctorId: selectedDoctor,
        departmentId: selectedDepartment,
        hospitalId: selectedHospital, // Optional if required by backend
      });

      setSnack({
        open: true,
        message: `Token Booked! Your token: ${
          res.data.token.tokenNumber
        }, ETA: ${res.data.token.estimatedTime || "TBD"}`,
        severity: "success",
      });
    } catch (err) {
      setSnack({
        open: true,
        message:
          err.response?.data?.message || "Booking failed. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Book a Consultation
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Hospital</InputLabel>
          <Select
            value={selectedHospital || ""}
            label="Hospital"
            onChange={handleHospitalChange}
          >
            {hospitals.map((h) => (
              <MenuItem key={h._id} value={h._id}>
                {h.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!selectedHospital}>
          <InputLabel>Department</InputLabel>
          <Select
            value={selectedDepartment || ""}
            label="Department"
            onChange={handleDepartmentChange}
          >
            {departments.map((name, index) => (
              <MenuItem key={index} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!selectedDepartment}>
          <InputLabel>Doctor</InputLabel>
          <Select
            value={selectedDoctor || ""}
            label="Doctor"
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {doctors.map((doc) => (
              <MenuItem key={doc._id} value={doc._id}>
                {doc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={handleBook} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Book Token"}
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
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
