import { t as translate, useLocale } from "../i18n";
import React, { useCallback, useEffect, useState } from "react";
import { Container, Typography, Box, Paper, CircularProgress, Alert, Button, Grid, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, Stack, Snackbar, Card, CardContent, CardActions, Divider } from "@mui/material";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
export default function ManageDoctorsPage() {
  useLocale();
  const [linkDoctor, setLinkDoctor] = useState(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // Dialog states
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [doctorData, setDoctorData] = useState({
    accountEmail: "",
    name: "",
    department: "",
    specialization: "",
    qualifications: "",
    status: "available"
  });
  const [addingDoctor, setAddingDoctor] = useState(false);
  const navigate = useNavigate();
  const fetchDoctors = async () => {
    try {
      const profileRes = await axios.get("/auth/me");
      setUser(profileRes.data);
      if (!profileRes.data.hospitalId) {
        setError("You need to create or join a hospital/clinic first.");
        setLoading(false);
        return;
      }
      const doctorsRes = await axios.get(`/doctors/hospital/${profileRes.data.hospitalId}`);
      setDoctors(doctorsRes.data);
    } catch {
      setError("Failed to load doctors data.");
    } finally {
      setLoading(false);
    }
  };
  const fetchDepartments = useCallback(async () => {
    try {
      if (!user?.hospitalId) return;
      const res = await axios.get(`/departments?hospitalId=${user.hospitalId}`);
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  }, [user?.hospitalId]);
  useEffect(() => {
    fetchDoctors();
  }, []);
  useEffect(() => {
    if (user?.hospitalId) {
      fetchDepartments();
    }
  }, [user?.hospitalId, fetchDepartments]);
  const handleOpenDoctorDialog = () => {
    setDoctorDialogOpen(true);
  };
  const handleAddDoctor = async () => {
    if (!doctorData.name || !doctorData.department) return;
    try {
      setAddingDoctor(true);
      await axios.post("/doctors/create", {
        ...doctorData,
        hospitalId: user.hospitalId
      });
      setDoctorDialogOpen(false);
      setDoctorData({
        accountEmail: "",
        name: "",
        department: "",
        specialization: "",
        qualifications: "",
        status: "available"
      });
      setSnack({
        open: true,
        message: "Doctor added successfully!",
        severity: "success"
      });
      fetchDoctors(); // Refresh the doctors list
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to add doctor.",
        severity: "error"
      });
    } finally {
      setAddingDoctor(false);
    }
  };
  const handleAvailabilityToggle = async (doctorId, currentStatus) => {
    try {
      const newStatus = currentStatus === "available" ? "unavailable" : "available";
      await axios.put(`/doctors/${doctorId}/availability`, {
        available: newStatus
      });

      // Update local state
      setDoctors(doctors.map(doctor => doctor._id === doctorId ? {
        ...doctor,
        availabilityStatus: newStatus
      } : doctor));
      setSnack({
        open: true,
        message: `Doctor status updated to ${newStatus}!`,
        severity: "success"
      });
    } catch {
      setSnack({
        open: true,
        message: "Failed to update doctor availability.",
        severity: "error"
      });
    }
  };
  const handleLinkAccount = async event => {
    event.preventDefault();
    setLinking(true);
    try {
      await axios.patch(`/doctors/${linkDoctor._id}/account`, {
        email: linkEmail
      });
      setLinkDoctor(null);
      setLinkEmail("");
      fetchDoctors();
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Unable to link account",
        severity: "error"
      });
    } finally {
      setLinking(false);
    }
  };
  const handleDoctorClick = doctorId => {
    navigate(`/doctor/${doctorId}`);
  };
  if (loading) {
    return (
      <Box
        sx={{
          textAlign: "center",
          mt: 10
        }}>
          <CircularProgress />
        </Box>
    );
  }
  if (error) {
    return (
      <Box
        sx={{
          textAlign: "center",
          mt: 10
        }}>
          <Alert severity="error">{error}</Alert>
          {!user?.hospitalId && <Button variant="contained" sx={{
          mt: 2
        }} onClick={() => navigate("/create-hospital")}>
              Create Hospital/Clinic
            </Button>}
        </Box>
    );
  }
  return (
    <Container maxWidth="lg" sx={{
      mt: 6,
      mb: 4
    }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4
          }}>
          <Typography variant="h4">Manage Doctors</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" onClick={handleOpenDoctorDialog}>
              Add Doctor
            </Button>
            <Button variant="outlined" color="primary" onClick={() => navigate("/schedule")}>
              Manage Schedules
            </Button>
          </Stack>
        </Box>

        {doctors.length === 0 ? <Alert severity="info" sx={{
        mb: 2
      }}>
            No doctors added yet. Add your first doctor using the button above.
          </Alert> : <Grid container spacing={3} sx={{
          alignItems: "stretch"
        }}>
            {doctors.map(doctor => <Grid key={doctor._id} size={{
          xs: 12,
          sm: 6,
          md: 4,
          lg: 3
        }}>
                <Card sx={{
            minHeight: 210,
            // Reduced fixed height for all cards
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "scale(1.02)",
              boxShadow: 3
            },
            opacity: doctor.availabilityStatus === "unavailable" ? 0.7 : 1
          }} onClick={() => handleDoctorClick(doctor._id)}>
                  <CardContent sx={{
              flexGrow: 1,
              pb: 1
            }}>
                    <Typography variant="h6" component="div" gutterBottom sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                      {doctor.name}
                    </Typography>
                    <Typography
                      gutterBottom
                      sx={{
                        color: "text.secondary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                      Department: {doctor.department}
                    </Typography>
                    {!doctor.userId && user?.role === "staff" && <Button size="small" onClick={e => {
                e.stopPropagation();
                setLinkDoctor(doctor);
              }}>Link doctor account</Button>}
                    <Divider sx={{
                my: 1.5
              }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: "auto"
                      }}>
                      <Typography variant="body2" sx={{
                  minWidth: "90px"
                }}>
                        Status: {doctor.availabilityStatus}
                      </Typography>
                      <FormControlLabel control={<Switch checked={doctor.availabilityStatus === "available"} onChange={e => {
                  e.stopPropagation(); // Prevent card click
                  handleAvailabilityToggle(doctor._id, doctor.availabilityStatus);
                }} color="primary" size="small" />} sx={{
                  m: 0,
                  minWidth: "100px"
                }} onClick={e => e.stopPropagation()} // Prevent card click
                labelPlacement="start" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>)}
          </Grid>}

        <Dialog open={Boolean(linkDoctor)} onClose={() => setLinkDoctor(null)} fullWidth maxWidth="xs"><Box component="form" onSubmit={handleLinkAccount}><DialogTitle>Link doctor account</DialogTitle><DialogContent><TextField type="email" label="Registered doctor email" required fullWidth margin="dense" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} helperText="The doctor must register and verify their email first." /></DialogContent><DialogActions><Button onClick={() => setLinkDoctor(null)}>{translate("Cancel")}</Button><Button type="submit" variant="contained" disabled={linking}>Link account</Button></DialogActions></Box></Dialog>
        {/* Add Doctor Dialog */}
        <Dialog open={doctorDialogOpen} onClose={() => setDoctorDialogOpen(false)} sx={{
        zIndex: 9999,
        "& .MuiDialog-paper": {
          zIndex: 10000
        }
      }}>
          <DialogTitle>Add Doctor</DialogTitle>
          <DialogContent sx={{
          pt: 1
        }}>
            <TextField label="Doctor account email (optional)" type="email" fullWidth margin="dense" helperText="Link a registered doctor account to enable its queue and schedule access." value={doctorData.accountEmail} onChange={e => setDoctorData({
            ...doctorData,
            accountEmail: e.target.value
          })} />
            <TextField label="Doctor Name" fullWidth margin="dense" value={doctorData.name} onChange={e => setDoctorData({
            ...doctorData,
            name: e.target.value
          })} />
            <FormControl fullWidth margin="dense">
              <InputLabel>{translate("Department")}</InputLabel>
              <Select value={doctorData.department} onChange={e => setDoctorData({
              ...doctorData,
              department: e.target.value
            })} label={translate("Department")} MenuProps={{
              sx: {
                zIndex: 10001
              }
            }}>
                {departments.map((dept, idx) => <MenuItem key={idx} value={dept}>
                    {dept}
                  </MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Specialization" fullWidth margin="dense" value={doctorData.specialization} onChange={e => setDoctorData({
            ...doctorData,
            specialization: e.target.value
          })} />
            <TextField label="Qualifications" fullWidth margin="dense" value={doctorData.qualifications} onChange={e => setDoctorData({
            ...doctorData,
            qualifications: e.target.value
          })} helperText="Separate multiple qualifications with commas" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDoctorDialogOpen(false)}>{translate("Cancel")}</Button>
            <Button variant="contained" onClick={handleAddDoctor} disabled={addingDoctor}>
              {addingDoctor ? "Adding..." : "Add Doctor"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({
        ...snack,
        open: false
      })}>
          <Alert onClose={() => setSnack({
          ...snack,
          open: false
        })} severity={snack.severity} sx={{
          width: "100%"
        }}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Container>
  );
}
