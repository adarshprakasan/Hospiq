import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import SchoolIcon from "@mui/icons-material/School";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`doctor-tabpanel-${index}`}
      aria-labelledby={`doctor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DoctorProfilePage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const userRes = await axios.get("/auth/me");
      setUser(userRes.data);

      // Get doctor details
      const doctorRes = await axios.get(`/doctors/${doctorId}`);
      setDoctor(doctorRes.data);

      // Get doctor schedule
      try {
        const scheduleRes = await axios.get(`/schedules/doctor/${doctorId}`);
        setSchedule(scheduleRes.data);
      } catch (scheduleErr) {
        console.error("Failed to fetch schedule", scheduleErr);
        // Not setting error here as this is not critical
      }
    } catch (err) {
      setError("Failed to load doctor information.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId]);

  const handleAvailabilityToggle = async () => {
    if (!doctor) return;
    
    try {
      const newStatus = doctor.availabilityStatus === "available" ? "unavailable" : "available";
      await axios.put(`/doctors/${doctorId}/availability`, {
        available: newStatus,
      });
      
      // Update local state
      setDoctor({...doctor, availabilityStatus: newStatus});
      
      setSnack({
        open: true,
        message: `Doctor status updated to ${newStatus}!`,
        severity: "success",
      });
    } catch (err) {
      setSnack({
        open: true,
        message: "Failed to update doctor availability.",
        severity: "error",
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatScheduleDay = (day) => {
    const days = {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
    };
    return days[day] || day;
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${period}`;
    } catch (e) {
      return timeString;
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
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!doctor) {
    return (
      <Box textAlign="center" mt={10}>
        <Alert severity="warning">Doctor not found</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  const isStaffOrDoctor = user && (user.role === "staff" || user.role === "doctor");

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">Doctor Profile</Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Doctor Info Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                {doctor.name}
              </Typography>
              
              <Box display="flex" alignItems="center" mb={2}>
                <LocalHospitalIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  Department: {doctor.department}
                </Typography>
              </Box>
              
              {doctor.specialization && (
                <Box display="flex" alignItems="center" mb={2}>
                  <MedicalInformationIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    Specialization: {doctor.specialization}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">
                  Status: 
                  <Chip 
                    label={doctor.availabilityStatus} 
                    color={doctor.availabilityStatus === "available" ? "success" : "error"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                
                {isStaffOrDoctor && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={doctor.availabilityStatus === 'available'}
                        onChange={handleAvailabilityToggle}
                        color="primary"
                      />
                    }
                    label="Available"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabs Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Qualifications" />
              <Tab label="Schedule" />
            </Tabs>
            
            {/* Qualifications Tab */}
            <TabPanel value={tabValue} index={0}>
              {doctor.qualifications && doctor.qualifications.length > 0 ? (
                <List>
                  {Array.isArray(doctor.qualifications) ? 
                    doctor.qualifications.map((qualification, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <SchoolIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={qualification} />
                      </ListItem>
                    )) : 
                    <ListItem>
                      <ListItemIcon>
                        <SchoolIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={doctor.qualifications} />
                    </ListItem>
                  }
                </List>
              ) : (
                <Typography variant="body1" sx={{ p: 2 }}>
                  No qualifications listed
                </Typography>
              )}
            </TabPanel>
            
            {/* Schedule Tab */}
            <TabPanel value={tabValue} index={1}>
              {schedule && schedule.length > 0 ? (
                <List>
                  {schedule.map((scheduleItem, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <EventAvailableIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatScheduleDay(scheduleItem.day)} 
                        secondary={`${formatTime(scheduleItem.startTime)} - ${formatTime(scheduleItem.endTime)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" sx={{ p: 2 }}>
                  No schedule information available
                </Typography>
              )}
              
              {isStaffOrDoctor && (
                <Box textAlign="center" mt={2}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => navigate("/schedule")}
                  >
                    Manage Schedule
                  </Button>
                </Box>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

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