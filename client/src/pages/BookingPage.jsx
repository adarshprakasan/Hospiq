import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  MenuItem,
  Select,
  Button,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import axios from "../api/axios";

export default function BookingPage() {
  const { hospitalId } = useParams();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Fetch departments on load
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`/departments?hospitalId=${hospitalId}`);
        setDepartments(res.data);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
      }
    };
    fetchDepartments();
  }, [hospitalId]);

  // Handle Department Change → Load Doctors
  const handleDepartmentChange = async (e) => {
    const dept = e.target.value;
    setSelectedDepartment(dept);
    setSelectedDoctor("");

    try {
      const res = await axios.get(
        `/doctors?hospitalId=${hospitalId}&department=${encodeURIComponent(
          dept
        )}`
      );
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      setDoctors([]);
    }
  };

  const handleBook = async () => {
    if (!hospitalId || !selectedDepartment || !selectedDoctor) {
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
        hospitalId: hospitalId,
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
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Book Appointment
      </Typography>

      <Select
        fullWidth
        value={selectedDepartment}
        onChange={handleDepartmentChange}
        displayEmpty
        sx={{ mt: 2 }}
      >
        <MenuItem value="" disabled>
          Select Department
        </MenuItem>
        {departments.map((d, index) => (
          <MenuItem key={index} value={d}>
            {d}
          </MenuItem>
        ))}
      </Select>

      <Select
        fullWidth
        value={selectedDoctor}
        onChange={(e) => setSelectedDoctor(e.target.value)}
        displayEmpty
        sx={{ mt: 2 }}
        disabled={!doctors.length}
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

      <Button
        variant="contained"
        onClick={handleBook}
        sx={{ mt: 3 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Confirm Booking"}
      </Button>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        message={snack.message}
      />
    </Container>
  );
}
