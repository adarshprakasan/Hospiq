import { t as translate, useLocale } from "../i18n";
import React, { useEffect, useState } from "react";
import { Container, Typography, Select, MenuItem, FormControl, InputLabel, Button, TextField, Box, Snackbar, Alert, FormControlLabel, Checkbox, Grid } from "@mui/material";
import axios from "../api/axios";
import { useSearchParams } from "react-router-dom";
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export default function DoctorScheduleForm() {
  useLocale();
  const [params] = useSearchParams();
  const [dailyCapacity, setDailyCapacity] = useState(0);
  const [closedDates, setClosedDates] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [schedule, setSchedule] = useState(daysOfWeek.map(day => ({
    day,
    isAvailable: false,
    startTime: "",
    endTime: ""
  })));
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const profile = await axios.get("/auth/me");
        const selected = params.get("doctorId") ? (await axios.get(`/doctors/${params.get("doctorId")}`)).data : null;
        const hospitalId = profile.data.role === "admin" ? params.get("hospitalId") || selected?.hospitalId : profile.data.hospitalId;
        if (!hospitalId) {
          setSnack({
            open: true,
            severity: "info",
            message: "Create a hospital or link your account first"
          });
          return;
        }
        const res = await axios.get(`/doctors/hospital/${hospitalId}`);
        setDoctors(res.data);
        if (selected) setSelectedDoctor(selected._id);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        setDoctors([]);
      }
    };
    fetchDoctors();
  }, [params]);
  useEffect(() => {
    let live = true;
    setClosedDates("");
    setDailyCapacity(0);
    setSchedule(daysOfWeek.map(day => ({
      day,
      isAvailable: false,
      startTime: "",
      endTime: ""
    })));
    if (selectedDoctor) axios.get(`/schedule/${selectedDoctor}`).then(({
      data
    }) => {
      if (live) setDailyCapacity(data.dailyCapacity || 0);
      if (live) setClosedDates((data.closedDates || []).join(", "));
      if (live) setSchedule(daysOfWeek.map(day => data.weeklySchedule.find(entry => entry.day === day) || {
        day,
        isAvailable: false,
        startTime: "",
        endTime: ""
      }));
    }).catch(err => {
      if (live && err.response?.status !== 404) setSnack({
        open: true,
        severity: "error",
        message: "Unable to load this schedule"
      });
    });
    return () => {
      live = false;
    };
  }, [selectedDoctor]);
  const handleScheduleChange = (index, field, value) => {
    const updated = schedule.map(entry => ({
      ...entry
    }));
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
        severity: "error"
      });
    }
    try {
      await axios.post("/schedule/set", {
        doctorId: selectedDoctor,
        weeklySchedule: schedule,
        dailyCapacity: Number(dailyCapacity),
        closedDates: closedDates.split(",").map(d => d.trim()).filter(Boolean)
      });
      setSnack({
        open: true,
        message: "Schedule saved successfully!",
        severity: "success"
      });

      // Reset form
      setSelectedDoctor("");
      setSchedule(daysOfWeek.map(day => ({
        day,
        isAvailable: false,
        startTime: "",
        endTime: ""
      })));
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Error saving schedule",
        severity: "error"
      });
    }
  };
  return (
    <Container sx={{
      mt: 4
    }}>
        <Typography variant="h5" gutterBottom>
          Set Doctor Weekly Schedule
        </Typography>

        <FormControl fullWidth sx={{
        mb: 2
      }}>
          <InputLabel>{translate("Doctor")}</InputLabel>
          <Select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} label={translate("Doctor")}>
            {doctors.map(doc => <MenuItem key={doc._id} value={doc._id}>
                {`${doc.name} - ${doc.department || "No Dept"}`}
              </MenuItem>)}
          </Select>
        </FormControl>

        <Grid container spacing={2} sx={{
        mb: 3
      }}>
          {schedule.map((entry, index) => <Grid key={entry.day} size={{
          xs: 12,
          md: 6
        }}>
              <Box
                sx={{
                  border: 1,
                  borderRadius: 2,
                  p: 2
                }}>
                <Typography variant="subtitle1" gutterBottom>
                  {entry.day}
                </Typography>

                <FormControlLabel control={<Checkbox checked={entry.isAvailable} onChange={e => handleScheduleChange(index, "isAvailable", e.target.checked)} />} label="Available" />

                {entry.isAvailable && <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    mt: 1
                  }}>
                    <TextField label="Start Time" type="time" fullWidth slotProps={{ inputLabel: {
                shrink: true
              } }} value={entry.startTime} onChange={e => handleScheduleChange(index, "startTime", e.target.value)} />
                    <TextField label="End Time" type="time" fullWidth slotProps={{ inputLabel: {
                shrink: true
              } }} value={entry.endTime} onChange={e => handleScheduleChange(index, "endTime", e.target.value)} />
                  </Box>}
              </Box>
            </Grid>)}
        </Grid>

        <Button variant="contained" onClick={handleSubmit}>
          Save Schedule
        </Button>

        <TextField fullWidth type="number" label="Daily booking capacity" helperText="0 means unlimited. Cancelled visits release capacity; completed visits still count for that day." value={dailyCapacity} onChange={e => setDailyCapacity(e.target.value)} sx={{
        my: 2
      }} slotProps={{
        htmlInput: {
          min: 0,
          max: 500,
          step: 1
        }
      }} />
        <TextField fullWidth label="Leave / holiday dates" helperText="Comma-separated dates, for example 2026-12-02, 2026-12-03. Existing appointments are not automatically cancelled." value={closedDates} onChange={e => setClosedDates(e.target.value)} sx={{
        my: 2
      }} />
        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({
        ...snack,
        open: false
      })}>
          <Alert severity={snack.severity}>{snack.message}</Alert>
        </Snackbar>
      </Container>
  );
}
