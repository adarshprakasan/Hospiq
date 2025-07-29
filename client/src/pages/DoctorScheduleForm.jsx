import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  TextField,
  Box,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
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
  const [schedule, setSchedule] = useState(
    daysOfWeek.map((day) => ({
      day,
      isAvailable: false,
      startTime: "",
      endTime: "",
    }))
  );

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const hospitalId = user?.hospitalId;

      if (!hospitalId) {
        console.error("No hospitalId found");
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

  const handleScheduleChange = (index, field, value) => {
    const updated = [...schedule];
    updated[index][field] = value;

    // If setting unavailable, clear times
    if (field === "isAvailable" && !value) {
      updated[index].startTime = "";
      updated[index].endTime = "";
    }

    setSchedule(updated);
  };

  const handleSubmit = async () => {
    if (!selectedDoctor) {
      return setSnack({
        open: true,
        message: "Please select a doctor",
        severity: "error",
      });
    }

    try {
      await axios.post("/schedule/set", {
        doctorId: selectedDoctor,
        weeklySchedule: schedule,
      });

      setSnack({
        open: true,
        message: "Schedule saved successfully!",
        severity: "success",
      });

      // Reset form
      setSelectedDoctor("");
      setSchedule(
        daysOfWeek.map((day) => ({
          day,
          isAvailable: false,
          startTime: "",
          endTime: "",
        }))
      );
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Error saving schedule",
        severity: "error",
      });
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Set Doctor Weekly Schedule
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
              {`${doc.name} - ${doc.department || "No Dept"}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {schedule.map((entry, index) => (
          <Grid item xs={12} md={6} key={entry.day}>
            <Box border={1} borderRadius={2} p={2}>
              <Typography variant="subtitle1" gutterBottom>
                {entry.day}
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={entry.isAvailable}
                    onChange={(e) =>
                      handleScheduleChange(
                        index,
                        "isAvailable",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Available"
              />

              {entry.isAvailable && (
                <Box display="flex" gap={2} mt={1}>
                  <TextField
                    label="Start Time"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={entry.startTime}
                    onChange={(e) =>
                      handleScheduleChange(index, "startTime", e.target.value)
                    }
                  />
                  <TextField
                    label="End Time"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={entry.endTime}
                    onChange={(e) =>
                      handleScheduleChange(index, "endTime", e.target.value)
                    }
                  />
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

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
