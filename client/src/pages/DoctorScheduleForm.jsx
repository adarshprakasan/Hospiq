import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Checkbox,
  ListItemText,
  OutlinedInput,
  TextField,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "../api/axios";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function DoctorScheduleForm() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // 👇 fetch doctors from the staff's hospital
  useEffect(() => {
    const fetchDoctors = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const hospitalId = user?.hospitalId;

      if (!hospitalId) {
        console.error("No hospitalId found in localStorage user object");
        return;
      }

      try {
        const res = await axios.get(`/doctors/hospital/${hospitalId}`);
        setDoctors(res.data);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        setDoctors([]);
      }
    };

    fetchDoctors();
  }, []);

  const handleSubmit = async () => {
    if (
      !selectedDoctor ||
      selectedDays.length === 0 ||
      !startTime ||
      !endTime
    ) {
      return setSnack({
        open: true,
        message: "Please fill all fields",
        severity: "error",
      });
    }

    try {
      await axios.post("/schedule/set", {
        doctorId: selectedDoctor,
        days: selectedDays,
        startTime,
        endTime,
      });

      setSnack({ open: true, message: "Schedule saved!", severity: "success" });
      // Optionally reset form
      setSelectedDoctor("");
      setSelectedDays([]);
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Error saving schedule.",
        severity: "error",
      });
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Set Doctor Schedule
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Doctor</InputLabel>
        <Select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          label="Doctor"
        >
          {doctors.map((doc) => (
            <MenuItem key={doc._id} value={doc._id}>
              {doc.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Days</InputLabel>
        <Select
          multiple
          value={selectedDays}
          onChange={(e) => setSelectedDays(e.target.value)}
          input={<OutlinedInput label="Days" />}
          renderValue={(selected) => selected.join(", ")}
        >
          {daysOfWeek.map((day) => (
            <MenuItem key={day} value={day}>
              <Checkbox checked={selectedDays.includes(day)} />
              <ListItemText primary={day} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Button variant="contained" onClick={handleSubmit}>
        Save Schedule
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
